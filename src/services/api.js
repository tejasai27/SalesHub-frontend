import axios from "axios";

// Get API base URL from environment or use default
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

console.log("API Base URL:", API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("API Response Error:", {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });

    if (error.code === "ECONNABORTED") {
      error.message = "Request timeout. The server is taking too long to respond.";
    } else if (!error.response) {
      error.message = "Network error. Please check your internet connection.";
    }

    return Promise.reject(error);
  }
);

// Generate unique user ID
const getUserId = () => {
  let userId = localStorage.getItem("extension_user_id");
  if (!userId) {
    userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("extension_user_id", userId);
  }
  return userId;
};

const getSessionId = () => {
  const today = new Date().toISOString().split("T")[0];
  let sessionId = localStorage.getItem("current_session_id");
  const lastSessionDate = localStorage.getItem("last_session_date");

  if (!sessionId || lastSessionDate !== today) {
    sessionId = "session_" + Date.now();
    localStorage.setItem("current_session_id", sessionId);
    localStorage.setItem("last_session_date", today);
  }

  return sessionId;
};

// Chat API calls
export const chatService = {
  sendMessage: async (message) => {
    const payload = {
      message,
      user_id: getUserId(),
      session_id: getSessionId(),
    };

    try {
      const response = await api.post("/chat/send", payload);
      return response.data;
    } catch (error) {
      console.error("Chat error:", error);
      return {
        success: false,
        response: "I'm having trouble connecting to the AI service. Please check your internet connection and try again.",
        message_id: "error_" + Date.now(),
        timestamp: new Date().toISOString(),
        offline: true,
      };
    }
  },

  getChatHistory: async (limit = 50) => {
    try {
      const response = await api.get(`/chat/history/${getUserId()}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Chat history error:", error);
      return {
        success: false,
        history: [],
        error: error.message,
      };
    }
  },

  testConnection: async () => {
    try {
      const response = await api.get("/chat/test");
      return response.data;
    } catch (error) {
      console.error("Connection test error:", error);
      return {
        success: false,
        error: "Cannot connect to backend server",
      };
    }
  },
};

// Health check
export const healthService = {
  checkBackend: async () => {
    try {
      const response = await api.get("/health");
      return response.data;
    } catch (error) {
      console.error("Health check failed:", error);
      return {
        status: "unhealthy",
        error: "Cannot connect to backend",
        gemini_ai: "unknown",
        message: "Backend server is not responding. Please check if the service is running.",
      };
    }
  },
};

// Export utilities
export const utils = {
  getUserId,
  getSessionId,
  truncateText: (text, maxLength = 50) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  },
  formatTime: (timestamp) => {
    if (!timestamp) return "Just now";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid time";

      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;

      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Time format error:", error);
      return "Invalid time";
    }
  },
  formatDate: (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString();
    } catch (error) {
      return "Invalid date";
    }
  },
  getApiBaseUrl: () => API_BASE_URL,
};

export default api;