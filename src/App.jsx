import React, { useState, useEffect } from "react";
import ChatWindow from "./components/Chat/ChatWindow";
import ChatHistory from "./components/Chat/ChatHistory";
import Button from "./components/Common/Button";
import { healthService, utils } from "./services/api";
import {
  FiMenu,
  FiX,
  FiMessageSquare,
  FiMessageCircle,
  FiArchive,
} from "react-icons/fi";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkBackendHealth = async () => {
    try {
      const health = await healthService.checkBackend();
      setBackendHealth(health);
    } catch (error) {
      setBackendHealth({ status: "unhealthy", error: "Connection failed" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Main Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? (
                  <FiX className="w-5 h-5" />
                ) : (
                  <FiMenu className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <FiMessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    SalesHub AI
                  </h1>
                  <p className="text-xs text-gray-500">
                    AI-Powered Sales Assistant
                  </p>
                </div>
              </div>
            </div>

            {/* Backend Status */}
            <div className="flex items-center gap-3">
              <div
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${backendHealth?.status === "healthy"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                  }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${backendHealth?.status === "healthy"
                      ? "bg-green-500"
                      : "bg-red-500"
                    }`}
                ></div>
                <span className="font-medium">
                  {backendHealth?.status === "healthy"
                    ? "Connected"
                    : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Chat Only */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="h-[calc(100vh-180px)] flex flex-col">
          {/* Chat Header Bar */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                  <FiMessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">AI Assistant</h3>
                  <p className="text-xs text-gray-500">
                    Your sales companion
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant={showHistory ? "primary" : "outline"}
              size="medium"
              onClick={() => setShowHistory(!showHistory)}
              className="shadow-sm hover:shadow transition-shadow"
            >
              <FiArchive className="w-4 h-4 mr-2" />
              {showHistory ? "Hide History" : "Show History"}
            </Button>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Chat Window */}
            <div
              className={`transition-all duration-300 ${showHistory ? "w-4/5" : "w-full"
                }`}
            >
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full overflow-hidden">
                <ChatWindow showHistory={showHistory} />
              </div>
            </div>

            {/* History Sidebar */}
            {showHistory && (
              <div className="w-1/5 flex flex-col">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full overflow-hidden">
                  <ChatHistory />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-2xl">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-gray-800">SalesHub AI</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <div className="text-sm text-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-2 h-2 rounded-full ${backendHealth?.status === "healthy"
                        ? "bg-green-500"
                        : "bg-red-500"
                      }`}
                  ></div>
                  <span>Backend: {backendHealth?.status || "Unknown"}</span>
                </div>
                <div className="text-xs text-gray-500">
                  User: {utils.getUserId().substring(0, 15)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
