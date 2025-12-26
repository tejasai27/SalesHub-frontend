import React, { useState, useEffect } from "react";
import ChatWindow from "./components/Chat/ChatWindow";
import { healthService } from "./services/api";
import { FiMessageCircle } from "react-icons/fi";

function App() {
  const [backendHealth, setBackendHealth] = useState(null);

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
    <div className="h-screen w-full flex flex-col bg-white font-poppins overflow-hidden">
      {/* Compact Header - Slim for extension */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <FiMessageCircle className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-base">SalesHub AI</h1>
            <p className="text-white/70 text-xs">Sales Assistant</p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${backendHealth?.status === "healthy"
              ? "bg-green-400/20 text-green-100"
              : "bg-red-400/20 text-red-100"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${backendHealth?.status === "healthy" ? "bg-green-400" : "bg-red-400"
              }`}></span>
            {backendHealth?.status === "healthy" ? "Online" : "Offline"}
          </div>
        </div>
      </header>

      {/* Chat Area - Full Width, Fills Remaining Space */}
      <main className="flex-1 overflow-hidden">
        <ChatWindow showHistory={false} hideHeader={true} />
      </main>
    </div>
  );
}

export default App;
