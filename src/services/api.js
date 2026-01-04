import axios from "axios";

// Get API base URL from environment or use default
// For local extension testing, use localhost
const API_BASE_URL = "http://localhost:5000/api";

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

// ========== Multi-Chat Session Management ==========

const CHATS_KEY = 'saleshub_chats';
const ACTIVE_CHAT_KEY = 'saleshub_active_chat';

// Get all chats from localStorage
const getAllChats = () => {
  try {
    const chats = localStorage.getItem(CHATS_KEY);
    return chats ? JSON.parse(chats) : [];
  } catch (error) {
    console.error('Error loading chats:', error);
    return [];
  }
};

// Save all chats to localStorage
const saveAllChats = (chats) => {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch (error) {
    console.error('Error saving chats:', error);
  }
};

// Get active chat ID
const getActiveChatId = () => {
  return localStorage.getItem(ACTIVE_CHAT_KEY);
};

// Set active chat ID
const setActiveChatId = (chatId) => {
  if (chatId) {
    localStorage.setItem(ACTIVE_CHAT_KEY, chatId);
  } else {
    localStorage.removeItem(ACTIVE_CHAT_KEY);
  }
};

// Create a new chat
const createChat = () => {
  const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  const newChat = {
    id: chatId,
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
  };

  const chats = getAllChats();
  chats.unshift(newChat);
  saveAllChats(chats);
  setActiveChatId(chatId);

  return newChat;
};

// Delete a chat
const deleteChat = (chatId) => {
  const chats = getAllChats();
  const filteredChats = chats.filter(chat => chat.id !== chatId);
  saveAllChats(filteredChats);

  // If deleted chat was active, clear or set new active
  if (getActiveChatId() === chatId) {
    if (filteredChats.length > 0) {
      setActiveChatId(filteredChats[0].id);
    } else {
      setActiveChatId(null);
    }
  }

  return filteredChats;
};

// Get a specific chat by ID
const getChatById = (chatId) => {
  const chats = getAllChats();
  return chats.find(chat => chat.id === chatId) || null;
};

// Update chat title
const updateChatTitle = (chatId, title) => {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(chat => chat.id === chatId);

  if (chatIndex !== -1) {
    chats[chatIndex].title = title;
    chats[chatIndex].updatedAt = new Date().toISOString();
    saveAllChats(chats);
  }

  return chats;
};

// Save message to a chat
const saveMessageToChat = (chatId, message) => {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(chat => chat.id === chatId);

  if (chatIndex !== -1) {
    chats[chatIndex].messages.push(message);
    chats[chatIndex].updatedAt = new Date().toISOString();

    // Update title from first user message if still "New Chat"
    if (chats[chatIndex].title === 'New Chat' && message.type === 'user') {
      const truncatedTitle = message.message.length > 30
        ? message.message.substring(0, 30) + '...'
        : message.message;
      chats[chatIndex].title = truncatedTitle;
    }

    saveAllChats(chats);
  }

  return chats;
};

// Get messages for a specific chat
const getChatMessages = (chatId) => {
  const chat = getChatById(chatId);
  return chat ? chat.messages : [];
};

// Clear messages for a specific chat
const clearChatMessages = (chatId) => {
  const chats = getAllChats();
  const chatIndex = chats.findIndex(chat => chat.id === chatId);

  if (chatIndex !== -1) {
    chats[chatIndex].messages = [];
    chats[chatIndex].title = 'New Chat';
    chats[chatIndex].updatedAt = new Date().toISOString();
    saveAllChats(chats);
  }

  return chats;
};

// Chat API calls
export const chatService = {
  sendMessage: async (message, dealId = null) => {
    const payload = {
      message,
      user_id: getUserId(),
      session_id: getSessionId(),
    };

    // Add HubSpot deal ID if available
    if (dealId) {
      payload.hubspot_deal_id = dealId;
    }

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

// Tracking service for website visit analytics
export const trackingService = {
  getHistory: async (limit = 100, offset = 0, domain = null, days = null) => {
    try {
      const userId = getUserId();
      let url = `/tracking/history/${userId}?limit=${limit}&offset=${offset}`;
      if (domain) {
        url += `&domain=${encodeURIComponent(domain)}`;
      }
      if (days) {
        url += `&days=${days}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("Tracking history error:", error);
      return {
        success: false,
        history: [],
        error: error.message,
      };
    }
  },

  getAnalytics: async (days = 7) => {
    try {
      const userId = getUserId();
      const response = await api.get(`/tracking/analytics/${userId}?days=${days}`);
      return response.data;
    } catch (error) {
      console.error("Tracking analytics error:", error);
      return {
        success: false,
        analytics: null,
        error: error.message,
      };
    }
  },

  logVisit: async (data) => {
    try {
      const userId = getUserId();
      const response = await api.post("/tracking/log", {
        user_id: userId,
        ...data,
      });
      return response.data;
    } catch (error) {
      console.error("Log visit error:", error);
      return { success: false, error: error.message };
    }
  },
};

// Export utilities
export const utils = {
  getUserId,
  getSessionId,
  // Multi-chat management
  getAllChats,
  createChat,
  deleteChat,
  getChatById,
  updateChatTitle,
  saveMessageToChat,
  getChatMessages,
  clearChatMessages,
  getActiveChatId,
  setActiveChatId,
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