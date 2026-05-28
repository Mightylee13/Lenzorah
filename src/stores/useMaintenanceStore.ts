/**
 * src/stores/useMaintenanceStore.ts
 * REPLACE your entire existing file with this.
 *
 * What changed:
 *  - Polls your Express server (VITE_MAINTENANCE_API_URL) every 30s
 *  - setMaintenanceMode() now POSTs to your server → saves to MongoDB
 *  - All other behaviour (isBypassed, PIN, etc.) is unchanged
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Config ───────────────────────────────────────────────────────────────────
// Add VITE_MAINTENANCE_API_URL to your Render frontend environment variables
// e.g. https://lenzorah-api.onrender.com
const API_URL = (
  import.meta.env.VITE_MAINTENANCE_API_URL as string | undefined
)?.replace(/\/$/, "");
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN as string | undefined;
const POLL_MS = 30_000;

// ─── Types ────────────────────────────────────────────────────────────────────
interface MaintenanceState {
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  isBypassed: boolean;
  isRemoteConfigured: boolean;
  lastPolledAt: number | null;

  setMaintenanceMode: (active: boolean, message?: string) => Promise<void>;
  setBypassed: (bypassed: boolean) => void;
  toggleMaintenance: () => Promise<void>;
  pollRemoteStatus: () => Promise<void>;
  startPolling: () => () => void;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function fetchStatus(): Promise<{
  maintenance: boolean;
  message: string;
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
): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const res = await fetch(`${API_URL}/api/maintenance/set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": ADMIN_PIN || "",
      },
      body: JSON.stringify({ maintenance, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      isMaintenanceMode: false,
      maintenanceMessage:
        "We are performing scheduled core upgrades to offer you a faster and smoother cinematic experience. Lenzorah will be back online shortly!",
      isBypassed: false,
      isRemoteConfigured: Boolean(API_URL),
      lastPolledAt: null,

      pollRemoteStatus: async () => {
        const remote = await fetchStatus();
        if (!remote) return null;
        set({
          isMaintenanceMode: remote.maintenance,
          maintenanceMessage: remote.message || get().maintenanceMessage,
          lastPolledAt: Date.now(),
        });
      },

      startPolling: () => {
        get().pollRemoteStatus();
        const id = setInterval(() => {
          if (!get().isBypassed) {
            get().pollRemoteStatus();
          }
        }, POLL_MS);
        return () => clearInterval(id);
      },

      toggleMaintenance: async () => {
        const next = !get().isMaintenanceMode;
        set({ isMaintenanceMode: next });
        await pushStatus(next, get().maintenanceMessage);
      },

      setMaintenanceMode: async (active, message) => {
        const msg = message !== undefined ? message : get().maintenanceMessage;
        set({ isMaintenanceMode: active, maintenanceMessage: msg });
        await pushStatus(active, msg);
      },

      setBypassed: (bypassed) => set({ isBypassed: bypassed }),
    }),
    {
      name: "rf-maintenance",
      partialize: (s) => ({
        isBypassed: s.isBypassed,
        maintenanceMessage: s.maintenanceMessage,
      }),
    },
  ),
);
