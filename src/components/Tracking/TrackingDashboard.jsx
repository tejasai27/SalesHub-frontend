import React, { useState, useEffect } from "react";
import { trackingService, utils } from "../../services/api";
import {
    FiGlobe,
    FiClock,
    FiActivity,
    FiRefreshCw,
    FiExternalLink,
    FiTrendingUp,
    FiBarChart2
} from "react-icons/fi";
import "./TrackingDashboard.css";

const TrackingDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [periodDays, setPeriodDays] = useState(1);

    // Sync user ID with background script on mount
    useEffect(() => {
        syncUserIdToBackground();
        loadData();
    }, []);

    useEffect(() => {
        loadData();
    }, [periodDays]);

    // Sync user ID from frontend localStorage to background script's chrome.storage
    const syncUserIdToBackground = () => {
        const userId = utils.getUserId();
        if (chrome?.runtime?.sendMessage) {
            try {
                chrome.runtime.sendMessage(
                    { type: 'SYNC_USER_ID', userId: userId },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.log('[Tracking] Could not sync user ID:', chrome.runtime.lastError.message);
                        } else {
                            console.log('[Tracking] User ID synced to background:', userId);
                        }
                    }
                );
            } catch (error) {
                console.log('[Tracking] Error syncing user ID:', error);
            }
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [analyticsRes, historyRes] = await Promise.all([
                trackingService.getAnalytics(periodDays),
                trackingService.getHistory(50, 0, null, periodDays)
            ]);

            if (analyticsRes.success) {
                setAnalytics(analyticsRes.analytics);
            }
            if (historyRes.success) {
                setHistory(historyRes.history);
            }
        } catch (error) {
            console.error("Error loading tracking data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return "0s";
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) return `${hours}h ${mins}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return "";
        // Ensure timestamp is treated as UTC if no timezone indicator
        let ts = timestamp;
        if (!ts.endsWith('Z') && !ts.includes('+') && !ts.includes('-', 10)) {
            ts = ts + 'Z';
        }
        const date = new Date(ts);
        return date.toLocaleTimeString('en-IN', {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata"
        });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        // Ensure timestamp is treated as UTC if no timezone indicator
        let ts = timestamp;
        if (!ts.endsWith('Z') && !ts.includes('+') && !ts.includes('-', 10)) {
            ts = ts + 'Z';
        }
        const date = new Date(ts);
        return date.toLocaleDateString('en-IN', {
            month: "short",
            day: "numeric",
            timeZone: "Asia/Kolkata"
        });
    };

    const getDomainFavicon = (domain) => {
        // Use DuckDuckGo's favicon service - more reliable for most domains
        return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    };

    // Fallback icon when favicon fails to load
    const FallbackIcon = ({ domain }) => {
        const initial = domain ? domain.charAt(0).toUpperCase() : '?';
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'];
        const colorIndex = domain ? domain.charCodeAt(0) % colors.length : 0;
        return (
            <div
                className="favicon-fallback"
                style={{ backgroundColor: colors[colorIndex] }}
            >
                {initial}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="tracking-loading">
                <div className="loading-spinner"></div>
                <p>Loading tracking data...</p>
            </div>
        );
    }

    return (
        <div className="tracking-dashboard">
            {/* Header */}
            <div className="tracking-header">
                <div className="header-title">
                    <FiActivity className="header-icon" />
                    <h2>Website Tracking</h2>
                </div>
                <div className="header-actions">
                    <select
                        value={periodDays}
                        onChange={(e) => setPeriodDays(Number(e.target.value))}
                        className="period-select"
                    >
                        <option value={1}>Today</option>
                        <option value={7}>Last 7 days</option>
                        <option value={14}>Last 14 days</option>
                        <option value={30}>Last 30 days</option>
                    </select>
                    <button onClick={loadData} className="refresh-btn" title="Refresh">
                        <FiRefreshCw />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tracking-tabs">
                <button
                    className={`tab ${activeTab === "overview" ? "active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                >
                    <FiBarChart2 /> Overview
                </button>
                <button
                    className={`tab ${activeTab === "history" ? "active" : ""}`}
                    onClick={() => setActiveTab("history")}
                >
                    <FiClock /> History
                </button>
            </div>

            {activeTab === "overview" && analytics && (
                <div className="overview-content">
                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon visits">
                                <FiGlobe />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{analytics.total_visits || 0}</span>
                                <span className="stat-label">Total Visits</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon domains">
                                <FiTrendingUp />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{analytics.unique_domains || 0}</span>
                                <span className="stat-label">Unique Sites</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon time">
                                <FiClock />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{analytics.total_duration_formatted || "0s"}</span>
                                <span className="stat-label">Total Time</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon avg">
                                <FiBarChart2 />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">
                                    {analytics.total_visits > 0
                                        ? formatDuration(Math.round((analytics.total_duration_seconds || 0) / analytics.total_visits))
                                        : "0s"}
                                </span>
                                <span className="stat-label">Avg. per Visit</span>
                            </div>
                        </div>
                    </div>

                    {/* Top Domains */}
                    <div className="section">
                        <h3 className="section-title">Top Visited Domains</h3>
                        <div className="domains-list">
                            {analytics.top_domains && analytics.top_domains.length > 0 ? (
                                analytics.top_domains.map((domain, index) => (
                                    <div key={index} className="domain-item">
                                        <div className="domain-info">
                                            <img
                                                src={getDomainFavicon(domain.domain)}
                                                alt=""
                                                className="domain-favicon"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling && e.target.nextSibling.classList.remove('hidden');
                                                }}
                                            />
                                            <FallbackIcon domain={domain.domain} />
                                            <span className="domain-name">{domain.domain}</span>
                                        </div>
                                        <div className="domain-stats">
                                            <span className="visit-count">{domain.visits} visits</span>
                                            <span className="visit-duration">{domain.duration_formatted}</span>
                                        </div>
                                        <div className="domain-bar">
                                            <div
                                                className="bar-fill"
                                                style={{
                                                    width: `${(domain.visits / (analytics.top_domains[0]?.visits || 1)) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <p>No tracking data yet. Browse some websites to see analytics.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "history" && (
                <div className="history-content">
                    {history.length > 0 ? (
                        <div className="history-list">
                            {history.map((visit, index) => (
                                <div key={index} className="history-item">
                                    <img
                                        src={getDomainFavicon(visit.domain)}
                                        alt=""
                                        className="history-favicon"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling && e.target.nextSibling.classList.remove('hidden');
                                        }}
                                    />
                                    <FallbackIcon domain={visit.domain} />
                                    <div className="history-info">
                                        <div className="history-title">
                                            {visit.title || visit.domain || visit.url}
                                        </div>
                                        <div className="history-meta">
                                            <span className="history-domain">{visit.domain}</span>
                                            <span className="history-type">{visit.event_type.replace("_", " ")}</span>
                                        </div>
                                    </div>
                                    <div className="history-time">
                                        <span className="time">{formatTime(visit.timestamp)}</span>
                                        <span className="date">{formatDate(visit.timestamp)}</span>
                                        {visit.duration_seconds > 0 && (
                                            <span className="duration">{formatDuration(visit.duration_seconds)}</span>
                                        )}
                                    </div>
                                    <a
                                        href={visit.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="history-link"
                                    >
                                        <FiExternalLink />
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <FiGlobe className="empty-icon" />
                            <p>No browsing history yet</p>
                            <span>Your visited websites will appear here</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrackingDashboard;
