/**
 * Content Script for HubSpot Deal Detection
 * Minimal script that extracts deal ID from URL only (no DOM scraping)
 * Sends deal ID to background script for API-based data fetching
 */

(function () {
    'use strict';

    // Match all HubSpot regional subdomains
    const HUBSPOT_DEAL_URL_PATTERN = /app(-[a-z0-9]+)?\.hubspot\.com\/contacts\/\d+\/record\/0-3\/(\d+)/;
    const CONTEXT_UPDATE_DEBOUNCE = 1000; // 1 second

    let lastDealId = null;
    let debounceTimer = null;

    /**
     * Extract deal ID from URL
     * @returns {string|null} Deal ID or null if not on deal page
     */
    function extractDealId() {
        const match = window.location.href.match(HUBSPOT_DEAL_URL_PATTERN);
        return match ? match[2] : null;
    }

    /**
     * Check if current page is a HubSpot deal page
     * @returns {boolean}
     */
    function isHubSpotDealPage() {
        return HUBSPOT_DEAL_URL_PATTERN.test(window.location.href);
    }

    /**
     * Send deal context to background script
     * @param {string|null} dealId 
     */
    function sendDealIdToBackground(dealId) {
        try {
            chrome.runtime.sendMessage({
                type: 'HUBSPOT_DEAL_ID',
                dealId: dealId,
                url: window.location.href
            }, response => {
                if (chrome.runtime.lastError) {
                    // Extension might be reloading, ignore error
                    console.log('[HubSpot] Could not send deal ID:', chrome.runtime.lastError.message);
                } else if (response && response.received) {
                    console.log('[HubSpot] Deal ID sent:', dealId);
                }
            });
        } catch (error) {
            // Silently fail - extension might be reloading
            console.log('[HubSpot] Error sending deal ID:', error.message);
        }
    }

    /**
     * Debounced context update
     */
    function debouncedUpdate() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const dealId = extractDealId();

            // Only send if deal ID changed
            if (dealId !== lastDealId) {
                lastDealId = dealId;

                if (dealId) {
                    console.log('[HubSpot] Deal page detected:', dealId);
                    sendDealIdToBackground(dealId);
                } else {
                    console.log('[HubSpot] Not on deal page, clearing context');
                    sendDealIdToBackground(null);
                }
            }
        }, CONTEXT_UPDATE_DEBOUNCE);
    }

    /**
     * Initialize the detector
     */
    function init() {
        console.log('[HubSpot] Deal detector initialized');
        console.log('[HubSpot] Current URL:', window.location.href);

        // Initial check
        debouncedUpdate();

        // Watch for SPA navigation using URL monitoring
        let lastUrl = window.location.href;

        // Check URL periodically (HubSpot uses History API)
        setInterval(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                console.log('[HubSpot] URL changed:', lastUrl);
                debouncedUpdate();
            }
        }, 500);

        // Also listen for popstate
        window.addEventListener('popstate', () => {
            console.log('[HubSpot] Popstate event');
            debouncedUpdate();
        });

        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                debouncedUpdate();
            }
        });
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
