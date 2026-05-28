/**
 * useAnalytics.ts
 * Fire-and-forget analytics tracking.
 *
 * Add to your .env AND Render frontend env:
 *   VITE_ANALYTICS_URL=https://your-express-server.onrender.com
 *
 * This is SEPARATE from VITE_API_BASE (which is the movie API).
 * Point it at your Express server (the one running server.js).
 */

import { useEffect } from "react";

const BASE = (
  import.meta.env.VITE_ANALYTICS_URL as string | undefined
)?.replace(/\/$/, "");

async function post(path: string, body: object) {
  if (!BASE) return; // silent if not configured
  try {
    await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true, // survives page unload
    });
  } catch {
    // Never break the UI for analytics
  }
}

// ── Track a page view ─────────────────────────────────────────────────────────
export function trackPageView(title?: string) {
  post("/api/analytics/pageview", {
    path: window.location.pathname,
    title: title || document.title,
    referrer: document.referrer,
  });
}

// ── Track a play event ────────────────────────────────────────────────────────
export function trackPlay(subjectId: string, title: string) {
  post("/api/analytics/event", { type: "play", subjectId, title });
}

// ── Track a download ──────────────────────────────────────────────────────────
export function trackDownload(subjectId: string, title: string) {
  post("/api/analytics/event", { type: "download", subjectId, title });
}

// ── Track a search ────────────────────────────────────────────────────────────
export function trackSearch(query: string) {
  post("/api/analytics/event", { type: "search", title: query });
}

// ── Track watchlist add ───────────────────────────────────────────────────────
export function trackWatchlistAdd(subjectId: string, title: string) {
  post("/api/analytics/event", { type: "watchlist_add", subjectId, title });
}

// ── Track watchlist remove ────────────────────────────────────────────────────
export function trackWatchlistRemove(subjectId: string, title: string) {
  post("/api/analytics/event", { type: "watchlist_remove", subjectId, title });
}

// ── React hook: auto-tracks page view on mount ────────────────────────────────
export function usePageView(title?: string) {
  useEffect(() => {
    trackPageView(title);
  }, [title]);
}
