# 🤖 SalesHub AI Chatbot - Deep Implementation Analysis

This document provides a comprehensive deep dive into the SalesHub AI chatbot feature implementation.

---

## Overview

The chatbot is a **full-stack AI-powered sales assistant** featuring:
- **Multi-chat session management** with localStorage persistence
- **Collapsible sidebar** for conversation navigation
- **AI-powered responses** via Google Gemini 1.5 Flash
- **Rate limiting** and analytics tracking
- **Sales-focused prompts** and context-aware conversations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   App.jsx    │───▶│ ChatWindow   │───▶│     chatService (api.js)     │  │
│  │  (Layout)    │    │ ChatSidebar  │    │  Axios API + localStorage    │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │ HTTP/REST
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Flask + SQLAlchemy)                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │  chat.py     │───▶│ GeminiClient │───▶│  Google Generative AI        │  │
│  │  (Routes)    │    │  (Wrapper)   │    │  (gemini-1.5-flash)          │  │
│  └──────┬───────┘    └──────────────┘    └──────────────────────────────┘  │
│         │                                                                    │
│         ├─────▶ Rate Limiter (utils/rate_limiter.py)                        │
│         ├─────▶ Analytics (utils/analytics.py)                               │
│         ├─────▶ Validators (utils/validators.py)                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │ SQLAlchemy   │ ──▶ PostgreSQL/SQLite (Users, ChatSessions)               │
│  │ (ORM Models) │                                                           │
│  └──────────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Frontend Architecture

### 📁 App.jsx - Main Application Layout

The root component manages the overall layout with a **collapsible sidebar** pattern:

```jsx
function App() {
  const [chats, setChats] = useState([]);           // All chat sessions
  const [activeChatId, setActiveChatId] = useState(null);  // Current chat
  const [sidebarOpen, setSidebarOpen] = useState(false);   // Sidebar visibility (hidden by default)
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    checkBackendHealth();
    loadChats();
    const interval = setInterval(checkBackendHealth, 30000); // Health check every 30s
    return () => clearInterval(interval);
  }, []);
}
```

**Key Features:**
- **Header** with branding and online/offline status indicator
- **Sidebar toggle** button (hamburger menu)
- **Chat sidebar** for managing multiple conversations
- **Empty state** with "Start a Conversation" prompt when no chats exist

---

### 📁 `components/Chat/ChatWindow.jsx` - Chat Interface

The main chat component with **sales-focused example prompts**:

**State Management:**
```jsx
const [messages, setMessages] = useState([]);        // Current chat messages
const [input, setInput] = useState('');              // Input text
const [loading, setLoading] = useState(false);       // Request in progress
const [isTyping, setIsTyping] = useState(false);     // AI typing indicator
const [connectionStatus, setConnectionStatus] = useState('checking');
const [copiedId, setCopiedId] = useState(null);      // Copy feedback
const [rateLimit, setRateLimit] = useState(null);    // Rate limit info
```

**Example Sales Prompts:**
```jsx
const EXAMPLE_PROMPTS = [
  { emoji: "📧", text: "Write a follow-up email", category: "Email" },
  { emoji: "🎯", text: "Handle price objection", category: "Objection" },
  { emoji: "💡", text: "Cold outreach message", category: "Outreach" },
  { emoji: "🤝", text: "Meeting request email", category: "Email" },
  { emoji: "📊", text: "Pitch deck talking points", category: "Presentation" },
  { emoji: "🔥", text: "Re-engage cold lead", category: "Follow-up" }
];
```

**Message Send Flow:**
```jsx
const handleSend = async (e) => {
  e?.preventDefault();
  if (!input.trim() || loading || !chatId) return;

  // 1. Create optimistic user message
  const userMessage = {
    id: Date.now(),
    type: 'user',
    message: input.trim(),
    timestamp: new Date().toISOString(),
  };

  // 2. Save to localStorage and update UI
  utils.saveMessageToChat(chatId, userMessage);
  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setLoading(true);
  setIsTyping(true);

  // 3. Notify parent to refresh sidebar
  if (onChatUpdate) onChatUpdate();

  try {
    // 4. Send to backend API
    const response = await chatService.sendMessage(userMessage.message);
    
    // 5. Update rate limit info if available
    if (response.rate_limit) {
      setRateLimit(response.rate_limit);
    }

    // 6. Create and save AI response
    const aiMessage = {
      id: response.message_id || Date.now() + 1,
      type: 'assistant',
      message: response.response,
      timestamp: response.timestamp || new Date().toISOString(),
    };
    utils.saveMessageToChat(chatId, aiMessage);
    setMessages(prev => [...prev, aiMessage]);
  } catch (error) {
    // 7. Handle errors gracefully
    const errorMessage = {
      type: 'assistant',
      message: 'Sorry, I encountered an error. Please try again.',
      isError: true,
    };
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setLoading(false);
    setIsTyping(false);
  }
};
```

**Additional Features:**
- **Copy to clipboard** for AI responses
- **Auto-scroll** to newest message
- **Typing indicator** with animated dots
- **Setup instructions** when API key is missing

---

### 📁 `components/Chat/ChatSidebar.jsx` - Conversation List

Manages multiple chat sessions with a **collapsible design**:

```jsx
const ChatSidebar = ({
  chats,               // All chat sessions
  activeChatId,        // Currently selected chat
  onSelectChat,        // Chat selection handler
  onNewChat,           // Create new chat handler
  onDeleteChat,        // Delete chat handler
  isCollapsed,         // Sidebar collapse state
  onToggleCollapse     // Toggle sidebar visibility
}) => {
  // ... component logic
}
```

**Features:**
- **New Chat button** with gradient styling
- **Chat list** with title, date, and delete options
- **Active chat highlighting**
- **Collapse/expand** functionality
- **Empty state** when no chats exist

---

### 📁 `services/api.js` - API Service Layer

**Multi-Chat Session Management (localStorage):**
```javascript
const CHATS_KEY = 'saleshub_chats';
const ACTIVE_CHAT_KEY = 'saleshub_active_chat';

// Core functions
const getAllChats = () => JSON.parse(localStorage.getItem(CHATS_KEY)) || [];
const saveAllChats = (chats) => localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
const getActiveChatId = () => localStorage.getItem(ACTIVE_CHAT_KEY);
const setActiveChatId = (chatId) => localStorage.setItem(ACTIVE_CHAT_KEY, chatId);

// Chat operations
const createChat = () => {
  const newChat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    messages: []
  };
  // Save and return new chat
};

const saveMessageToChat = (chatId, message) => {
  // Save message to chat
  // Auto-update title from first user message if title is "New Chat"
};
```

**API Service Methods:**
```javascript
export const chatService = {
  sendMessage: async (message) => {
    const payload = {
      message,
      user_id: getUserId(),
      session_id: getSessionId(),
    };
    const response = await api.post("/chat/send", payload);
    return response.data;
  },

  getChatHistory: async (limit = 50) => {
    const response = await api.get(`/chat/history/${getUserId()}?limit=${limit}`);
    return response.data;
  },

  testConnection: async () => {
    const response = await api.get("/chat/test");
    return response.data;
  },
};

export const healthService = {
  checkBackend: async () => {
    const response = await api.get("/health");
    return response.data;
  },
};
```

**Utility Functions:**
```javascript
export const utils = {
  getUserId,           // Generate/retrieve persistent user ID
  getSessionId,        // Get daily session ID
  getAllChats,         // Get all chats from localStorage
  createChat,          // Create new chat
  deleteChat,          // Delete a chat
  getChatById,         // Get specific chat
  updateChatTitle,     // Update chat title
  saveMessageToChat,   // Add message to chat
  getChatMessages,     // Get messages for a chat
  clearChatMessages,   // Clear chat messages
  getActiveChatId,     // Get active chat ID
  setActiveChatId,     // Set active chat ID
  truncateText,        // Truncate text with ellipsis
  formatTime,          // Format timestamp (e.g., "2m ago", "12:30 PM")
  formatDate,          // Format date
  getApiBaseUrl,       // Get API base URL
};
```

---

## 2. Backend Architecture

### 📁 `routes/chat.py` - Chat API Endpoints

**Six API endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/send` | POST | Send message & get AI response with rate limiting |
| `/api/chat/history/<user_id>` | GET | Retrieve chat history with pagination |
| `/api/chat/test` | GET | Test Gemini API connection status |
| `/api/chat/export/<user_id>` | GET | Export chat history (JSON or CSV) |
| `/api/chat/stats/<user_id>` | GET | Get user usage statistics |
| `/api/chat/analytics` | GET | Get system-wide analytics (admin) |

**Message Flow in `send_message()`:**
```python
@chat_bp.route('/api/chat/send', methods=['POST'])
@rate_limit()  # Apply rate limiting decorator
def send_message():
    # 1. Validate input with validators.py
    is_valid, result = validate_message(data.get('message'))
    if not is_valid:
        return jsonify({"error": result}), 400
    
    # 2. Track analytics
    analytics.track_message(user_id)
    
    # 3. Create or get user from database
    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        user = User(user_id=user_id, session_id=session_id)
        db.session.add(user)
    
    # 4. Store user message in database
    user_msg = ChatSession(
        user_id=user_id,
        session_id=session_id,
        message_id=str(uuid.uuid4()),
        message_type='user',
        message_text=message,
        timestamp=datetime.utcnow()
    )
    db.session.add(user_msg)
    
    # 5. Get conversation history for context (last 10 messages)
    conversation_history = gemini_client.get_conversation_history(user_id, session_id, limit=10)
    context = gemini_client.get_chat_context(user_id, session_id)
    
    # 6. Generate AI response with timing
    timer = ResponseTimer()
    with timer:
        ai_response_data = gemini_client.generate_response(
            message,
            context=context,
            conversation_history=conversation_history
        )
    
    # 7. Store AI response with performance metrics
    ai_msg = ChatSession(
        user_id=user_id,
        message_type='assistant',
        message_text=ai_response,
        response_time_ms=int(timer.duration_ms),
        tokens_used=tokens_used
    )
    db.session.add(ai_msg)
    db.session.commit()
    
    # 8. Return response with rate limit status
    rate_status = get_rate_limit_status(user_id)
    return jsonify({
        "success": True,
        "response": ai_response,
        "message_id": ai_msg.message_id,
        "performance": {"response_time_ms": response_time_ms, "tokens_used": tokens_used},
        "rate_limit": {"remaining_minute": rate_status["minute_remaining"], "remaining_day": rate_status["day_remaining"]}
    })
```

---

### 📁 `utils/gemini_client.py` - AI Integration

**Sales-Focused System Prompt:**
```python
SALES_SYSTEM_PROMPT = """You are SalesHub AI, a professional sales assistant. Your role is to:

1. **Help craft compelling communications**: Emails, follow-ups, LinkedIn outreach, proposals
2. **Provide sales strategies**: Objection handling, closing strategies, negotiation tips
3. **Answer product/service questions**: Features, benefits, value propositions
4. **Lead qualification**: Discovery questions, qualifying leads
5. **Research assistance**: Analyze prospects, industries, competitive landscape

Guidelines:
- Be professional, helpful, and action-oriented
- Provide specific, actionable advice (not generic tips)
- Use a confident but friendly tone
- Keep responses concise but comprehensive
- When writing emails or messages, make them ready to send
"""
```

**GeminiClient Class:**
```python
class GeminiClient:
    def __init__(self):
        self.max_retries = 3
        self.retry_delay = 2  # seconds
        
        # Validate API key
        if not Config.GEMINI_API_KEY:
            self.gemini_available = False
            return
        
        genai.configure(api_key=Config.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(Config.GEMINI_MODEL)
        self.gemini_available = True
    
    def _build_context_prompt(self, prompt, conversation_history=None, context=None):
        """Build full prompt with system instructions and conversation history."""
        parts = [SALES_SYSTEM_PROMPT]
        
        # Add conversation history (last 10 messages)
        if conversation_history:
            parts.append("\n--- Recent Conversation ---")
            for role, text in conversation_history[-10:]:
                parts.append(f"{role.capitalize()}: {text}")
            parts.append("--- End of History ---\n")
        
        # Add additional context
        if context:
            parts.append(f"Additional Context: {context}\n")
        
        parts.append(f"Current User Message: {prompt}")
        parts.append("\nProvide a helpful, sales-focused response:")
        
        return "\n".join(parts)
    
    def _call_api_with_retry(self, prompt, max_tokens):
        """Call Gemini API with exponential backoff retry for rate limits."""
        for attempt in range(self.max_retries):
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config={
                        "max_output_tokens": max_tokens,
                        "temperature": 0.7,
                        "top_p": 0.8,
                        "top_k": 40,
                    },
                    safety_settings=[...]
                )
                return response.text
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower():
                    wait_time = self.retry_delay * (2 ** attempt)
                    time.sleep(wait_time)
                    continue
                raise
    
    def generate_response(self, prompt, context=None, conversation_history=None, max_tokens=800):
        """Generate AI response with full context."""
        if not self.gemini_available:
            return {'text': "Please configure Gemini API key.", 'tokens_used': None}
        
        full_prompt = self._build_context_prompt(prompt, conversation_history, context)
        response_text = self._call_api_with_retry(full_prompt, max_tokens)
        
        return {'text': response_text, 'tokens_used': None, 'response_obj': None}
    
    def get_conversation_history(self, user_id, session_id, limit=10):
        """Retrieve recent messages from database for context."""
        messages = ChatSession.query.filter_by(
            user_id=user_id,
            session_id=session_id
        ).order_by(ChatSession.timestamp.desc()).limit(limit).all()
        
        return [(msg.message_type, msg.message_text) for msg in reversed(messages)]
```

---

### 📁 `database/models.py` - Data Models

**User Model:**
```python
class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.String(255), primary_key=True)
    session_id = db.Column(db.String(255))
    
    # Profile fields
    name = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), default='sales_rep')  # sales_rep, manager, admin
    team = db.Column(db.String(100), nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Settings
    preferences = db.Column(db.Text, nullable=True)  # JSON
    
    # Relationships
    chats = db.relationship('ChatSession', backref='user', lazy=True)
```

**ChatSession Model:**
```python
class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'
    
    chat_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(255), db.ForeignKey('users.user_id'), nullable=False)
    session_id = db.Column(db.String(255))
    message_id = db.Column(db.String(255))
    message_type = db.Column(db.String(20))  # 'user' or 'assistant'
    message_text = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Performance tracking (AI responses only)
    response_time_ms = db.Column(db.Integer, nullable=True)
    tokens_used = db.Column(db.Integer, nullable=True)
```

---

## 3. Key Features Summary

| Feature | Implementation |
|---------|---------------|
| **Multi-Chat Sessions** | localStorage with sidebar navigation |
| **Sidebar (Hidden by Default)** | Collapsible sidebar toggled via hamburger menu |
| **Real-time Status** | Health check every 30s with online/offline indicator |
| **Typing Indicator** | Animated bouncing dots during AI response |
| **Chat Persistence** | Frontend: localStorage / Backend: SQLAlchemy + DB |
| **Session Management** | Daily sessions with unique IDs |
| **User Identification** | UUID generated and stored in localStorage |
| **Conversation Context** | Last 10 messages passed to Gemini for context |
| **Sales-Focused AI** | Custom system prompt for sales assistance |
| **Rate Limiting** | Per-user rate limits with remaining quota display |
| **Analytics Tracking** | Message counts, response times, error tracking |
| **Copy to Clipboard** | Copy AI responses with visual feedback |
| **Safety Filters** | Gemini safety settings block harmful content |
| **Error Handling** | Graceful fallbacks with user-friendly messages |
| **Auto-scroll** | Messages container scrolls to newest message |
| **Export** | Chat export as JSON or CSV |

---

## 4. Configuration

**Backend `.env`:**
```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
DATABASE_URL=postgresql://user:pass@localhost:5432/saleshub
# or for SQLite:
# DATABASE_URL=sqlite:///saleshub.db
```

**Frontend `.env` (optional):**
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 5. File References

### Backend Files
| File | Description |
|------|-------------|
| `Extension/routes/chat.py` | Chat API endpoints (6 routes) |
| `Extension/utils/gemini_client.py` | Gemini AI wrapper with context building |
| `Extension/utils/rate_limiter.py` | Rate limiting middleware |
| `Extension/utils/analytics.py` | Usage tracking and statistics |
| `Extension/utils/validators.py` | Input validation |
| `Extension/database/models.py` | SQLAlchemy models (User, ChatSession) |

### Frontend Files
| File | Description |
|------|-------------|
| `Extension-frontend/src/App.jsx` | Main layout with sidebar toggle |
| `Extension-frontend/src/components/Chat/ChatWindow.jsx` | Chat interface with prompts |
| `Extension-frontend/src/components/Chat/ChatSidebar.jsx` | Collapsible chat list |
| `Extension-frontend/src/components/Chat/ChatHistory.jsx` | Historical view (optional) |
| `Extension-frontend/src/services/api.js` | API client & localStorage utils |

---

## 6. Data Flow Diagram

```
User Types Message
       │
       ▼
┌──────────────────┐
│   ChatWindow     │
│  handleSend()    │
└────────┬─────────┘
         │
         ├───▶ Save to localStorage (utils.saveMessageToChat)
         │
         ▼
┌──────────────────┐
│   chatService    │
│  .sendMessage()  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Flask Backend   │
│  /api/chat/send  │
├──────────────────┤
│ • Rate Limiter   │
│ • Validator      │
│ • Analytics      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   GeminiClient   │
│ generate_response│
├──────────────────┤
│ • Build context  │
│ • Add history    │
│ • Call API       │
│ • Retry on 429   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Google Gemini   │
│  1.5 Flash API   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Store in DB     │
│  (ChatSession)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Return Response │
│  with rate_limit │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   ChatWindow     │
│ Update messages  │
│ Save to local    │
└──────────────────┘
```

---

*Last Updated: December 29, 2025*
