/**
 * Background Service Worker for Website Tracking
 * Robust domain-based tracking with deduplication and debouncing
 */

const API_BASE_URL = 'http://localhost:5000/api';

// ==================== State Management ====================
let currentVisit = null;
let visitStartTime = null;
let cachedUserId = null;
let lastLoggedDomain = null;
let lastLoggedTime = 0;
let debounceTimer = null;

// Configuration
const DEDUP_WINDOW_MS = 5000;  // 5 seconds - longer window for slow sites
const DEBOUNCE_DELAY_MS = 1000; // 1 second - wait for page to stabilize

// ==================== Persistence ====================
async function persistVisitData() {
    if (currentVisit && visitStartTime) {
        await chrome.storage.local.set({
            currentVisit: currentVisit,
            visitStartTime: visitStartTime,
            lastLoggedDomain: lastLoggedDomain
        });
    }
}

async function loadPersistedVisitData() {
    try {
        const data = await chrome.storage.local.get(['currentVisit', 'visitStartTime', 'lastLoggedDomain']);
        if (data.currentVisit && data.visitStartTime) {
            currentVisit = data.currentVisit;
            visitStartTime = data.visitStartTime;
            lastLoggedDomain = data.lastLoggedDomain || null;
            console.log('[Tracking] ✓ Restored visit data from storage');
        }
    } catch (error) {
        console.log('[Tracking] Could not restore visit data:', error.message);
    }
}

// ==================== User ID Management ====================
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
                const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                chrome.storage.local.set({ extension_user_id: userId });
                cachedUserId = userId;
                console.log('[Tracking] Generated new user ID:', userId);
                resolve(userId);
            }
        });
    });
}

// ==================== URL Utilities ====================
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return url ? url.substring(0, 50) : 'unknown';
    }
}

function shouldTrackUrl(url) {
    if (!url) return false;
    const excludedPrefixes = [
        'chrome://',
        'chrome-extension://',
        'edge://',
        'about:',
        'moz-extension://',
        'file://',
        'devtools://',
        'chrome-search://'
    ];
    return !excludedPrefixes.some(prefix => url.startsWith(prefix));
}

// ==================== API Calls ====================
async function logVisit(data) {
    try {
        const userId = await getUserId();
        const payload = {
            user_id: userId,
            ...data,
            timestamp: new Date().toISOString()
        };

        console.log('[Tracking] 📤 Sending to API:', payload.domain);

        const response = await fetch(`${API_BASE_URL}/tracking/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('[Tracking] ✅ Logged:', data.domain, '| Visit ID:', result.visit_id);
            return result;
        } else {
            const errorText = await response.text();
            console.error('[Tracking] ❌ API error:', response.status, errorText);
        }
    } catch (error) {
        console.error('[Tracking] ❌ Network error:', error.message);
    }
    return null;
}

async function updateDuration(visitId, duration) {
    if (!visitId || duration <= 0 || duration >= 86400) return;

    try {
        const response = await fetch(`${API_BASE_URL}/tracking/update-duration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                visit_id: visitId,
                duration_seconds: duration
            })
        });
        if (response.ok) {
            console.log('[Tracking] ⏱️ Duration updated:', duration, 'seconds');
        }
    } catch (error) {
        console.error('[Tracking] Error updating duration:', error.message);
    }
}

// Update duration for previous visit
async function finalizePreviousVisit() {
    if (currentVisit && currentVisit.visit_id && visitStartTime) {
        const duration = Math.round((Date.now() - visitStartTime) / 1000);
        await updateDuration(currentVisit.visit_id, duration);
    }
}

// ==================== Core Tracking Logic ====================
async function trackDomainVisit(tab, eventType = 'page_visit') {
    if (!tab || !tab.url) {
        console.log('[Tracking] ⏭️ Skipped: no tab or URL');
        return;
    }

    if (!shouldTrackUrl(tab.url)) {
        console.log('[Tracking] ⏭️ Skipped (excluded):', tab.url.substring(0, 40));
        return;
    }

    const domain = extractDomain(tab.url);
    const now = Date.now();

    // SAME DOMAIN - Don't create new entry, just continue tracking time
    if (domain === lastLoggedDomain) {
        console.log('[Tracking] ⏭️ Same domain, continuing time tracking:', domain);
        // Update the last logged time to prevent stale state
        lastLoggedTime = now;
        return;
    }

    // DIFFERENT DOMAIN - Create new entry
    console.log('[Tracking] 🔍 New domain:', domain, '(was:', lastLoggedDomain || 'none', ')');

    // Finalize previous visit duration before switching
    await finalizePreviousVisit();

    // Log the new visit
    const result = await logVisit({
        url: tab.url,
        domain: domain,
        title: tab.title || domain,
        event_type: eventType,
        tab_id: tab.id,
        window_id: tab.windowId,
        favicon_url: tab.favIconUrl || ''
    });

    // Update state
    lastLoggedDomain = domain;
    lastLoggedTime = now;
    currentVisit = result;
    visitStartTime = now;

    // Persist for service worker restarts
    await persistVisitData();
}

// Debounced handler - waits for page to stabilize
function debouncedTrackVisit(tab) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        await trackDomainVisit(tab, 'page_visit');
    }, DEBOUNCE_DELAY_MS);
}

// ==================== Event Listeners ====================

// Tab switched - user clicked on different tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    console.log('[Tracking] 🔄 Tab switched:', activeInfo.tabId);
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        const domain = extractDomain(tab.url);

        // Only track if switching to different domain
        if (domain !== lastLoggedDomain) {
            await trackDomainVisit(tab, 'tab_switch');
        } else {
            // Same domain - just reset timer for accurate duration
            visitStartTime = Date.now();
            console.log('[Tracking] ⏭️ Same domain, resetting timer');
        }
    } catch (error) {
        console.error('[Tracking] Error on tab activation:', error.message);
    }
});

// URL changed within tab - navigation or SPA route change
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only react to completed page loads
    if (changeInfo.status !== 'complete' || !tab.url) return;

    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id === tabId) {
            // Use debouncing for URL changes to avoid duplicate logs
            debouncedTrackVisit(tab);
        }
    } catch (error) {
        console.error('[Tracking] Error on URL update:', error.message);
    }
});

// Extension startup
chrome.runtime.onStartup.addListener(async () => {
    console.log('[Tracking] 🚀 Extension startup');
    await loadPersistedVisitData();
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && shouldTrackUrl(tab.url)) {
            await trackDomainVisit(tab);
        }
    } catch (error) {
        console.error('[Tracking] Error on startup:', error.message);
    }
});

// Extension installed/updated
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('[Tracking] 📦 Extension installed/updated:', details.reason);
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && shouldTrackUrl(tab.url)) {
            await trackDomainVisit(tab);
        }
    } catch (error) {
        console.error('[Tracking] Error on install:', error.message);
    }
});

// Keep service worker alive and periodically update duration
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'keepAlive' && currentVisit && visitStartTime) {
        const duration = Math.round((Date.now() - visitStartTime) / 1000);
        console.log('[Tracking] 💓 Heartbeat - active for', duration, 'seconds on', lastLoggedDomain);

        // Update duration in database periodically
        await updateDuration(currentVisit.visit_id, duration);
        await persistVisitData();
    }
});

// ==================== Message Handlers ====================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_TRACKING_STATUS') {
        getUserId().then(userId => {
            sendResponse({
                active: true,
                userId: userId,
                currentVisit: currentVisit,
                visitStartTime: visitStartTime,
                lastLoggedDomain: lastLoggedDomain
            });
        });
        return true;
    }

    if (message.type === 'SYNC_USER_ID') {
        if (message.userId) {
            cachedUserId = message.userId;
            chrome.storage.local.set({ extension_user_id: message.userId });
            console.log('[Tracking] 🔗 Synced user ID from frontend:', message.userId);
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

// ==================== Initialization ====================
console.log('[Tracking] 🚀 Background service worker initialized (Robust Mode)');

(async () => {
    await loadPersistedVisitData();
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && shouldTrackUrl(tab.url)) {
            console.log('[Tracking] 📍 Initial tab:', extractDomain(tab.url));
            await trackDomainVisit(tab);
        }
    } catch (error) {
        console.log('[Tracking] Could not get initial tab:', error.message);
    }
})();
