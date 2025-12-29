# Website & Tab Tracking Feature

## Overview

The Website Tracking feature monitors and records user browsing activity within Chrome/Edge browsers. It tracks website visits, tab switches, time spent on pages, and provides analytics dashboards to visualize browsing patterns.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER EXTENSION                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐     ┌─────────────────────────────────┐   │
│  │  background.js  │────▶│  Chrome Tabs API                │   │
│  │  (Service Worker)│     │  • onActivated (tab switch)    │   │
│  │                 │     │  • onUpdated (URL change)       │   │
│  └────────┬────────┘     └─────────────────────────────────┘   │
│           │                                                      │
│           │ POST /api/tracking/log                               │
│           ▼                                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              TrackingDashboard.jsx                         │ │
│  │  • Shows visit history                                     │ │
│  │  • Analytics (top domains, visits by hour)                │ │
│  │  • Time tracked per domain                                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FLASK BACKEND                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  tracking.py (Routes)                    │   │
│  │  • POST /api/tracking/log - Log visits                  │   │
│  │  • GET  /api/tracking/history/<user_id>                 │   │
│  │  • GET  /api/tracking/analytics/<user_id>               │   │
│  │  • POST /api/tracking/update-duration                   │   │
│  └────────────────────────────────────────────────────────┐│   │
│                              │                              │   │
│                              ▼                              │   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 SQLite Database                          │   │
│  │  Table: website_visits                                   │   │
│  │  • id, user_id, url, domain, title                      │   │
│  │  • event_type, tab_id, window_id                        │   │
│  │  • duration_seconds, timestamp                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Background Service Worker (`background.js`)

**Location:** `Extension-frontend/public/background.js`

The service worker runs in the background and listens for browser events:

#### Events Tracked:
| Event | Chrome API | Description |
|-------|-----------|-------------|
| Tab Switch | `chrome.tabs.onActivated` | User switches to a different tab |
| URL Change | `chrome.tabs.onUpdated` | Page navigation within active tab |
| Extension Start | `chrome.runtime.onStartup` | Browser opens with extension |
| Extension Install | `chrome.runtime.onInstalled` | Extension installed/updated |

#### Key Functions:

```javascript
// Check if URL should be tracked (excludes chrome://, file://, etc.)
function shouldTrackUrl(url) { ... }

// Extract domain from URL (e.g., "google.com" from "https://google.com/search")
function extractDomain(url) { ... }

// Send visit data to backend
async function logVisit(data) { ... }

// Track time spent on previous page before switching
async function updatePreviousVisitDuration() { ... }
```

#### Excluded URLs:
- `chrome://` (browser internal pages)
- `chrome-extension://` (extension pages)
- `edge://` (Edge browser pages)
- `about:` (about pages)
- `file://` (local files)
- `devtools://` (developer tools)

---

### 2. Database Model (`models.py`)

**Location:** `Extension/database/models.py`

```python
class WebsiteVisit(db.Model):
    __tablename__ = 'website_visits'
    
    id              # Primary key
    user_id         # Foreign key to users table
    url             # Full page URL
    domain          # Extracted domain for grouping
    title           # Page title
    favicon_url     # Page favicon
    event_type      # 'page_visit', 'tab_switch', 'url_change'
    tab_id          # Browser tab ID
    window_id       # Browser window ID
    duration_seconds # Time spent on page
    timestamp       # When visit occurred
```

---

### 3. API Routes (`tracking.py`)

**Location:** `Extension/routes/tracking.py`

#### Endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tracking/log` | Log a new website visit |
| GET | `/api/tracking/history/<user_id>` | Get visit history |
| GET | `/api/tracking/analytics/<user_id>` | Get aggregated analytics |
| POST | `/api/tracking/update-duration` | Update time spent on a visit |

#### Request/Response Examples:

**POST /api/tracking/log**
```json
// Request
{
  "user_id": "user_12345",
  "url": "https://github.com/trending",
  "domain": "github.com",
  "title": "Trending repositories",
  "event_type": "page_visit",
  "tab_id": 123,
  "window_id": 1
}

// Response
{
  "success": true,
  "visit_id": 42,
  "domain": "github.com",
  "timestamp": "2025-12-29T14:30:00Z"
}
```

**GET /api/tracking/analytics/<user_id>?days=7**
```json
{
  "success": true,
  "analytics": {
    "period_days": 7,
    "total_visits": 156,
    "unique_domains": 23,
    "total_duration_seconds": 7200,
    "total_duration_formatted": "2h 0m",
    "top_domains": [
      {"domain": "github.com", "visits": 45, "duration_formatted": "45m 30s"},
      {"domain": "stackoverflow.com", "visits": 32, "duration_formatted": "30m 15s"}
    ],
    "visits_by_hour": [
      {"hour": "09", "count": 12},
      {"hour": "10", "count": 18}
    ]
  }
}
```

---

### 4. Frontend Dashboard (`TrackingDashboard.jsx`)

**Location:** `Extension-frontend/src/components/Tracking/TrackingDashboard.jsx`

#### Features:

1. **Overview Tab**
   - Total visits count
   - Unique domains count
   - Total time tracked
   - Top visited domains (with bar chart)
   - Activity by hour (hourly chart)

2. **History Tab**
   - Chronological list of all visits
   - Favicon, title, domain, timestamp
   - Duration per page
   - Link to open URL

#### Period Filters:
- Today
- Last 7 days
- Last 14 days
- Last 30 days

---

### 5. Tracking Service (`api.js`)

**Location:** `Extension-frontend/src/services/api.js`

```javascript
export const trackingService = {
  // Get visit history
  getHistory: async (limit, offset, domain) => { ... },
  
  // Get analytics data
  getAnalytics: async (days) => { ... },
  
  // Log a visit (used for manual logging)
  logVisit: async (data) => { ... }
};
```

---

## Data Flow

### When User Visits a Website:

1. **Tab Event Fires**
   ```
   User navigates to google.com
        │
        ▼
   chrome.tabs.onUpdated fires (status: 'complete')
   ```

2. **Background Script Processes**
   ```
   handlePageVisit() called
        │
        ├── Update duration of previous page
        │
        ├── Extract domain from URL
        │
        └── Call logVisit() with data
   ```

3. **API Request Sent**
   ```
   POST /api/tracking/log
   {
     user_id: "user_123",
     url: "https://google.com",
     domain: "google.com",
     title: "Google",
     event_type: "url_change"
   }
   ```

4. **Backend Stores Data**
   ```
   tracking.py receives request
        │
        ├── Validate data
        │
        ├── Create/get user
        │
        └── Insert into website_visits table
   ```

5. **Dashboard Displays**
   ```
   TrackingDashboard loads
        │
        ├── GET /api/tracking/analytics
        │
        ├── GET /api/tracking/history
        │
        └── Render charts and lists
   ```

---

## Manifest Permissions

**Location:** `Extension-frontend/public/manifest.json`

```json
{
  "permissions": [
    "storage",    // Store user ID locally
    "tabs",       // Access tab info (URL, title)
    "activeTab"   // Access current active tab
  ],
  "host_permissions": [
    "http://localhost:5000/*",  // Backend API
    "<all_urls>"                // Track all websites
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

---

## User ID Synchronization

The extension uses two storage mechanisms that need to stay in sync:

| Component | Storage | Purpose |
|-----------|---------|---------|
| background.js | `chrome.storage.local` | Background script access |
| Frontend (api.js) | `localStorage` | React app access |

**Sync Mechanism:**
When the TrackingDashboard loads, it sends the frontend's user ID to the background script:

```javascript
// In TrackingDashboard.jsx
chrome.runtime.sendMessage({ 
  type: 'SYNC_USER_ID', 
  userId: utils.getUserId() 
});
```

---

## Debugging

### Check Service Worker Logs:
1. Go to `chrome://extensions`
2. Find "SalesHub AI"
3. Click "service worker" link
4. Check Console for `[Tracking]` logs

### Expected Logs:
```
[Tracking] 🚀 Background service worker initialized
[Tracking] Tab activated: 123
[Tracking] Processing: tab_switch https://google.com
[Tracking] ✅ Logged successfully: tab_switch google.com Visit ID: 42
```

### Test API Manually:
```powershell
# Log a visit
Invoke-RestMethod -Method POST -Uri "http://localhost:5000/api/tracking/log" `
  -ContentType "application/json" `
  -Body '{"user_id":"test","url":"https://test.com","domain":"test.com","event_type":"page_visit"}'

# Get analytics
Invoke-RestMethod -Uri "http://localhost:5000/api/tracking/analytics/test?days=7"
```

---

## File Structure

```
Extension/
├── database/
│   └── models.py          # WebsiteVisit model
└── routes/
    └── tracking.py        # API routes

Extension-frontend/
├── public/
│   ├── manifest.json      # Extension permissions
│   └── background.js      # Service worker
└── src/
    ├── services/
    │   └── api.js         # trackingService
    └── components/
        └── Tracking/
            ├── TrackingDashboard.jsx
            └── TrackingDashboard.css
```

---

## Future Enhancements

- [ ] Export tracking data (CSV/JSON)
- [ ] Category-based domain grouping
- [ ] Productivity scoring
- [ ] Daily/weekly email reports
- [ ] Block certain domains from tracking
- [ ] Pause/resume tracking
