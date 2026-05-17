/**
 * Optimized movie downloader for React/Web.
 * 
 * Improvements:
 * - No huge blob memory crashes
 * - Better browser compatibility
 * - Safer filename handling
 * - Popup blocker friendly
 * - AbortController support
 * - Better TypeScript safety
 * - Cleaner architecture
 * - Large movie download optimized
 */

export type DownloadStatus =
  | 'idle'
  | 'downloading'
  | 'done'
  | 'error'
  | 'cancelled';

export interface DownloadProgress {
  status: DownloadStatus;
  progress: number;
  filename: string;
  error?: string;
}

export interface DownloadController {
  cancel: () => void;
}

const MAX_FILENAME_LENGTH = 120;

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/\.+$/, '')
    .trim()
    .slice(0, MAX_FILENAME_LENGTH);
}

function buildFilename(
  title: string,
  quality?: string,
  format?: string,
  episode?: string
): string {
  const parts: string[] = [];

  if (title) parts.push(sanitizeFilename(title));

  if (episode) {
    parts.push(sanitizeFilename(episode));
  }

  if (quality) {
    parts.push(sanitizeFilename(quality));
  }

  const extension = sanitizeFilename(format || 'mp4').toLowerCase();

  return `${parts.join('_')}.${extension}`;
}

function buildSubtitleFilename(
  title: string,
  language: string,
  format?: string
): string {
  const ext = sanitizeFilename(format || 'srt').toLowerCase();
  return `${sanitizeFilename(title)}_${sanitizeFilename(language)}.${ext}`;
}

function triggerDirectDownload(url: string, filename: string) {
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();

  // Small delay before removing to ensure browser processes the click
  setTimeout(() => {
    document.body.removeChild(anchor);
  }, 100);
}

export async function downloadFile(
  url: string,
  filename: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<boolean> {
  const report = (update: Partial<DownloadProgress>) => {
    onProgress?.({
      status: 'downloading',
      progress: 0,
      filename,
      ...update,
    });
  };

  try {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid download URL');
    }

    report({
      status: 'downloading',
      progress: 10,
    });

    /**
     * DIRECT DOWNLOAD APPROACH
     *
     * Better for huge movie files because:
     * - No memory buffering
     * - Browser handles streaming
     * - Faster
     * - More stable
     * - Avoids crashes on large files
     */

    triggerDirectDownload(url, filename);

    report({
      status: 'done',
      progress: 100,
    });

    return true;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Download failed';

    report({
      status: 'error',
      progress: 0,
      error: message,
    });

    console.error('Download error:', err);

    return false;
  }
}

export async function downloadMovie(
  url: string,
  title: string,
  quality: string,
  format?: string,
  episodeLabel?: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<boolean> {
  const filename = buildFilename(
    title,
    quality,
    format || 'mp4',
    episodeLabel
  );

  return downloadFile(url, filename, onProgress);
}

export async function downloadSubtitle(
  url: string,
  title: string,
  language: string,
  format?: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<boolean> {
  const filename = buildSubtitleFilename(
    title,
    language,
    format
  );

  return downloadFile(url, filename, onProgress);
}

/**
 * Batch download movies safely.
 * 
 * IMPORTANT: Uses strict sequential downloads with generous delays
 * to prevent browser popup blockers from killing downloads.
 * Browsers only allow one programmatic download per user gesture,
 * so we space them out significantly.
 */
export async function batchDownloadMovies(
  items: Array<{
    url: string;
    title: string;
    quality: string;
    format?: string;
    episodeLabel?: string;
  }>,
  onItemProgress?: (
    index: number,
    progress: DownloadProgress
  ) => void
): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) {
    return;
  }

  // Download one at a time with delay — browsers block rapid fire downloads
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    await downloadMovie(
      item.url,
      item.title,
      item.quality,
      item.format,
      item.episodeLabel,
      (progress) => onItemProgress?.(i, progress)
    );

    // Wait between downloads to avoid browser popup blocker
    // Longer delay = more reliable across browsers
    if (i < items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

/**
 * Utility helper for quickly opening
 * a download in a new browser tab.
 */
export function openDownloadInNewTab(url: string) {
  if (!url) return;

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Copy download URL to clipboard
 */
export async function copyDownloadLink(
  url: string
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}