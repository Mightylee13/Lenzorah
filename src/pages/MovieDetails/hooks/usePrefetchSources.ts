/**
 * usePrefetchSources.ts
 *
 * Background prefetch hook — fetches sources & batch data as soon as
 * the user opens the movie/series page. When they open the download
 * modal, data is already cached and loads instantly.
 *
 * Place at: src/pages/MovieDetails/hooks/usePrefetchSources.ts
 *
 * Strategy (matches your friend's approach):
 * 1. On page mount → immediately prefetch single episode sources in background
 * 2. For TV series → after single sources load, prefetch ALL episodes in background
 * 3. Results cached in module-level Map → instant on modal open
 * 4. No re-fetch if cache is fresh (< 10 min old)
 */

import { useEffect, useRef, useState } from "react";
import { fetchSources, fetchBatchSources } from "../../../api/client";
import type { BatchEpisodeResult, SourceItem } from "../types";

// ── Module-level cache (survives re-renders, cleared on page unload) ───────────
interface CacheEntry<T> {
  data: T;
  ts: number;
}

const sourcesCache = new Map<
  string,
  CacheEntry<{ sources: SourceItem[]; subtitles: any[] }>
>();
const batchCache = new Map<string, CacheEntry<BatchEpisodeResult[]>>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.ts < CACHE_TTL_MS;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function usePrefetchSources(
  id: string | undefined,
  isTvSeries: boolean,
  selectedSeason: number,
  selectedEpisode: number,
  maxEp: number,
) {
  // Prefetch state — exposed so DownloadModal can use it directly
  const [prefetchedSources, setPrefetchedSources] = useState<{
    sources: SourceItem[];
    subtitles: any[];
  } | null>(null);
  const [prefetchedBatch, setPrefetchedBatch] = useState<BatchEpisodeResult[]>(
    [],
  );
  const [sourcesReady, setSourcesReady] = useState(false);
  const [batchReady, setBatchReady] = useState(false);

  const fetchingBatch = useRef(false);
  const fetchingSources = useRef(false);

  // ── 1. Prefetch single episode sources in background ────────────────────────
  useEffect(() => {
    if (!id || fetchingSources.current) return;

    const cacheKey = `${id}_${selectedSeason}_${selectedEpisode}`;
    const cached = sourcesCache.get(cacheKey);

    if (isFresh(cached)) {
      setPrefetchedSources(cached.data);
      setSourcesReady(true);
      return;
    }

    fetchingSources.current = true;

    const run = async () => {
      try {
        const result = await fetchSources(
          id,
          isTvSeries && selectedSeason > 0 ? selectedSeason : undefined,
          isTvSeries && selectedEpisode > 0 ? selectedEpisode : undefined,
        );
        const entry = { data: result, ts: Date.now() };
        sourcesCache.set(cacheKey, entry);
        setPrefetchedSources(result);
        setSourcesReady(true);
      } catch {
        // Fail silently — user will get fresh fetch on modal open
        setSourcesReady(false);
      } finally {
        fetchingSources.current = false;
      }
    };

    // Small delay so page render isn't blocked
    const timer = setTimeout(run, 800);
    return () => clearTimeout(timer);
  }, [id, selectedSeason, selectedEpisode, isTvSeries]);

  // ── 2. Prefetch ALL episodes batch in background (TV series only) ────────────
  useEffect(() => {
    if (!id || !isTvSeries || selectedSeason <= 0 || maxEp <= 0) return;
    if (fetchingBatch.current) return;

    const cacheKey = `batch_${id}_${selectedSeason}`;
    const cached = batchCache.get(cacheKey);

    if (isFresh(cached)) {
      setPrefetchedBatch(cached.data);
      setBatchReady(true);
      return;
    }

    fetchingBatch.current = true;

    const run = async () => {
      try {
        // Stagger: fetch in chunks of 3 to avoid hammering the API
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
                const r = await fetchSources(id, selectedSeason, episode);
                return { episode, sources: r.sources, subtitles: r.subtitles };
              } catch {
                return { episode, sources: [], subtitles: [], error: "Failed" };
              }
            }),
          );

          results.push(...chunkResults);

          // Update state progressively so user sees results as they come in
          setPrefetchedBatch([...results]);
          setBatchReady(results.some((r) => r.sources.length > 0));

          // Small gap between chunks
          if (ep + CHUNK <= maxEp) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }

        batchCache.set(cacheKey, { data: results, ts: Date.now() });
        setPrefetchedBatch(results);
        setBatchReady(true);
      } catch {
        setBatchReady(false);
      } finally {
        fetchingBatch.current = false;
      }
    };

    // Start batch prefetch after a longer delay (don't compete with single source fetch)
    const timer = setTimeout(run, 2000);
    return () => clearTimeout(timer);
  }, [id, isTvSeries, selectedSeason, maxEp]);

  // ── 3. Season change → reset batch ──────────────────────────────────────────
  useEffect(() => {
    if (!isTvSeries) return;
    fetchingBatch.current = false;
    setBatchReady(false);
    setPrefetchedBatch([]);
  }, [selectedSeason, isTvSeries]);

  return {
    prefetchedSources,
    prefetchedBatch,
    sourcesReady,
    batchReady,
  };
}

// ── Manual cache clear (call on page unmount if needed) ───────────────────────
export function clearPrefetchCache() {
  sourcesCache.clear();
  batchCache.clear();
}
