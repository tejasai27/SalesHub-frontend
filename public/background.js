/**
 * Background Service Worker for Website Tracking
 * Tracks tab switches, URL changes, and time spent on pages
 */

const API_BASE_URL = 'http://localhost:5000/api';

// Track the current active tab and visit
let currentVisit = null;
let visitStartTime = null;
let cachedUserId = null;

// Persist visit data to chrome.storage for service worker restarts
async function persistVisitData() {
    if (currentVisit && visitStartTime) {
        await chrome.storage.local.set({
            currentVisit: currentVisit,
            visitStartTime: visitStartTime
        });
    }
}

// Load persisted visit data on startup
async function loadPersistedVisitData() {
    try {
        const data = await chrome.storage.local.get(['currentVisit', 'visitStartTime']);
        if (data.currentVisit && data.visitStartTime) {
            currentVisit = data.currentVisit;
            visitStartTime = data.visitStartTime;
            console.log('[Tracking] Restored visit data from storage');
        }
    } catch (error) {
        console.log('[Tracking] Could not restore visit data:', error.message);
    }
}

// Get user ID - sync with frontend localStorage via message passing
async function getUserId() {
    if (cachedUserId) {
        return cachedUserId;
    }

    return new Promise((resolve) => {
        chrome.storage.local.get(['extension_user_id'], (result) => {
            if (result.extension_user_id) {
                cachedUserId = result.extension_user_id;
                resolve(cachedUserId);
            } else {
                // Generate a new one and store it
                const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                chrome.storage.local.set({ extension_user_id: userId });
                cachedUserId = userId;
                console.log('[Tracking] Generated new user ID:', userId);
                resolve(userId);
            }
        });
    });
}

// Extract domain from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url ? url.substring(0, 50) : 'unknown';
    }
}

// Check if URL should be tracked (exclude chrome:// and extension pages)
function shouldTrackUrl(url) {
    if (!url) return false;
    const excludedPrefixes = [
        'chrome://',
        'chrome-extension://',
        'edge://',
        'about:',
        'moz-extension://',
        'file://',
        'devtools://'
    ];
    return !excludedPrefixes.some(prefix => url.startsWith(prefix));
}

// Send tracking data to backend
async function logVisit(data) {
    try {
        const userId = await getUserId();
        const payload = {
            user_id: userId,
            ...data,
            timestamp: new Date().toISOString()
        };

        console.log('[Tracking] Sending to API:', payload);

        const response = await fetch(`${API_BASE_URL}/tracking/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('[Tracking] ✅ Logged successfully:', data.event_type, data.domain || extractDomain(data.url), 'Visit ID:', result.visit_id);
            return result;
        } else {
            const errorText = await response.text();
            console.error('[Tracking] ❌ API error:', response.status, errorText);
        }
    } catch (error) {
        console.error('[Tracking] ❌ Network error logging visit:', error.message);
    }
    return null;
}

// Update duration for previous visit
async function updatePreviousVisitDuration() {
    if (currentVisit && currentVisit.visit_id && visitStartTime) {
        const duration = Math.round((Date.now() - visitStartTime) / 1000);

        // Only update if duration is reasonable (> 0 and < 24 hours)
        if (duration > 0 && duration < 86400) {
            try {
                const response = await fetch(`${API_BASE_URL}/tracking/update-duration`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        visit_id: currentVisit.visit_id,
                        duration_seconds: duration
                    })
                });
                if (response.ok) {
                    console.log('[Tracking] Updated duration:', duration, 'seconds for visit', currentVisit.visit_id);
                }
            } catch (error) {
                console.error('[Tracking] Error updating duration:', error.message);
            }
        } else if (duration >= 86400) {
            console.log('[Tracking] Skipping duration update - too long (> 24h):', duration);
        }
    }
}

// Track last logged URL to prevent duplicates
let lastLoggedUrl = null;
let lastLoggedTime = 0;
const DEDUP_WINDOW_MS = 2000; // 2 seconds window to prevent duplicate logs

// Handle new page visit
async function handlePageVisit(tab, eventType) {
    if (!tab || !tab.url) {
        console.log('[Tracking] Skipped: no tab or URL');
        return;
    }

    if (!shouldTrackUrl(tab.url)) {
        console.log('[Tracking] Skipped (excluded URL):', tab.url.substring(0, 50));
        return;
    }

    // Deduplication: Skip if same URL was logged recently
    const now = Date.now();
    if (tab.url === lastLoggedUrl && (now - lastLoggedTime) < DEDUP_WINDOW_MS) {
        console.log('[Tracking] Skipped (duplicate within 2s):', tab.url.substring(0, 50));
        return;
    }

    console.log('[Tracking] Processing:', eventType, tab.url.substring(0, 80));

    // Update duration for previous visit
    await updatePreviousVisitDuration();

    // Log new visit
    const domain = extractDomain(tab.url);
    const result = await logVisit({
        url: tab.url,
        domain: domain,
        title: tab.title || '',
        event_type: eventType,
        tab_id: tab.id,
        window_id: tab.windowId,
        favicon_url: tab.favIconUrl || ''
    });

    // Update tracking state
    lastLoggedUrl = tab.url;
    lastLoggedTime = now;
    currentVisit = result;
    visitStartTime = now;

    // Persist to storage in case service worker restarts
    await persistVisitData();
}

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log('[Tracking] Tab activated:', activeInfo.tabId);
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        await handlePageVisit(tab, 'page_visit');
    } catch (error) {
        console.error('[Tracking] Error on tab activation:', error.message);
    }
});

// Listen for URL changes within a tab
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only track when page is complete (avoids duplicate tracking during loading)
    if (changeInfo.status === 'complete' && tab.url) {
        // Check if this is the active tab
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab && activeTab.id === tabId) {
                console.log('[Tracking] Page loaded in active tab:', tabId);
                await handlePageVisit(tab, 'page_visit');
            }
        } catch (error) {
            console.error('[Tracking] Error on URL update:', error.message);
        }
    }
});

// Track when extension starts - get current active tab
chrome.runtime.onStartup.addListener(async () => {
    console.log('[Tracking] Extension startup');
    await loadPersistedVisitData();
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await handlePageVisit(tab, 'page_visit');
        }
    } catch (error) {
        console.error('[Tracking] Error on startup:', error.message);
    }
});

// Also run on install/update
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Tracking] Extension installed/updated:', details.reason);
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await handlePageVisit(tab, 'page_visit');
        }
    } catch (error) {
        console.error('[Tracking] Error on install:', error.message);
    }
});

// Keep service worker alive with periodic alarm
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'keepAlive') {
        // Update duration for current visit periodically
        if (currentVisit && visitStartTime) {
            const duration = Math.round((Date.now() - visitStartTime) / 1000);
            console.log('[Tracking] Heartbeat - current page duration:', duration, 'seconds');

            // Persist current state
            await persistVisitData();
        }
    }
});

// Listen for messages from popup to sync user ID
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_TRACKING_STATUS') {
        getUserId().then(userId => {
            sendResponse({
                active: true,
                userId: userId,
                currentVisit: currentVisit,
                visitStartTime: visitStartTime
            });
        });
        return true; // Keep channel open for async response
    }

    if (message.type === 'SYNC_USER_ID') {
        // Frontend is sharing its user ID
        if (message.userId) {
            cachedUserId = message.userId;
            chrome.storage.local.set({ extension_user_id: message.userId });
            console.log('[Tracking] Synced user ID from frontend:', message.userId);
            sendResponse({ success: true });
        }
        return true;
    }

    if (message.type === 'GET_USER_ID') {
        getUserId().then(userId => {
            sendResponse({ userId: userId });
        });
        return true;
    }
});

// Initialize - log that we're ready
console.log('[Tracking] 🚀 Background service worker initialized');

// Load persisted data and track current tab
(async () => {
    await loadPersistedVisitData();
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && shouldTrackUrl(tab.url)) {
            console.log('[Tracking] Initial tab found:', tab.url.substring(0, 50));
            await handlePageVisit(tab, 'page_visit');
        }
    } catch (error) {
        console.log('[Tracking] Could not get initial tab:', error.message);
    }
})();
