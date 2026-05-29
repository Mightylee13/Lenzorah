/**
 * useBatchDownloads.ts — Updated to use prefetched data
 * Replace src/pages/MovieDetails/hooks/useBatchDownloads.ts
 *
 * Key change: fetchBatch() now checks prefetch cache first before
 * hitting the API. If prefetch already ran, it's instant.
 */

import { useState } from "react";
import { fetchBatchSources } from "../../../api/client";
import { BatchEpisodeResult, SourceItem } from "../types";
import { useDownloadStore } from "./useDownloadStore";
import { useProgressStore } from "../../../stores/useProgressStore";
import { batchDownloadMovies, downloadSubtitle } from "../../../utils/download";

export const useBatchDownloads = (
  id: string | undefined,
  isTvSeries: boolean,
  selectedSeason: number,
  title: string,
) => {
  const [batchResults, setBatchResults] = useState<BatchEpisodeResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const setProgress = useDownloadStore((s) => s.setProgress);

  // ── fetchBatch: uses prefetched data if available, else fetches ──────────────
  const fetchBatch = async (
    maxEp: number,
    prefetchedResults?: BatchEpisodeResult[],
  ) => {
    if (!id || !isTvSeries || maxEp === 0) return;

    // If prefetch already gave us results, use them instantly
    if (prefetchedResults && prefetchedResults.length > 0) {
      setBatchResults(prefetchedResults);
      setBatchLoading(false);
      return;
    }

    // Otherwise fetch fresh (fallback)
    setBatchLoading(true);
    setBatchResults([]);

    try {
      // Chunked fetch — same approach as prefetch hook for reliability
      const results: BatchEpisodeResult[] = [];
      const CHUNK = 3;

      for (let ep = 1; ep <= maxEp; ep += CHUNK) {
        const chunkEps = Array.from(
          { length: Math.min(CHUNK, maxEp - ep + 1) },
          (_, i) => ep + i,
        );

        const chunkResults = await Promise.all(
          chunkEps.map(async (episode) => {
            try {
              const { fetchSources } = await import("../../../api/client");
              const r = await fetchSources(id, selectedSeason, episode);
              return { episode, sources: r.sources, subtitles: r.subtitles };
            } catch {
              return { episode, sources: [], subtitles: [], error: "Failed" };
            }
          }),
        );

        results.push(...chunkResults);
        // Show progress as chunks arrive
        setBatchResults([...results]);

        if (ep + CHUNK <= maxEp) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setBatchResults(results);
    } finally {
      setBatchLoading(false);
    }
  };

  // ── Download all episodes ────────────────────────────────────────────────────
  const startBatchDownload = async (preferredQuality?: string) => {
    const items = batchResults
      .map((ep) => {
        let best = ep.sources[0];
        if (preferredQuality && ep.sources.length > 0) {
          const matched = ep.sources.find(
            (s) => s.quality?.toLowerCase() === preferredQuality.toLowerCase(),
          );
          if (matched) best = matched;
        }
        if (!best) return null;
        return {
          url: best.download_url || best.stream_url,
          title,
          quality: best.quality || "HD",
          format: best.format,
          episodeLabel: `S${selectedSeason}E${ep.episode}`,
          episode: ep.episode,
          id: best.id,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const addToHistory = useDownloadStore.getState().addToHistory;

    items.forEach((item) => {
      const downloadId = `batch_ep${item.episode}_${item.id}`;
      addToHistory({
        id: downloadId,
        title,
        filename: `${title} - ${item.episodeLabel}`,
        quality: item.quality,
        type: "movie",
      });
      setProgress(downloadId, 1, false);
    });

    await batchDownloadMovies(items as any[], (idx: number, p: any) => {
      const item = items[idx];
      const isComplete = p.status === "done" || p.status === "error";
      setProgress(`batch_ep${item.episode}_${item.id}`, p.progress, isComplete);
      if (id && isTvSeries) {
        useProgressStore
          .getState()
          .markEpisodeComplete(id, selectedSeason, item.episode);
      }
    });
  };

  // ── Download all subtitles ───────────────────────────────────────────────────
  const startBatchSubtitleDownload = async (language?: string) => {
    const addToHistory = useDownloadStore.getState().addToHistory;

    const subtitleItems = batchResults
      .filter((ep) => ep.subtitles && ep.subtitles.length > 0)
      .map((ep) => {
        const sub = language
          ? ep.subtitles.find((s: any) => s.lanName === language) ||
            ep.subtitles[0]
          : ep.subtitles[0];
        if (!sub?.url) return null;
        return {
          url: sub.url,
          lanName: sub.lanName || "Unknown",
          episode: ep.episode,
          episodeLabel: `S${selectedSeason}E${ep.episode}`,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (subtitleItems.length === 0) return;

    for (let i = 0; i < subtitleItems.length; i++) {
      const item = subtitleItems[i];
      const downloadId = `batch_sub_ep${item.episode}_${item.lanName}`;
      addToHistory({
        id: downloadId,
        title,
        filename: `${title} - ${item.episodeLabel} - ${item.lanName}`,
        type: "subtitle",
      });
      setProgress(downloadId, 1, false);
      await downloadSubtitle(
        item.url,
        `${title}_${item.episodeLabel}`,
        item.lanName,
        undefined,
        (p) => {
          setProgress(
            downloadId,
            p.progress,
            p.status === "done" || p.status === "error",
          );
        },
      );
      if (i < subtitleItems.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  };

  const resetBatch = () => {
    setBatchResults([]);
    setBatchLoading(false);
  };

  return {
    batchResults,
    batchLoading,
    fetchBatch,
    startBatchDownload,
    startBatchSubtitleDownload,
    resetBatch,
  };
};
