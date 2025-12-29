# SmartBrowse AI - Project Architecture

This document provides a comprehensive overview of the project structure, explaining the responsibility of each file and directory.

---

## 📁 Project Structure Overview

```
Project_extension/
├── Extension/              # Backend (Python/Flask API)
└── Extension-frontend/     # Frontend (React/Vite Chrome Extension)
```

---

## 🔧 Backend (`Extension/`)

The backend is a Flask-based REST API that handles AI chat, analytics, and data persistence.

### Core Application Files

| File | Responsibility |
|------|----------------|
| [`app.py`](Extension/app.py) | **Main Flask application factory**. Creates and configures the Flask app, initializes CORS, registers blueprints, sets up database connection, and defines health check endpoints. Entry point when running `python app.py`. |
| [`config.py`](Extension/config.py) | **Application configuration**. Loads environment variables, configures SQLite database for local development, Gemini AI settings, and CORS origins for localhost and Chrome extensions. |
| [`run.py`](Extension/run.py) | **Development server entry point**. Runs the Flask application in development mode. |
| [`requirements.txt`](Extension/requirements.txt) | Python package dependencies for the backend. |
| [`pyproject.toml`](Extension/pyproject.toml) | Python  project metadata and build configuration. |

### Environment Configuration

| File | Responsibility |
|------|----------------|
| `.env` | **Environment variables** (gitignored). Contains `GEMINI_API_KEY`, optional `SECRET_KEY`, and `CORS_ORIGINS` for local development. |

---

### 📂 `routes/` - API Endpoints

Flask Blueprints that define the REST API endpoints.

| File | Responsibility |
|------|----------------|
| [`routes/__init__.py`](Extension/routes/__init__.py) | Package initializer for routes module. |
| [`routes/chat.py`](Extension/routes/chat.py) | **AI Chat API endpoints**. Handles chat messaging with rate limiting, validation, and analytics. Includes:<br>• `POST /api/chat/send` - Send message to AI<br>• `GET /api/chat/history/<user_id>` - Get chat history<br>• `GET /api/chat/test` - Test Gemini connection<br>• `GET /api/chat/export/<user_id>` - Export chat history<br>• `GET /api/chat/stats/<user_id>` - Get user statistics<br>• `GET /api/chat/analytics` - Get system analytics |
| [`routes/debug.py`](Extension/routes/debug.py) | **Debug utilities**. Development and troubleshooting endpoints:<br>• `GET /api/debug/db-status` - Database status check<br>• `GET /api/debug/user-data/<user_id>` - Get user data |

---

### 📂 `database/` - Data Layer

| File | Responsibility |
|------|----------------|
| [`database/models.py`](Extension/database/models.py) | **SQLAlchemy ORM models**. Defines database schema with User, ChatSession, BrowserActivity, and DailySession models. |
| [`database/db_init.sql`](Extension/database/db_init.sql) | Raw SQL initialization script for manual database setup. |

#### Database Models

```python
# User - Stores user information
User:
  - user_id (PK)      # Unique user identifier
  - session_id        # Current session ID
  - created_at        # Account creation timestamp
  - last_active       # Last activity timestamp

# ChatSession - Stores chat messages
ChatSession:
  - chat_id (PK)      # Auto-increment ID
  - user_id (FK)      # References User
  - session_id        # Session identifier
  - message_id        # Unique message ID
  - message_type      # 'user' or 'assistant'
  - message_text      # Message content
  - timestamp         # Message timestamp

# BrowserActivity - Tracks user browsing behavior
BrowserActivity:
  - activity_id (PK)  # Auto-increment ID
  - user_id (FK)      # References User
  - session_id        # Session identifier
  - url               # Page URL visited
  - domain            # Extracted domain
  - page_title        # Page title
  - activity_type     # page_visit, click, scroll, copy, paste, etc.
  - element_details   # JSON with interaction details
  - timestamp         # Activity timestamp
  - duration_seconds  # Time spent

# DailySession - Aggregates daily statistics
DailySession:
  - session_id (PK)          # Session identifier
  - user_id (FK)             # References User
  - start_time               # Session start
  - end_time                 # Session end
  - total_pages_visited      # Page count
  - total_interactions       # Interaction count
  - chat_messages_count      # Messages exchanged
```

---

### 📂 `utils/` - Utility Modules

| File | Responsibility |
|------|----------------|
| [`utils/gemini_client.py`](Extension/utils/gemini_client.py) | **Gemini AI Integration**. Wrapper class for Google's Generative AI API. Handles AI initialization, response generation with context, safety settings, and error handling. |
| [`utils/validators.py`](Extension/utils/validators.py) | **Input validation utilities**. Validates API request data including message length, user IDs, and request formats. |
| [`utils/analytics.py`](Extension/utils/analytics.py) | **Analytics tracking**. In-memory analytics for tracking message counts, response times, error rates, and user statistics. Includes `Analytics` class and `ResponseTimer` context manager. |
| [`utils/rate_limiter.py`](Extension/utils/rate_limiter.py) | **Rate limiting**. Per-user rate limiting to prevent API abuse. Supports per-minute and per-day limits with thread-safe operations. |

---

## 🎨 Frontend (`Extension-frontend/`)

The frontend is a React Single Page Application built with Vite, designed as a Chrome extension with AI chat interface.

### Root Configuration Files

| File | Responsibility |
|------|----------------|
| [`package.json`](Extension-frontend/package.json) | **NPM configuration**. Defines dependencies (React, Axios, Chart.js, React Icons), scripts (`dev`, `build`, `preview`), and project metadata. |
| [`package-lock.json`](Extension-frontend/package-lock.json) | Locked dependency versions for reproducible builds. |
| [`vite.config.js`](Extension-frontend/vite.config.js) | **Vite configuration**. Build settings, React plugin, proxy configuration for local dev, and code splitting. |
| [`tailwind.config.js`](Extension-frontend/tailwind.config.js) | **TailwindCSS configuration**. Custom theme, colors, and utility extensions. |
| [`postcss.config.js`](Extension-frontend/postcss.config.js) | PostCSS configuration for CSS processing with Tailwind and Autoprefixer. |
| [`eslint.config.js`](Extension-frontend/eslint.config.js) | ESLint rules for code quality and React best practices. |
| [`index.html`](Extension-frontend/index.html) | **HTML entry point**. Root HTML file that loads the React app. |
| [`generate-icons.js`](Extension-frontend/generate-icons.js) | **Icon generator utility**. Generates PNG icons in multiple sizes (16x16, 48x48, 128x128) from SVG source for Chrome extension requirements. |

### Environment Files

| File | Responsibility |
|------|----------------|
| `.env` | Local environment variables (`VITE_API_BASE_URL=http://localhost:5000/api`). |
| `.env.development` | Development environment variables for local development. |

---

### 📂 `src/` - Source Code

| File | Responsibility |
|------|----------------|
| [`src/main.jsx`](Extension-frontend/src/main.jsx) | **React entry point**. Renders the root `App` component into the DOM. |
| [`src/App.jsx`](Extension-frontend/src/App.jsx) | **Main application component**. Contains the entire app layout including navigation, backend health checking, and chat interface rendering logic. |
| [`src/App.css`](Extension-frontend/src/App.css) | Component-specific styles for App. |
| [`src/index.css`](Extension-frontend/src/index.css) | **Global styles**. TailwindCSS imports and base application styles. |

---

### 📂 `src/components/` - React Components

#### Chat Components (`src/components/Chat/`)

| File | Responsibility |
|------|----------------|
| [`ChatWindow.jsx`](Extension-frontend/src/components/Chat/ChatWindow.jsx) | **Main chat interface**. Displays messages, handles user input, sends messages to backend, and renders AI responses with markdown support. |
| [`ChatHistory.jsx`](Extension-frontend/src/components/Chat/ChatHistory.jsx) | **Chat history management**. Manages chat sessions, displays conversation list, and handles chat loading/deletion. |
| [`ChatSidebar.jsx`](Extension-frontend/src/components/Chat/ChatSidebar.jsx) | **Collapsible sidebar**. Shows conversation list with titles, timestamps, new chat button, and delete functionality. Supports collapsed/expanded states. |

#### Common Components (`src/components/Common/`)

| File | Responsibility |
|------|----------------|
| [`Button.jsx`](Extension-frontend/src/components/Common/Button.jsx) | **Reusable button component**. Customizable button with variants, sizes, and loading states. |
| [`Card.jsx`](Extension-frontend/src/components/Common/Card.jsx) | **Card container component**. Reusable card layout with header, body, and styling options. |
| [`Input.jsx`](Extension-frontend/src/components/Common/Input.jsx) | **Form input component**. Customizable text input with labels, validation states, and icons. |
| [`LoadingSpinner.jsx`](Extension-frontend/src/components/Common/LoadingSpinner.jsx) | **Loading indicator**. Animated loading spinner for async operations. |

---

### 📂 `src/services/` - API Services

| File | Responsibility |
|------|----------------|
| [`src/services/api.js`](Extension-frontend/src/services/api.js) | **API client and services**. Central module containing Axios instance with interceptors and service methods:<br><br>**Chat Service:**<br>• `sendMessage(message)` - Send chat message<br>• `getChatHistory(limit)` - Get chat history<br>• `testConnection()` - Test backend<br><br>**Health Service:**<br>• `checkBackend()` - Backend health check<br><br>**Utilities:**<br>• `getUserId()` - Get/generate user ID<br>• `getSessionId()` - Get/generate session ID<br>• `formatTime(timestamp)` - Format timestamps<br>• `truncateText(text, length)` - Truncate text |
| [`src/services/dashboardService.js`](Extension-frontend/src/services/dashboardService.js) | **Dashboard data service**. Service for fetching and transforming analytics and statistics data. |

---

### 📂 `src/styles/` - Stylesheets

| File | Responsibility |
|------|-------------------|
| [`global.css`](Extension-frontend/src/styles/global.css) | Global application styles and custom CSS classes. |

### 📂 `src/assets/` - Static Assets

| File | Responsibility |
|------|----------------|
| `react.svg` | React logo asset. |

---

### 📂 `public/` - Public Assets

| File | Responsibility |
|------|----------------|
| [`manifest.json`](Extension-frontend/public/manifest.json) | **Chrome Extension manifest file**. Defines extension metadata, permissions (`storage`), host permissions (`localhost:5000`), and icon paths. Extension name: "SalesHub AI". |
| `vite.svg` | Vite logo asset. |
| `icons/` | Directory containing extension icons (16x16, 48x48, 128x128 PNG files). |

### 📂 `dist/` - Build Output

Built Chrome extension files including compiled JavaScript, HTML, manifest, and icons. This folder is loaded by Chrome when running the extension.

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   App.jsx    │───▶│  Components  │───▶│   api.js     │      │
│  │  (Main App)  │    │  (UI Layer)  │    │  (Services)  │      │
│  └──────────────┘    └──────────────┘    └──────┬───────┘      │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │ HTTP/REST
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   app.py     │───▶│   routes/    │───▶│   utils/     │      │
│  │  (Flask)     │    │  (Endpoints) │    │(Gemini, etc) │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                             │                                    │
│                             ▼                                    │
│                      ┌──────────────┐                           │
│                      │  database/   │                           │
│                      │  (SQLAlchemy)│                           │
│                      └──────┬───────┘                           │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  SQLite Database │
                    │     (app.db)     │
                    └──────────────────┘
```

---

## 🚀 Local Development Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                     │
│                                                          │
│  ┌─────────────────────┐       ┌─────────────────────┐  │
│  │   FRONTEND          │       │     BACKEND         │  │
│  │  localhost:3000     │ HTTP  │  localhost:5000     │  │
│  │                     │◀─────▶│                     │  │
│  │  - React/Vite       │       │  - Flask API        │  │
│  │  - Hot reload       │       │  - SQLite DB        │  │
│  │  - Dev server       │       │  - Gemini AI        │  │
│  └─────────────────────┘       └─────────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │            CHROME EXTENSION                     │    │
│  │  chrome-extension://*                          │    │
│  │  - Dist folder loaded by Chrome                │    │
│  │  - manifest.json configuration                 │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/chat/send` | Send message to AI |
| `GET` | `/api/chat/history/<user_id>` | Get chat history |
| `GET` | `/api/chat/test` | Test Gemini connection |
| `GET` | `/api/chat/export/<user_id>` | Export chat history (JSON/CSV) |
| `GET` | `/api/chat/stats/<user_id>` | Get user usage statistics |
| `GET` | `/api/chat/analytics` | Get system-wide analytics |
| `GET` | `/api/debug/db-status` | Database status check |
| `GET` | `/api/debug/user-data/<user_id>` | Get all user data |

---

## 🔐 Environment Variables

### Backend (`Extension/.env`)
```bash
# AI Configuration (Required)
GEMINI_API_KEY=your_api_key_here   # Google Gemini API key

# Security (Optional - auto-generated if not set)
SECRET_KEY=your_secret_key         # Flask secret key

# CORS (Optional - defaults to localhost)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,chrome-extension://*

# Flask Environment (Optional)
FLASK_ENV=development              # development or production
```

### Frontend (`Extension-frontend/.env` or `.env.development`)
```bash
# Backend API URL
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🚦 Running the Application

### Backend
```bash
cd Extension
python run.py
# Or: python app.py
```

### Frontend (Development)
```bash
cd Extension-frontend
npm install
npm run dev
```

### Frontend (Build for Chrome Extension)
```bash
cd Extension-frontend
npm run build
# Then load the 'dist' folder in Chrome as an unpacked extension
```

---

*Last Updated: December 29, 2025 - Comprehensive audit completed, all files documented accurately*
