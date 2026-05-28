export interface OfflineVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  quality: string;
  episodeInfo?: string;
  savedAt: number;
  expiresAt: number;
}

const KEY = "offline_videos";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function getOfflineVideos(): OfflineVideo[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const all: OfflineVideo[] = JSON.parse(raw);
    const valid = all.filter((v) => v.expiresAt > Date.now());
    localStorage.setItem(KEY, JSON.stringify(valid));
    return valid;
  } catch {
    return [];
  }
}

export function saveVideoOffline(
  video: Omit<OfflineVideo, "savedAt" | "expiresAt">,
) {
  const now = Date.now();
  const entry: OfflineVideo = {
    ...video,
    savedAt: now,
    expiresAt: now + THIRTY_DAYS,
  };
  const updated = [
    ...getOfflineVideos().filter((v) => v.id !== video.id),
    entry,
  ];
  localStorage.setItem(KEY, JSON.stringify(updated));
}

export function removeOfflineVideo(id: string) {
  localStorage.setItem(
    KEY,
    JSON.stringify(getOfflineVideos().filter((v) => v.id !== id)),
  );
}

export function isVideoSaved(id: string): boolean {
  return getOfflineVideos().some((v) => v.id === id);
}
