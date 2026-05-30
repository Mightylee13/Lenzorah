/**
 * saveOffline.ts — Zustand store for true offline video storage
 *
 * - Fetches the actual video blob from the stream URL
 * - Stores it in IndexedDB via offlineDb.ts
 * - Tracks save progress per item
 * - Expires items after 30 days
 * - WatchOffline reads the blob back via getMedia()
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveMedia, getMedia, deleteMedia } from "./offlineDb";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export interface OfflineItem {
  id: string;
  title: string;
  quality: string;
  format?: string;
  episodeLabel?: string;
  savedAt: number;
  expiresAt: number;
  blobSaved: boolean;
  fallbackUrl?: string;
}

interface SaveOfflineState {
  items: OfflineItem[];
  savingProgress: Record<string, number>;

  saveToWeb: (
    id: string,
    title: string,
    url: string,
    quality: string,
    format?: string,
    episodeLabel?: string,
  ) => Promise<void>;

  removeItem: (id: string) => void;
  isExpired: (item: OfflineItem) => boolean;
  getPlaybackUrl: (id: string) => Promise<string | null>;
  expireOld: () => void;
}

export const saveVideoOffline = create<SaveOfflineState>()(
  persist(
    (set, get) => ({
      items: [],
      savingProgress: {},

      saveToWeb: async (id, title, url, quality, format, episodeLabel) => {
        set((s) => ({
          savingProgress: { ...s.savingProgress, [id]: 1 },
        }));

        try {
          const response = await fetch(url, { mode: "cors" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const contentLength = response.headers.get("content-length");
          const total = contentLength ? parseInt(contentLength, 10) : 0;
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No readable stream");

          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            const progress = total
              ? Math.min(95, Math.round((received / total) * 95))
              : Math.min(95, Math.round(received / 1_000_000));
            set((s) => ({
              savingProgress: {
                ...s.savingProgress,
                [id]: Math.max(progress, 2),
              },
            }));
          }

          const blob = new Blob(chunks, {
            type: response.headers.get("content-type") || "video/mp4",
          });

          set((s) => ({ savingProgress: { ...s.savingProgress, [id]: 97 } }));
          await saveMedia(id, blob);

          const now = Date.now();
          set((s) => ({
            items: [
              ...s.items.filter((i) => i.id !== id),
              {
                id,
                title,
                quality,
                format,
                episodeLabel,
                savedAt: now,
                expiresAt: now + THIRTY_DAYS,
                blobSaved: true,
              },
            ],
            savingProgress: { ...s.savingProgress, [id]: 100 },
          }));

          setTimeout(() => {
            set((s) => {
              const p = { ...s.savingProgress };
              delete p[id];
              return { savingProgress: p };
            });
          }, 2000);
        } catch (err) {
          console.warn(
            "[Offline] Blob fetch failed, saving URL fallback:",
            err,
          );

          const now = Date.now();
          set((s) => ({
            items: [
              ...s.items.filter((i) => i.id !== id),
              {
                id,
                title,
                quality,
                format,
                episodeLabel,
                savedAt: now,
                expiresAt: now + THIRTY_DAYS,
                blobSaved: false,
                fallbackUrl: url,
              },
            ],
            savingProgress: { ...s.savingProgress, [id]: 100 },
          }));

          setTimeout(() => {
            set((s) => {
              const p = { ...s.savingProgress };
              delete p[id];
              return { savingProgress: p };
            });
          }, 2000);
        }
      },

      getPlaybackUrl: async (id: string): Promise<string | null> => {
        const item = get().items.find((i) => i.id === id);
        if (!item || get().isExpired(item)) return null;

        if (item.blobSaved) {
          try {
            const blob = await getMedia(id);
            if (blob && blob.size > 1000) {
              return URL.createObjectURL(blob);
            }
          } catch {}
        }
        return item.fallbackUrl || null;
      },

      removeItem: (id: string) => {
        deleteMedia(id).catch(() => {});
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      },

      isExpired: (item: OfflineItem) => item.expiresAt <= Date.now(),

      expireOld: () => {
        const now = Date.now();
        get()
          .items.filter((i) => i.expiresAt <= now)
          .forEach((i) => deleteMedia(i.id).catch(() => {}));
        set((s) => ({ items: s.items.filter((i) => i.expiresAt > now) }));
      },
    }),
    {
      name: "runflix-offline-saves",
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
