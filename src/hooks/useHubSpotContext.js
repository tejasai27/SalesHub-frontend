/**
 * useHubSpotContext Hook
 * Fetches HubSpot deal context from background script and API
 */
import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Generate dynamic prompts based on deal data
 */
function generateDynamicPrompts(deal) {
    if (!deal) return null;

    const prompts = [];

    // Always add summarize prompt if we have a deal
    if (deal.name) {
        prompts.push({
            emoji: "📋",
            text: "Summarize this deal",
            category: "Summary",
            contextHint: deal.name.substring(0, 30)
        });
    }

    // Stage-based prompts
    if (deal.stage) {
        const stageLower = deal.stage.toLowerCase();

        if (stageLower.includes('qualified') || stageLower.includes('discovery') || stageLower.includes('contact')) {
            prompts.push({
                emoji: "🔍",
                text: "Discovery questions to ask",
                category: "Discovery",
                contextHint: deal.stage
            });
        } else if (stageLower.includes('proposal') || stageLower.includes('quote')) {
            prompts.push({
                emoji: "📄",
                text: "Proposal talking points",
                category: "Proposal",
                contextHint: deal.stage
            });
        } else if (stageLower.includes('negotiation') || stageLower.includes('contract')) {
            prompts.push({
                emoji: "🤝",
                text: "Negotiation strategies",
                category: "Negotiation",
                contextHint: deal.stage
            });
        } else if (stageLower.includes('closed') || stageLower.includes('won')) {
            prompts.push({
                emoji: "🎉",
                text: "Draft onboarding email",
                category: "Onboarding",
                contextHint: deal.stage
            });
        }
    }

    // Contact-based prompts
    if (deal.contacts && deal.contacts.length > 0) {
        prompts.push({
            emoji: "👤",
            text: "Draft personalized outreach",
            category: "Contact",
            contextHint: deal.contacts[0].name || "Contact"
        });
    }

    // Activity-based prompts
    if (deal.activities && deal.activities.length > 0) {
        prompts.push({
            emoji: "📊",
            text: "Summarize recent activities",
            category: "Activities",
            contextHint: `${deal.activities.length} activities`
        });
    }

    // Generic deal prompts
    prompts.push({
        emoji: "🎯",
        text: "Suggest next steps",
        category: "Strategy",
        contextHint: deal.stage || "Deal"
    });

    prompts.push({
        emoji: "💡",
        text: "Handle potential objections",
        category: "Objection",
        contextHint: "For this deal"
    });

    // Limit to 6 prompts
    return prompts.slice(0, 6);
}

/**
 * Hook to get HubSpot deal context
 * Does NOT auto-fetch deal data - user must call fetchDeal()
 */
export function useHubSpotContext() {
    const [dealId, setDealId] = useState(null);
    const [deal, setDeal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dynamicPrompts, setDynamicPrompts] = useState(null);
    const [fetched, setFetched] = useState(false); // Track if user has fetched

    // Poll for deal ID from background script
    const fetchDealId = useCallback(async () => {
        try {
            if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                return null;
            }

            return new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_HUBSPOT_DEAL_ID' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log('[useHubSpotContext] Error:', chrome.runtime.lastError.message);
                        resolve(null);
                        return;
                    }
                    resolve(response?.dealId || null);
                });
            });
        } catch (err) {
            console.log('[useHubSpotContext] Fetch error:', err.message);
            return null;
        }
    }, []);

    // Fetch deal data from API - called manually by user
    const fetchDealData = useCallback(async (id) => {
        if (!id) {
            setDeal(null);
            setDynamicPrompts(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/hubspot/deals/${id}`);
            const data = await response.json();

            if (data.success && data.deal) {
                setDeal(data.deal);
                setDynamicPrompts(generateDynamicPrompts(data.deal));
                setFetched(true);
            } else {
                setError(data.error || 'Failed to fetch deal');
                setDeal(null);
                setDynamicPrompts(null);
            }
        } catch (err) {
            console.error('[useHubSpotContext] API error:', err);
            setError(err.message);
            setDeal(null);
            setDynamicPrompts(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll for deal ID changes (but don't auto-fetch data)
    useEffect(() => {
        let isMounted = true;

        const checkDealId = async () => {
            const newDealId = await fetchDealId();

            if (!isMounted) return;

            if (newDealId !== dealId) {
                setDealId(newDealId);
                // Reset fetch state when deal changes
                setFetched(false);
                setDeal(null);
                setDynamicPrompts(null);
            }
        };

        // Initial check
        checkDealId();

        // Poll every 3 seconds
        const interval = setInterval(checkDealId, 3000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [dealId, fetchDealId]);

    // Manual fetch function for user to call
    const fetchDeal = useCallback(() => {
        if (dealId) {
            fetchDealData(dealId);
        }
    }, [dealId, fetchDealData]);

    return {
        dealId,
        deal,
        loading,
        error,
        dynamicPrompts,
        fetched,
        hasDealId: !!dealId, // True when on a HubSpot deal page
        isHubSpotDeal: !!deal, // True when deal data is loaded
        dealName: deal?.name || null,
        dealStage: deal?.stage || null,
        fetchDeal, // Manual fetch function
        refresh: () => fetchDealData(dealId)
    };
}

export default useHubSpotContext;

