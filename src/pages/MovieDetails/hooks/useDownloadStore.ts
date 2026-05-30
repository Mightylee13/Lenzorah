import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  saveMedia,
  deleteMedia,
  getPlaceholderMp4Blob,
} from "../../../utils/offlineDb";

export interface DownloadHistoryItem {
  id: string;
  title: string;
  filename: string;
  quality?: string;
  timestamp: number;
  type: "movie" | "subtitle";
  url?: string;
  downloadUrl?: string;
  streamUrl?: string;
  isOffline?: boolean;
  expiresAt?: number;
  offlineComplete?: boolean;
  offlineProgress?: number;
  downloadSpeed?: string;
  downloadedSize?: string;
  totalSize?: string;
  isCancelled?: boolean;
  coverUrl?: string;
  offlineSourceId?: string; // original downloadId used for blob lookup in saveVideoOffline
}

interface DownloadState {
  activeDownloads: Record<string, number>;
  history: DownloadHistoryItem[];
  setProgress: (id: string, progress: number, isComplete?: boolean) => void;
  removeProgress: (id: string) => void;
  addToHistory: (item: Omit<DownloadHistoryItem, "timestamp">) => void;
  addOfflineDownload: (item: Omit<DownloadHistoryItem, "timestamp">) => void;
  cancelDownload: (id: string) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  expireOldDownloads: () => void;
}

const activeIntervals: Record<string, any> = {};

const getSimulatedTotalSize = (
  type: "movie" | "subtitle",
  quality?: string,
): { bytes: number; label: string } => {
  if (type === "subtitle") {
    const bytes = Math.floor(Math.random() * 80000) + 40000;
    return { bytes, label: `${(bytes / 1024).toFixed(1)} KB` };
  }
  const q = (quality || "1080p").toLowerCase();
  let baseBytes = 1.1 * 1024 * 1024 * 1024;
  if (q.includes("4k") || q.includes("2160")) {
    baseBytes = (3.5 + Math.random() * 1.5) * 1024 * 1024 * 1024;
  } else if (q.includes("1080")) {
    baseBytes = (1.1 + Math.random() * 0.4) * 1024 * 1024 * 1024;
  } else if (q.includes("720")) {
    baseBytes = (600 + Math.random() * 200) * 1024 * 1024;
  } else {
    baseBytes = (300 + Math.random() * 150) * 1024 * 1024;
  }
  return {
    bytes: baseBytes,
    label:
      baseBytes >= 1024 * 1024 * 1024
        ? `${(baseBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
        : `${(baseBytes / (1024 * 1024)).toFixed(0)} MB`,
  };
};

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      activeDownloads: {},
      history: [],

      setProgress: (id, progress, isComplete) => {
        set((state) => ({
          activeDownloads: {
            ...state.activeDownloads,
            [id]: Math.max(progress, 1),
          },
        }));
        if (isComplete) {
          setTimeout(() => get().removeProgress(id), 1500);
        }
      },

      removeProgress: (id) => {
        set((state) => {
          const newDownloads = { ...state.activeDownloads };
          delete newDownloads[id];
          return { activeDownloads: newDownloads };
        });
      },

      addToHistory: (item) => {
        const uniqueId = `${item.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        set((state) => ({
          history: [
            { ...item, id: uniqueId, timestamp: Date.now() },
            ...state.history,
          ],
        }));
      },

      addOfflineDownload: (item) => {
        if (typeof navigator !== "undefined" && navigator.storage?.persist) {
          navigator.storage
            .persisted()
            .then((isPersisted) => {
              if (!isPersisted) navigator.storage.persist().catch(() => {});
            })
            .catch(() => {});
        }

        const uniqueId = `${item.id}_offline_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const sizeInfo = getSimulatedTotalSize(item.type, item.quality);

        const newItem: DownloadHistoryItem = {
          ...item,
          id: uniqueId,
          offlineSourceId: item.id, // ← store original downloadId for blob lookup
          timestamp: Date.now(),
          isOffline: true,
          offlineComplete: false,
          offlineProgress: 1,
          downloadSpeed: "0.0 MB/s",
          downloadedSize: item.type === "subtitle" ? "0 KB" : "0 MB",
          totalSize: sizeInfo.label,
        };

        set((state) => ({ history: [newItem, ...state.history] }));

        // Simulate progress UI (visual only — real blob is fetched by saveVideoOffline)
        let currentProgress = 1;
        const totalBytes = sizeInfo.bytes;

        const interval = setInterval(() => {
          const increment = Math.floor(Math.random() * 12) + 8;
          currentProgress = Math.min(currentProgress + increment, 100);

          const speedNum = (Math.random() * 80.0 + 45.0).toFixed(1);
          const downloadSpeed = `${speedNum} MB/s`;

          const downloadedBytes = Math.floor(
            totalBytes * (currentProgress / 100),
          );
          const downloadedSize =
            item.type === "subtitle"
              ? `${(downloadedBytes / 1024).toFixed(1)} KB`
              : downloadedBytes >= 1024 * 1024 * 1024
                ? `${(downloadedBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                : `${(downloadedBytes / (1024 * 1024)).toFixed(0)} MB`;

          const complete = currentProgress >= 100;

          set((state) => ({
            history: state.history.map((h) => {
              if (h.id === uniqueId) {
                return {
                  ...h,
                  offlineProgress: currentProgress,
                  downloadSpeed: complete ? "0.0 MB/s" : downloadSpeed,
                  downloadedSize,
                  offlineComplete: complete,
                  expiresAt: complete
                    ? Date.now() + 30 * 24 * 60 * 60 * 1000
                    : undefined,
                };
              }
              return h;
            }),
          }));

          if (complete) {
            clearInterval(activeIntervals[uniqueId]);
            delete activeIntervals[uniqueId];

            // For subtitles: fetch real blob. For video: saveVideoOffline handles it.
            if (item.type === "subtitle" && item.url) {
              fetch(item.url)
                .then((res) => {
                  if (!res.ok) throw new Error();
                  return res.blob();
                })
                .then((blob) => void saveMedia(uniqueId, blob))
                .catch(() => {
                  const fallbackBlob = new Blob(
                    [
                      "WEBVTT\n\n1\n00:00:01.000 --> 00:00:10.000\n[Offline Subtitle]",
                    ],
                    { type: "text/vtt" },
                  );
                  void saveMedia(uniqueId, fallbackBlob);
                });
            } else {
              // saveVideoOffline.saveToWeb() is fetching the real blob in parallel.
              // Store placeholder so IndexedDB key exists; real blob overwrites it when ready.
              const videoBlob = getPlaceholderMp4Blob();
              void saveMedia(uniqueId, videoBlob);
            }
          }
        }, 200);

        activeIntervals[uniqueId] = interval;
      },

      cancelDownload: (id) => {
        if (activeIntervals[id]) {
          clearInterval(activeIntervals[id]);
          delete activeIntervals[id];
        }
        void deleteMedia(id);
        get().removeFromHistory(id);
      },

      removeFromHistory: (id) => {
        if (activeIntervals[id]) {
          clearInterval(activeIntervals[id]);
          delete activeIntervals[id];
        }
        void deleteMedia(id);
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        }));
      },

      clearHistory: () => {
        Object.keys(activeIntervals).forEach((key) => {
          clearInterval(activeIntervals[key]);
          delete activeIntervals[key];
        });
        get().history.forEach((h) => {
          if (h.isOffline) void deleteMedia(h.id);
        });
        set({ history: [] });
      },

      expireOldDownloads: () => {
        const now = Date.now();
        set((state) => ({
          history: state.history.filter((h) => {
            if (h.isOffline && h.expiresAt && now > h.expiresAt) return false;
            return true;
          }),
        }));
      },
    }),
    {
      name: "runflix-downloads",
      partialize: (state) => ({ history: state.history }),
    },
  ),
);
