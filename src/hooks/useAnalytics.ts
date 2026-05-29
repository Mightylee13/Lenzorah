/**
 * useAnalytics.ts
 *
 * Smart page view tracking:
 * - Each unique device only counts as 1 view per day
 * - Uses localStorage session ID to deduplicate
 * - Events (play, download, search) always track normally
 *
 * Add to Render frontend env:
 *   VITE_ANALYTICS_URL=https://lenzorah-om1i.onrender.com
 */

import { useEffect } from "react";

const BASE = (
  import.meta.env.VITE_ANALYTICS_URL as string | undefined
)?.replace(/\/$/, "");

// ── Silent fire-and-forget POST ───────────────────────────────────────────────
async function post(path: string, body: object) {
  if (!BASE) return;
  try {
    await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {}
}

// ── Session ID — persists across visits, unique per device ────────────────────
export function getSessionId(): string {
  let id = localStorage.getItem("lenz_session_id");
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem("lenz_session_id", id);
  }
  return id;
}

// ── Check if this page was already counted today ──────────────────────────────
function alreadyCountedToday(path: string): boolean {
  const key = `lenz_pv_${path}`;
  const last = localStorage.getItem(key);
  if (!last) return false;
  const lastDate = new Date(Number(last)).toDateString();
  const today = new Date().toDateString();
  return lastDate === today; // same calendar day → don't count again
}

function markCountedToday(path: string) {
  localStorage.setItem(`lenz_pv_${path}`, String(Date.now()));
}

// ── Track a page view (deduplicated per device per day) ───────────────────────
export function trackPageView(title?: string) {
  const path = window.location.pathname;

  // Skip if already counted today for this path
  if (alreadyCountedToday(path)) return;

  markCountedToday(path);
  post("/api/analytics/pageview", {
    path,
    title: title || document.title,
    referrer: document.referrer,
    sessionId: getSessionId(),
  });
}

// ── Track a unique visitor (only once ever per device) ────────────────────────
export function trackUniqueVisitor() {
  const key = "lenz_visitor_tracked";
  if (localStorage.getItem(key)) return; // already tracked this device
  localStorage.setItem(key, "1");
  post("/api/analytics/event", {
    type: "unique_visitor",
    title: "New visitor",
    sessionId: getSessionId(),
  });
}

// ── Events — always track (these are intentional user actions) ────────────────
export function trackPlay(subjectId: string, title: string) {
  post("/api/analytics/event", {
    type: "play",
    subjectId,
    title,
    sessionId: getSessionId(),
  });
}

export function trackDownload(subjectId: string, title: string) {
  post("/api/analytics/event", {
    type: "download",
    subjectId,
    title,
    sessionId: getSessionId(),
  });
}

export function trackSearch(query: string) {
  post("/api/analytics/event", {
    type: "search",
    title: query,
    sessionId: getSessionId(),
  });
}

export function trackWatchlistAdd(subjectId: string, title: string) {
  post("/api/analytics/event", {
    type: "watchlist_add",
    subjectId,
    title,
    sessionId: getSessionId(),
  });
}

export function trackWatchlistRemove(subjectId: string, title: string) {
  post("/api/analytics/event", {
    type: "watchlist_remove",
    subjectId,
    title,
    sessionId: getSessionId(),
  });
}

// ── Generic Umami-style event tracker ─────────────────────────────────────────
export function trackUmamiEvent(eventName: string, data?: Record<string, any>) {
  post("/api/analytics/event", {
    type: eventName,
    ...data,
    sessionId: getSessionId(),
  });
}

// ── React hook — auto-tracks page view on mount ───────────────────────────────
export function usePageView(title?: string) {
  useEffect(() => {
    trackPageView(title);
  }, [title]);
}

// ── Heartbeat — signals user is active every 30s ─────────────────────────────
export function startHeartbeat(sessionId: string) {
  const ping = () => post("/api/analytics/heartbeat", { sessionId });
  ping(); // immediate ping on start
  const id = setInterval(ping, 30_000);
  return () => clearInterval(id); // return cleanup fn
}
