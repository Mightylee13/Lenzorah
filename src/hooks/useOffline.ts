// src/hooks/useOffline.ts
// Detects when the user goes offline and redirects to /downloads
// Also registers the service worker on first load

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Pages that are always accessible offline without redirecting
const OFFLINE_SAFE_ROUTES = ["/downloads", "/watch-offline"];

export function useOffline() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      // Only redirect if not already on an offline-safe page
      const isOnSafePage = OFFLINE_SAFE_ROUTES.some((r) =>
        location.pathname.startsWith(r),
      );
      if (!isOnSafePage) {
        navigate("/downloads", { state: { fromOffline: true } });
      }
    };

    const goOnline = () => {
      setIsOffline(false);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Also check on mount — if the page loaded and we're already offline
    if (!navigator.onLine) {
      goOffline();
    }

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [navigate, location.pathname]);

  return isOffline;
}

// ── Service Worker registration ───────────────────────────────────────────────
export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[SW] Registration failed:", err);
        });
    });
  }
}
