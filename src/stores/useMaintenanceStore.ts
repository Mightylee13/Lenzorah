/**
 * useMaintenanceStore.ts — Full rewrite
 *
 * Features:
 * 1. Global maintenance (shuts ALL pages)
 * 2. Per-page maintenance (shut specific routes)
 * 3. Timer unlock (auto-unlock after N minutes)
 * 4. MongoDB sync via VITE_MAINTENANCE_API_URL
 * 5. 30s polling across all devices
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Config ─────────────────────────────────────────────────────────────────────
const API_URL = (
  import.meta.env.VITE_MAINTENANCE_API_URL as string | undefined
)?.replace(/\/$/, "");
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN as string | undefined;
const POLL_MS = 30_000;

// ── All page routes that can be individually locked ────────────────────────────
export const LOCKABLE_PAGES = [
  { key: "home", label: "Home", path: "/" },
  { key: "explore", label: "Explore", path: "/explore" },
  { key: "search", label: "Search", path: "/search" },
  { key: "anime", label: "Anime", path: "/anime" },
  { key: "kdrama", label: "K-Drama", path: "/kdrama" },
  { key: "sports", label: "Sports", path: "/sports" },
  { key: "trending", label: "Trending", path: "/trending" },
  { key: "collections", label: "Collections", path: "/collections" },
  { key: "downloads", label: "Downloads", path: "/downloads" },
  { key: "watchlist", label: "Watchlist", path: "/watchlist" },
  { key: "history", label: "History", path: "/history" },
  { key: "run-mode", label: "Run Mode", path: "/run-mode" },
  { key: "movie", label: "Movie Pages", path: "/movie/" },
  { key: "watch", label: "Watch/Player", path: "/watch/" },
];

export interface PageLock {
  key: string;
  locked: boolean;
  message?: string;
  unlocksAt?: number | null; // timestamp when auto-unlock happens
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface MaintenanceState {
  // Global
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isBypassed: boolean;
  isRemoteConfigured: boolean;
  lastPolledAt: number | null;
  // Per-page
  pageLocks: PageLock[];

  // Actions
  setMaintenanceMode: (active: boolean, message?: string) => Promise<void>;
  setBypassed: (bypassed: boolean) => void;
  toggleMaintenance: () => Promise<void>;
  pollRemoteStatus: () => Promise<void>;
  startPolling: () => () => void;

  // Per-page actions
  lockPage: (
    key: string,
    message?: string,
    unlockAfterMs?: number | null,
  ) => Promise<void>;
  unlockPage: (key: string) => Promise<void>;
  isPageLocked: (pathname: string) => boolean;
  getPageLock: (pathname: string) => PageLock | null;
  checkTimerUnlocks: () => void;
}

// ── API helpers ────────────────────────────────────────────────────────────────
async function fetchStatus(): Promise<{
  maintenance: boolean;
  message: string;
  pageLocks?: PageLock[];
} | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/maintenance`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function pushStatus(
  maintenance: boolean,
  message: string,
  pageLocks?: PageLock[],
): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const res = await fetch(`${API_URL}/api/maintenance/set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": ADMIN_PIN || "",
      },
      body: JSON.stringify({ maintenance, message, pageLocks }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────
export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      isMaintenanceMode: false,
      maintenanceMessage:
        "We are performing scheduled core upgrades. Lenzorah will be back online shortly!",
      isBypassed: false,
      isRemoteConfigured: Boolean(API_URL),
      lastPolledAt: null,
      pageLocks: [],

      // ── Poll remote ───────────────────────────────────────────────────────
      pollRemoteStatus: async () => {
        const remote = await fetchStatus();
        if (!remote) return;
        set({
          isMaintenanceMode: remote.maintenance,
          maintenanceMessage: remote.message || get().maintenanceMessage,
          pageLocks: remote.pageLocks || get().pageLocks,
          lastPolledAt: Date.now(),
        });
        get().checkTimerUnlocks();
      },

      startPolling: () => {
        get().pollRemoteStatus();
        const id = setInterval(() => {
          if (!get().isBypassed) get().pollRemoteStatus();
        }, POLL_MS);
        return () => clearInterval(id);
      },

      // ── Global maintenance ────────────────────────────────────────────────
      toggleMaintenance: async () => {
        const next = !get().isMaintenanceMode;
        set({ isMaintenanceMode: next });
        await pushStatus(next, get().maintenanceMessage, get().pageLocks);
      },

      setMaintenanceMode: async (active, message) => {
        const msg = message !== undefined ? message : get().maintenanceMessage;
        set({ isMaintenanceMode: active, maintenanceMessage: msg });
        await pushStatus(active, msg, get().pageLocks);
      },

      setBypassed: (bypassed) => set({ isBypassed: bypassed }),

      // ── Per-page lock ─────────────────────────────────────────────────────
      lockPage: async (key, message, unlockAfterMs) => {
        const unlocksAt = unlockAfterMs ? Date.now() + unlockAfterMs : null;
        const existing = get().pageLocks.filter((p) => p.key !== key);
        const newLock: PageLock = { key, locked: true, message, unlocksAt };
        const newLocks = [...existing, newLock];
        set({ pageLocks: newLocks });
        await pushStatus(
          get().isMaintenanceMode,
          get().maintenanceMessage,
          newLocks,
        );
      },

      unlockPage: async (key) => {
        const newLocks = get().pageLocks.map((p) =>
          p.key === key ? { ...p, locked: false, unlocksAt: null } : p,
        );
        set({ pageLocks: newLocks });
        await pushStatus(
          get().isMaintenanceMode,
          get().maintenanceMessage,
          newLocks,
        );
      },

      // ── Check if any timer has expired ───────────────────────────────────
      checkTimerUnlocks: () => {
        const now = Date.now();
        const locks = get().pageLocks;
        const updated = locks.map((p) =>
          p.locked && p.unlocksAt && now >= p.unlocksAt
            ? { ...p, locked: false, unlocksAt: null }
            : p,
        );
        if (updated.some((p, i) => p.locked !== locks[i].locked)) {
          set({ pageLocks: updated });
          pushStatus(
            get().isMaintenanceMode,
            get().maintenanceMessage,
            updated,
          );
        }
      },

      // ── Check if current pathname is locked ───────────────────────────────
      isPageLocked: (pathname) => {
        if (get().isBypassed) return false;
        return get().pageLocks.some((p) => {
          if (!p.locked) return false;
          const page = LOCKABLE_PAGES.find((lp) => lp.key === p.key);
          if (!page) return false;
          // Home ("/") must be exact match — otherwise it matches every route
          if (page.path === "/") return pathname === "/";
          return pathname === page.path || pathname.startsWith(page.path);
        });
      },

      getPageLock: (pathname) => {
        if (get().isBypassed) return null;
        const lock = get().pageLocks.find((p) => {
          if (!p.locked) return false;
          const page = LOCKABLE_PAGES.find((lp) => lp.key === p.key);
          if (!page) return false;
          // Home ("/") must be exact match — otherwise it matches every route
          if (page.path === "/") return pathname === "/";
          return pathname === page.path || pathname.startsWith(page.path);
        });
        return lock || null;
      },
    }),
    {
      name: "rf-maintenance",
      partialize: (s) => ({
        isBypassed: s.isBypassed,
        maintenanceMessage: s.maintenanceMessage,
        pageLocks: s.pageLocks,
      }),
    },
  ),
);
