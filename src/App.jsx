import React, { useState, useEffect } from "react";
import ChatWindow from "./components/Chat/ChatWindow";
import ChatSidebar from "./components/Chat/ChatSidebar";
import { healthService, utils } from "./services/api";
import { FiMessageCircle, FiMenu } from "react-icons/fi";

function App() {
  const [backendHealth, setBackendHealth] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    checkBackendHealth();
    loadChats();
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

  const loadChats = () => {
    const savedChats = utils.getAllChats();
    setChats(savedChats);

    // Set active chat from localStorage or first chat
    const savedActiveChatId = utils.getActiveChatId();
    if (savedActiveChatId && savedChats.find(c => c.id === savedActiveChatId)) {
      setActiveChatId(savedActiveChatId);
    } else if (savedChats.length > 0) {
      setActiveChatId(savedChats[0].id);
      utils.setActiveChatId(savedChats[0].id);
    }
  };

  const handleNewChat = () => {
    const newChat = utils.createChat();
    setChats(utils.getAllChats());
    setActiveChatId(newChat.id);
  };

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId);
    utils.setActiveChatId(chatId);
  };

  const handleDeleteChat = (chatId) => {
    const updatedChats = utils.deleteChat(chatId);
    setChats(updatedChats);

    // Update active chat if needed
    if (chatId === activeChatId) {
      if (updatedChats.length > 0) {
        setActiveChatId(updatedChats[0].id);
      } else {
        setActiveChatId(null);
      }
    }
  };

  const handleChatUpdate = () => {
    // Refresh chat list when messages are added
    setChats(utils.getAllChats());
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white font-poppins overflow-hidden">
      {/* Compact Header - Slim for extension */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiMenu className="w-4 h-4" />
          </button>
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

      {/* Main Content with Sidebar */}
      <main className="flex-1 flex overflow-hidden">
        {/* Chat Sidebar */}
        {sidebarOpen && (
          <ChatSidebar
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            isCollapsed={false}
            onToggleCollapse={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {activeChatId ? (
            <ChatWindow
              chatId={activeChatId}
              showHistory={false}
              hideHeader={true}
              onChatUpdate={handleChatUpdate}
              sidebarOpen={sidebarOpen}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
                <FiMessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Start a Conversation</h3>
              <p className="text-slate-500 mb-6 max-w-sm">
                Create a new chat to begin talking with your AI sales assistant.
              </p>
              <button
                onClick={handleNewChat}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                New Chat
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

