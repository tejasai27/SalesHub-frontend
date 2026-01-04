/**
 * Content Script for Activity Detection
 * Monitors user interactions and reports to background script
 */

(function () {
    'use strict';

    // Configuration
    const THROTTLE_MS = 5000;  // Report activity at most every 5 seconds
    const IDLE_THRESHOLD_MS = 60000;  // Consider idle after 60 seconds

    let lastActivityTime = Date.now();
    let lastReportTime = 0;
    let isIdle = false;

    /**
     * Report activity to background script (throttled)
     */
    function reportActivity() {
        const now = Date.now();
        lastActivityTime = now;

        // If was idle, report immediately
        if (isIdle) {
            isIdle = false;
            sendActivityMessage();
            return;
        }

        // Throttle: only report every THROTTLE_MS
        if (now - lastReportTime >= THROTTLE_MS) {
            sendActivityMessage();
        }
    }

    /**
     * Send activity message to background script
     */
    function sendActivityMessage() {
        lastReportTime = Date.now();
        try {
            chrome.runtime.sendMessage({
                type: 'ACTIVITY_DETECTED',
                timestamp: lastReportTime,
                url: window.location.href
            });
        } catch (error) {
            // Extension context may be invalidated, silently fail
        }
    }

    /**
     * Check for idle state
     */
    function checkIdleState() {
        const now = Date.now();
        if (now - lastActivityTime >= IDLE_THRESHOLD_MS && !isIdle) {
            isIdle = true;
            try {
                chrome.runtime.sendMessage({
                    type: 'USER_IDLE',
                    timestamp: now,
                    url: window.location.href
                });
            } catch (error) {
                // Silently fail
            }
        }
    }

    // Activity event listeners (passive for performance)
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach(eventType => {
        document.addEventListener(eventType, reportActivity, { passive: true, capture: true });
    });

    // Periodic idle check
    setInterval(checkIdleState, 10000);  // Check every 10 seconds

    // Initial activity report when page loads
    setTimeout(() => {
        reportActivity();
    }, 1000);

    // Report when page becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            reportActivity();
        }
    });

    console.log('[Activity Tracker] Initialized on:', window.location.hostname);
})();
