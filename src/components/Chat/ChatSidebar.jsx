import React from 'react';
import { FiPlus, FiMessageSquare, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { utils } from '../../services/api';

const ChatSidebar = ({
    chats,
    activeChatId,
    onSelectChat,
    onNewChat,
    onDeleteChat,
    isCollapsed,
    onToggleCollapse
}) => {
    const formatChatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className={`flex flex-col h-full bg-white/90 backdrop-blur-md border-r border-slate-200/50 transition-all duration-300 ${isCollapsed ? 'w-14' : 'w-64'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-4 border-b border-slate-100">
                {!isCollapsed && (
                    <h3 className="font-semibold text-slate-700 text-sm">Conversations</h3>
                )}
                <button
                    onClick={onToggleCollapse}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                    title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {isCollapsed ? (
                        <FiChevronRight className="w-4 h-4" />
                    ) : (
                        <FiChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
                <button
                    onClick={onNewChat}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-medium text-sm shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-200 ${isCollapsed ? 'justify-center' : ''
                        }`}
                    title="New Chat"
                >
                    <FiPlus className="w-4 h-4" />
                    {!isCollapsed && <span>New Chat</span>}
                </button>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
                {chats.length === 0 ? (
                    !isCollapsed && (
                        <div className="text-center py-8 px-4">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                                <FiMessageSquare className="w-6 h-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">No conversations yet</p>
                            <p className="text-xs text-slate-400 mt-1">Start a new chat to begin</p>
                        </div>
                    )
                ) : (
                    <div className="space-y-1">
                        {chats.map((chat) => (
                            <div
                                key={chat.id}
                                className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${activeChatId === chat.id
                                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 shadow-sm'
                                        : 'hover:bg-slate-50 border border-transparent'
                                    }`}
                                onClick={() => onSelectChat(chat.id)}
                                title={chat.title}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${activeChatId === chat.id
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                                        : 'bg-slate-200'
                                    }`}>
                                    <FiMessageSquare className={`w-4 h-4 ${activeChatId === chat.id ? 'text-white' : 'text-slate-500'
                                        }`} />
                                </div>

                                {!isCollapsed && (
                                    <>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${activeChatId === chat.id ? 'text-blue-700' : 'text-slate-700'
                                                }`}>
                                                {chat.title}
                                            </p>
                                            <p className="text-xs text-slate-400 truncate">
                                                {formatChatDate(chat.updatedAt || chat.createdAt)}
                                            </p>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteChat(chat.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-200"
                                            title="Delete chat"
                                        >
                                            <FiTrash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {!isCollapsed && (
                <div className="px-4 py-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400 text-center">
                        {chats.length} conversation{chats.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;
