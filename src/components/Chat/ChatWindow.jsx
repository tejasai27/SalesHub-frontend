import React, { useState, useEffect, useRef } from 'react';
import { chatService, utils } from '../../services/api';
import Button from '../Common/Button';
import Input from '../Common/Input';
import { FiSend, FiUser, FiMessageSquare, FiZap, FiCopy, FiCheck, FiRefreshCw } from 'react-icons/fi';

// Sales-focused example prompts
const EXAMPLE_PROMPTS = [
  { emoji: "📧", text: "Write a follow-up email", category: "Email" },
  { emoji: "🎯", text: "Handle price objection", category: "Objection" },
  { emoji: "💡", text: "Cold outreach message", category: "Outreach" },
  { emoji: "🤝", text: "Meeting request email", category: "Email" },
  { emoji: "📊", text: "Pitch deck talking points", category: "Presentation" },
  { emoji: "🔥", text: "Re-engage cold lead", category: "Follow-up" }
];

const ChatWindow = ({ showHistory }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [copiedId, setCopiedId] = useState(null);
  const [rateLimit, setRateLimit] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
    testConnection();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const testConnection = async () => {
    try {
      const result = await chatService.testConnection();
      setConnectionStatus(result.gemini_available ? 'connected' : 'api_key_missing');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await chatService.getChatHistory(20);
      if (response.success && response.history) {
        setMessages(response.history);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setIsTyping(true);

    try {
      const response = await chatService.sendMessage(userMessage.message);

      // Update rate limit info if available
      if (response.rate_limit) {
        setRateLimit(response.rate_limit);
      }

      const aiMessage = {
        id: response.message_id || Date.now() + 1,
        type: 'assistant',
        message: response.response,
        timestamp: response.timestamp || new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        message: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const handlePromptClick = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getConnectionMessage = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Ready';
      case 'api_key_missing':
        return 'API key required';
      case 'disconnected':
        return 'Offline';
      default:
        return 'Connecting...';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-50 to-white font-sans antialiased">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <FiMessageSquare className="w-5 h-5 text-white" />
              </div>
              {connectionStatus === 'connected' && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">SalesHub AI</h2>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${connectionStatus === 'connected' ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}></span>
                {getConnectionMessage()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rateLimit && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-lg">
                <FiZap className="w-3 h-3 text-slate-500" />
                <span className="text-xs text-slate-600">{rateLimit.remaining_minute}/min</span>
              </div>
            )}
            {connectionStatus === 'connected' && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200/50">
                <FiZap className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scroll-smooth px-5 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              {/* Hero Section */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-2xl"></div>
                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <FiMessageSquare className="w-10 h-10 text-white" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Welcome to SalesHub AI
              </h3>
              <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                Your AI-powered sales assistant. Get help with emails, objection handling, follow-ups, and closing deals.
              </p>

              {connectionStatus !== 'connected' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-600 font-bold">!</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-amber-900 mb-1">Setup Required</h4>
                      <ol className="text-sm text-amber-800 space-y-1">
                        <li>1. Get API key from Google AI Studio</li>
                        <li>2. Add to backend .env file</li>
                        <li>3. Restart server</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {connectionStatus === 'connected' && (
                <div className="w-full max-w-lg">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Try these prompts</p>
                  <div className="grid grid-cols-2 gap-3">
                    {EXAMPLE_PROMPTS.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handlePromptClick(prompt.text)}
                        className="group relative px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200 overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative flex items-center gap-3">
                          <span className="text-2xl group-hover:scale-110 transition-transform duration-200">{prompt.emoji}</span>
                          <div>
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{prompt.text}</span>
                            <span className="block text-xs text-slate-400 group-hover:text-blue-500">{prompt.category}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id || msg.message_id || index}
                  className={`flex gap-3 ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                >
                  {msg.type === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-md ${msg.isError
                          ? 'bg-gradient-to-br from-red-500 to-rose-600'
                          : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'
                        }`}>
                        <FiMessageSquare className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}

                  <div className={`group max-w-[75%] ${showHistory ? 'max-w-[70%]' : ''}`}>
                    <div
                      className={`relative rounded-2xl px-4 py-3 ${msg.type === 'user'
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : msg.isError
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                        }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {msg.message}
                      </p>
                      <div className={`flex items-center justify-between mt-2 text-xs ${msg.type === 'user' ? 'text-blue-200' : 'text-slate-400'
                        }`}>
                        <span>{utils.formatTime(msg.timestamp)}</span>
                        {msg.type === 'assistant' && !msg.isError && (
                          <button
                            onClick={() => copyToClipboard(msg.message, msg.id || msg.message_id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-slate-100 rounded"
                            title="Copy message"
                          >
                            {copiedId === (msg.id || msg.message_id) ? (
                              <FiCheck className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <FiCopy className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {msg.type === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md">
                        <FiUser className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex gap-3 animate-fadeIn">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
                    <FiMessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white text-slate-800 rounded-2xl px-4 py-3 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                      <span className="text-sm text-slate-500 ml-1">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="px-5 py-4 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
        <form onSubmit={handleSend} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  connectionStatus === 'connected'
                    ? "Ask me anything about sales..."
                    : "Setup API key to start..."
                }
                disabled={loading || connectionStatus !== 'connected'}
                className="w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 py-3 px-4 text-sm transition-all duration-200 placeholder-slate-400"
              />
              {input.length > 0 && (
                <span className="absolute right-3 bottom-3 text-xs text-slate-400">
                  {input.length}/2000
                </span>
              )}
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || loading || connectionStatus !== 'connected'}
              className={`rounded-xl w-12 h-12 p-0 flex items-center justify-center transition-all duration-200 ${input.trim() && !loading && connectionStatus === 'connected'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105'
                  : 'bg-slate-200'
                }`}
            >
              {loading ? (
                <FiRefreshCw className="w-5 h-5 text-white animate-spin" />
              ) : (
                <FiSend className={`w-5 h-5 ${input.trim() && connectionStatus === 'connected' ? 'text-white' : 'text-slate-400'}`} />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {connectionStatus === 'connected'
                ? 'Press Enter to send • Shift+Enter for new line'
                : 'Configure API key to start chatting'}
            </span>
          </div>
        </form>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;