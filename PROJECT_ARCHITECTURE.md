# SmartBrowse AI - Project Architecture

This document provides a comprehensive overview of the project structure, explaining the responsibility of each file and directory.

---

## 📁 Project Structure Overview

```
Project_extension/
├── Extension/              # Backend (Python/Flask API)
└── Extension-frontend/     # Frontend (React/Vite SPA)
```

---

## 🔧 Backend (`Extension/`)

The backend is a Flask-based REST API that handles AI chat, browser activity tracking, and data persistence.

### Core Application Files

| File | Responsibility |
|------|----------------|
| [`app.py`](Extension/app.py) | **Main Flask application factory**. Creates and configures the Flask app, initializes CORS, registers blueprints, sets up database connection, and defines health check endpoints. Entry point when running `python app.py`. |
| [`config.py`](Extension/config.py) | **Application configuration**. Loads environment variables, configures database connection (PostgreSQL/SQLite/MySQL), Gemini API settings, and CORS origins. |
| [`run.py`](Extension/run.py) | Alternative entry point for running the Flask application. |
| [`wsgi.py`](Extension/wsgi.py) | **WSGI entry point** for production deployment with Gunicorn or similar WSGI servers. |
| [`requirements.txt`](Extension/requirements.txt) | Python package dependencies for the backend. |
| [`pyproject.toml`](Extension/pyproject.toml) | Python project metadata and build configuration. |
| [`runtime.txt`](Extension/runtime.txt) | Specifies Python version for deployment platforms like Render. |

### Deployment Configuration

| File | Responsibility |
|------|----------------|
| [`Dockerfile`](Extension/Dockerfile) | Docker container configuration for containerized deployment. |
| [`render.yaml`](Extension/render.yaml) | **Render.com deployment configuration**. Defines services, build commands, and environment variables for cloud deployment. |
| `.env` | **Environment variables** (gitignored). Contains sensitive configuration like `GEMINI_API_KEY`, database credentials, and `CORS_ORIGINS`. |

---

### 📂 `routes/` - API Endpoints

This directory contains Flask Blueprints that define the REST API endpoints.

| File | Responsibility |
|------|----------------|
| [`routes/__init__.py`](Extension/routes/__init__.py) | Package initializer for routes module. |
| [`routes/chat.py`](Extension/routes/chat.py) | **AI Chat API endpoints**. Handles chat message sending (`POST /api/chat/send`), chat history retrieval (`GET /api/chat/history/<user_id>`), and Gemini API testing (`GET /api/chat/test`). |
| [`routes/tracking.py`](Extension/routes/tracking.py) | **Browser Activity Tracking API**. Handles activity logging (`POST /api/track/activity`), daily summary retrieval (`GET /api/track/summary/<user_id>`), and activity history queries. |
| [`routes/debug.py`](Extension/routes/debug.py) | **Debug utilities**. Provides debugging endpoints for development and troubleshooting. |

---

### 📂 `database/` - Data Layer

| File | Responsibility |
|------|----------------|
| [`database/models.py`](Extension/database/models.py) | **SQLAlchemy ORM models**. Defines database schema with the following models: |

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

| File | Responsibility |
|------|----------------|
| [`database/db_init.sql`](Extension/database/db_init.sql) | Raw SQL initialization script for manual database setup. |

---

### 📂 `utils/` - Utility Modules

| File | Responsibility |
|------|----------------|
| [`utils/gemini_client.py`](Extension/utils/gemini_client.py) | **Gemini AI Integration**. Wrapper class for Google's Generative AI API. Handles AI initialization, response generation with context, safety settings, and error handling. |
| [`utils/validators.py`](Extension/utils/validators.py) | Input validation utilities for API requests. |

---

## 🎨 Frontend (`Extension-frontend/`)

The frontend is a React Single Page Application built with Vite, featuring a dashboard and AI chat interface.

### Root Configuration Files

| File | Responsibility |
|------|----------------|
| [`package.json`](Extension-frontend/package.json) | **NPM configuration**. Defines dependencies (React, Axios, Chart.js), scripts (`dev`, `build`), and project metadata. |
| [`package-lock.json`](Extension-frontend/package-lock.json) | Locked dependency versions for reproducible builds. |
| [`vite.config.js`](Extension-frontend/vite.config.js) | **Vite configuration**. Build settings, plugins, and development server options. |
| [`tailwind.config.js`](Extension-frontend/tailwind.config.js) | **TailwindCSS configuration**. Custom theme, colors, and utility extensions. |
| [`postcss.config.js`](Extension-frontend/postcss.config.js) | PostCSS configuration for CSS processing. |
| [`eslint.config.js`](Extension-frontend/eslint.config.js) | ESLint rules for code quality. |
| [`index.html`](Extension-frontend/index.html) | **HTML entry point**. Root HTML file that loads the React app. |
| [`vercel.json`](Extension-frontend/vercel.json) | **Vercel deployment configuration**. Routing rules and build settings for Vercel hosting. |

### Environment Files

| File | Responsibility |
|------|----------------|
| `.env.development` | Development environment variables (e.g., `VITE_API_BASE_URL=http://localhost:5000/api`). |
| `.env.production` | Production environment variables (e.g., Render backend URL). |

---

### 📂 `src/` - Source Code

| File | Responsibility |
|------|----------------|
| [`src/main.jsx`](Extension-frontend/src/main.jsx) | **React entry point**. Renders the root `App` component into the DOM. |
| [`src/App.jsx`](Extension-frontend/src/App.jsx) | **Main application component**. Contains the entire app layout including navigation tabs (Dashboard/Chat), backend health checking, and content rendering logic. |
| [`src/App.css`](Extension-frontend/src/App.css) | Component-specific styles for App. |
| [`src/index.css`](Extension-frontend/src/index.css) | **Global styles**. TailwindCSS imports and base styles. |

---

### 📂 `src/components/` - React Components

#### Chat Components (`src/components/Chat/`)

| File | Responsibility |
|------|----------------|
| `ChatWindow.jsx` | **Main chat interface**. Displays messages, handles user input, sends messages to backend, and renders AI responses. |
| `ChatHistory.jsx` | **Chat history sidebar**. Shows previous conversations and allows navigation between chat sessions. |

#### Dashboard Components (`src/components/Dashboard/`)

| File | Responsibility |
|------|----------------|
| `StatsCard.jsx` | **Statistics display cards**. Reusable component for showing metrics like page visits, interactions, etc. |
| `ActivityChart.jsx` | **Activity visualization**. Chart.js-based graphs showing browsing patterns over time. |
| `RecentActivity.jsx` | **Activity feed**. Lists recent browsing activities with timestamps. |
| `DomainBreakdown.jsx` | **Domain analytics**. Shows which websites were visited most frequently. |

#### Common Components (`src/components/Common/`)

| File | Responsibility |
|------|----------------|
| `Header.jsx` | Application header/navigation bar. |
| `Sidebar.jsx` | Side navigation component. |
| `Loading.jsx` | Loading spinner/indicator component. |
| `ErrorBoundary.jsx` | React error boundary for graceful error handling. |

---

### 📂 `src/services/` - API Services

| File | Responsibility |
|------|----------------|
| [`src/services/api.js`](Extension-frontend/src/services/api.js) | **API client and services**. Central module containing: |

```javascript
// Axios instance with interceptors
api - Configured axios instance with base URL, timeout, and error handling

// Chat Service
chatService.sendMessage(message)     - Send chat message to AI
chatService.getChatHistory(limit)    - Get user's chat history
chatService.testConnection()         - Test backend connectivity

// Tracking Service  
trackingService.trackActivity(data)  - Log browser activity
trackingService.getDailySummary()    - Get daily statistics
trackingService.trackPageVisit()     - Track page visits
trackingService.trackInteraction()   - Track user interactions

// Health Service
healthService.checkBackend()         - Check backend health status

// Utilities
utils.getUserId()                    - Get/generate user ID
utils.getSessionId()                 - Get/generate session ID
utils.formatTime(timestamp)          - Format timestamps
utils.truncateText(text, length)     - Truncate long text
```

| File | Responsibility |
|------|----------------|
| [`src/services/dashboardService.js`](Extension-frontend/src/services/dashboardService.js) | **Dashboard data service**. Specialized service for fetching and transforming dashboard analytics data. |

---

### 📂 `src/styles/` - Stylesheets

| File | Responsibility |
|------|----------------|
| `components.css` | Shared component styles. |

### 📂 `src/assets/` - Static Assets

Contains images, icons, and other static files used in the application.

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   App.jsx    │───▶│  Components  │───▶│   api.js     │      │
│  │  (Router)    │    │  (UI Layer)  │    │  (Services)  │      │
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
                    │  SQLite/PostgreSQL│
                    │    (Database)     │
                    └──────────────────┘
```

---

## 🚀 Deployment Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│      VERCEL         │         │       RENDER        │
│  (Frontend Host)    │  HTTP   │   (Backend Host)    │
│                     │◀───────▶│                     │
│  - Static files     │         │  - Flask API        │
│  - React SPA        │         │  - PostgreSQL DB    │
│  - CDN delivery     │         │  - Gemini AI        │
└─────────────────────┘         └─────────────────────┘
```

---

## 📝 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/chat/send` | Send message to AI |
| `GET` | `/api/chat/history/<user_id>` | Get chat history |
| `GET` | `/api/chat/test` | Test Gemini connection |
| `POST` | `/api/track/activity` | Log browser activity |
| `GET` | `/api/track/summary/<user_id>` | Get daily summary |

---

## 🔐 Environment Variables

### Backend (`.env`)
```bash
# Database
DATABASE_URL=postgresql://...      # Production DB (Render)
USE_SQLITE=true                    # Use SQLite locally

# AI
GEMINI_API_KEY=your_api_key        # Google Gemini API key
GEMINI_MODEL=gemini-1.5-flash      # Model to use

# Security
SECRET_KEY=your_secret_key         # Flask secret key
CORS_ORIGINS=http://localhost:3000 # Allowed origins
```

### Frontend (`.env.development` / `.env.production`)
```bash
VITE_API_BASE_URL=http://localhost:5000/api  # Backend URL
```

---

*Last Updated: December 23, 2025*
