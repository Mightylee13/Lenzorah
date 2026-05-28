import { create } from "zustand";
import { persist } from "zustand/middleware";

const DB_NAME = "lenzorah-offline";
const DB_VERSION = 1;
const STORE_NAME = "videos";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface OfflineItem {
  id: string;
  title: string;
  episodeLabel?: string;
  quality: string;
  format?: string;
  savedAt: number;
  expiresAt: number;
  size: number; // bytes stored
}

interface OfflineState {
  items: OfflineItem[];
  savingProgress: Record<string, number>; // id → 0-100
  // Actions
  saveToWeb: (
    id: string,
    title: string,
    url: string,
    quality: string,
    format?: string,
    episodeLabel?: string,
  ) => Promise<void>;
  deleteOffline: (id: string) => Promise<void>;
  getVideoUrl: (id: string) => Promise<string | null>;
  purgeExpired: () => Promise<void>;
  isExpired: (item: OfflineItem) => boolean;
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      items: [],
      savingProgress: {},

      isExpired: (item) => Date.now() > item.expiresAt,

      saveToWeb: async (id, title, url, quality, format, episodeLabel) => {
        // Set progress to 1 so UI shows "saving"
        set((s) => ({ savingProgress: { ...s.savingProgress, [id]: 1 } }));

        try {
          // Extract raw CDN URL if wrapped in API proxy (e.g. ?url=https://cdn...)
          let rawVideoUrl = url;
          try {
            const parsed = new URL(url);
            const inner = parsed.searchParams.get("url");
            if (inner) rawVideoUrl = decodeURIComponent(inner);
          } catch {
            // already a direct CDN URL
          }

          // In dev: use Vite's built-in /cdn-proxy middleware (vite.config.ts)
          // In prod: use the Render server /api/proxy-video endpoint
          const isDev = import.meta.env.DEV;
          const fetchUrl = isDev
            ? `/cdn-proxy?url=${encodeURIComponent(rawVideoUrl)}`
            : `${import.meta.env.VITE_API_URL || "https://lenzorah.onrender.com"}/api/proxy-video?url=${encodeURIComponent(rawVideoUrl)}`;

          const response = await fetch(fetchUrl);
          if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

          const contentLength = Number(
            response.headers.get("content-length") || 0,
          );
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No readable stream");

          const chunks: ArrayBuffer[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value.buffer as ArrayBuffer);
            received += value.length;
            if (contentLength > 0) {
              const pct = Math.min(
                99,
                Math.round((received / contentLength) * 100),
              );
              set((s) => ({
                savingProgress: { ...s.savingProgress, [id]: pct },
              }));
            }
          }

          const blob = new Blob(chunks, { type: "video/mp4" });
          await idbSet(id, blob);

          const now = Date.now();
          const newItem: OfflineItem = {
            id,
            title,
            episodeLabel,
            quality,
            format,
            savedAt: now,
            expiresAt: now + EXPIRY_MS,
            size: blob.size,
          };

          set((s) => ({
            items: [newItem, ...s.items.filter((i) => i.id !== id)],
            savingProgress: (() => {
              const next = { ...s.savingProgress };
              delete next[id];
              return next;
            })(),
          }));
        } catch (err) {
          console.error("[OfflineStore] saveToWeb error:", err);
          set((s) => {
            const next = { ...s.savingProgress };
            delete next[id];
            return { savingProgress: next };
          });
          throw err;
        }
      },

      deleteOffline: async (id) => {
        await idbDelete(id);
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      getVideoUrl: async (id) => {
        const blob = await idbGet(id);
        if (!blob) return null;
        return URL.createObjectURL(blob);
      },

      purgeExpired: async () => {
        const expired = get().items.filter((i) => Date.now() > i.expiresAt);
        for (const item of expired) {
          await idbDelete(item.id);
        }
        set((s) => ({
          items: s.items.filter((i) => Date.now() <= i.expiresAt),
        }));
      },
    }),
    {
      name: "lenzorah-offline-meta",
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
