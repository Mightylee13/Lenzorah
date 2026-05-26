import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { fetchSearch, fetchTrending, type SearchResponse } from "../api/client";
import {
  Search as SearchIcon,
  X,
  Loader2,
  TrendingUp,
  Clock,
  Sparkles,
  Zap,
  Tv,
  Ghost,
  SmilePlus,
  Rocket,
  Heart,
  Film,
  SlidersHorizontal,
  Star,
  ChevronDown,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDebounce } from "../hooks/useDebounce";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { MovieCard } from "../components/MovieCard";
import { MovieRow } from "../components/MovieRow";
import { GridSkeleton } from "../components/ui/Skeleton";
import { useSEO } from "../hooks/useSEO";
import AISearchPanel from "../components/AISearchPanel";
import { cn } from "../utils/cn";

/* ─── Constants ──────────────────────────────────────────────── */

const TRENDING_TAGS = [
  "Batman",
  "Spiderman",
  "Avengers",
  "Horror",
  "Action",
  "Sci-Fi",
  "Marvel",
  "Anime",
  "Korean",
  "Comedy",
  "Thriller",
  "Romance",
];

const GENRE_CARDS = [
  { label: "Action", sub: "High-octane", icon: Zap, query: "Action" },
  { label: "Anime", sub: "Japanese animation", icon: Sparkles, query: "Anime" },
  { label: "K-Drama", sub: "Korean series", icon: Tv, query: "Korean drama" },
  { label: "Horror", sub: "Spine-chilling", icon: Ghost, query: "Horror" },
  { label: "Comedy", sub: "Laugh-out-loud", icon: SmilePlus, query: "Comedy" },
  { label: "Sci-Fi", sub: "Future worlds", icon: Rocket, query: "Sci-Fi" },
  { label: "Romance", sub: "Love stories", icon: Heart, query: "Romance" },
];

type SortKey = "relevance" | "rating" | "newest" | "oldest";
type TypeKey = "all" | "movie" | "series";

const SORT_OPTIONS: { key: SortKey; label: string; icon: any }[] = [
  { key: "relevance", label: "Relevance", icon: SearchIcon },
  { key: "rating", label: "Top Rated", icon: Star },
  { key: "newest", label: "Newest", icon: TrendingUp },
  { key: "oldest", label: "Oldest", icon: Clock },
];

const TYPE_OPTIONS: { key: TypeKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "movie", label: "Movies" },
  { key: "series", label: "Series" },
];

/* ─── Helper ─────────────────────────────────────────────────── */
const toRating = (val?: string | number): number =>
  parseFloat(String(val ?? "0")) || 0;

/* ─── Main component ─────────────────────────────────────────── */

export default function Search() {
  useSEO({
    title: "Search — Lenzorah",
    description: "Search for any movie or TV series on Lenzorah",
  });

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [typeFilter, setTypeFilter] = useState<TypeKey>("all");
  const [showFilter, setShowFilter] = useState(false);

  const debouncedQuery = useDebounce(query, 500);
  const inputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    "rf-recent-searches",
    [],
  );

  /* ── Close filter on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Search query ── */
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery<SearchResponse>({
    queryKey: ["search", debouncedQuery],
    queryFn: ({ pageParam }) =>
      fetchSearch(debouncedQuery, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pager.hasMore ? Number(last.pager.nextPage) : undefined,
    enabled: debouncedQuery.length > 2,
  });

  /* ── Trending for recommendations ── */
  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrending,
    staleTime: 10 * 60 * 1000,
  });

  const rawResults = data?.pages.flatMap((p) => p.items) || [];
  const totalCount = data?.pages[0]?.pager?.totalCount || 0;

  /* ── Sort + filter ── */
  const results = useMemo(() => {
    let list = [...rawResults];

    if (typeFilter === "movie") list = list.filter((m) => m.subjectType === 1);
    if (typeFilter === "series") list = list.filter((m) => m.subjectType === 2);

    if (sortBy === "relevance") {
      const q = debouncedQuery.toLowerCase().trim();
      const score = (t: string) => {
        if (t === q) return 100;
        if (t.startsWith(q)) return 80;
        if (t.includes(q)) return 60;
        const hits = q.split(/\s+/).filter((w) => t.includes(w)).length;
        return hits > 0 ? 20 + (hits / q.split(/\s+/).length) * 30 : 0;
      };
      list.sort((a, b) => {
        const diff =
          score((b.title || "").toLowerCase()) -
          score((a.title || "").toLowerCase());
        return diff !== 0
          ? diff
          : toRating(b.imdbRatingValue) - toRating(a.imdbRatingValue);
      });
    }
    if (sortBy === "rating")
      list.sort(
        (a, b) => toRating(b.imdbRatingValue) - toRating(a.imdbRatingValue),
      );
    if (sortBy === "newest")
      list.sort((a, b) =>
        (b.releaseDate || "").localeCompare(a.releaseDate || ""),
      );
    if (sortBy === "oldest")
      list.sort((a, b) =>
        (a.releaseDate || "").localeCompare(b.releaseDate || ""),
      );

    return list;
  }, [rawResults, sortBy, typeFilter, debouncedQuery]);

  /* ── Recommendations ── */
  const recommended = useMemo(() => {
    if (!trending) return [];
    return [...trending]
      .sort(
        (a: any, b: any) =>
          toRating(b.imdbRatingValue) - toRating(a.imdbRatingValue),
      )
      .slice(0, 15);
  }, [trending]);

  /* ── Save recent searches ── */
  useEffect(() => {
    if (debouncedQuery.length > 2 && results.length > 0) {
      setRecentSearches((prev) => {
        const filtered = prev.filter(
          (s) => s.toLowerCase() !== debouncedQuery.toLowerCase(),
        );
        return [debouncedQuery, ...filtered].slice(0, 8);
      });
    }
  }, [debouncedQuery, results.length]);

  /* ── Infinite scroll ── */
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage)
          fetchNextPage();
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTagClick = useCallback((tag: string) => {
    setQuery(tag);
    inputRef.current?.focus();
  }, []);
  const handleAISearchTitle = useCallback((t: string) => {
    setQuery(t);
    inputRef.current?.focus();
  }, []);
  const clearRecentSearches = useCallback(
    () => setRecentSearches([]),
    [setRecentSearches],
  );

  const showSuggestions =
    query.length <= 2 && isFocused && recentSearches.length > 0;
  const showDefaultView = debouncedQuery.length <= 2 && !isLoading;
  const hasActiveFilter = typeFilter !== "all" || sortBy !== "relevance";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen max-w-[1600px] mx-auto w-full"
    >
      {/* ══════════════════════════════════════════
          HEADER BAND
      ══════════════════════════════════════════ */}
      <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pt-8 pb-8">
        {/* Lenzorah wordmark + breadcrumb */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[var(--rf-red)] font-black text-sm tracking-tight">
            LENZORAH
          </span>
          <span className="text-white/20 text-xs">/</span>
          <span className="text-[var(--rf-text-dim)] text-xs font-medium tracking-wide">
            Search
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-none tracking-tight mb-2">
              Find anything.
            </h1>
            <p className="text-sm text-[var(--rf-text-muted)]">
              Movies · TV shows · Anime · K-Dramas and more
            </p>
          </div>

          {/* Live stats pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="glass-2 rounded-full px-3 py-1.5 text-[10px] font-bold text-[var(--rf-text-muted)] border border-white/[0.06] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Library live
            </span>
            <span className="glass-2 rounded-full px-3 py-1.5 text-[10px] font-bold text-[var(--rf-text-muted)] border border-white/[0.06]">
              HD · 4K
            </span>
            <span className="glass-2 rounded-full px-3 py-1.5 text-[10px] font-bold text-[var(--rf-text-muted)] border border-white/[0.06]">
              Subtitles
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SEARCH BAR + FILTER ROW
      ══════════════════════════════════════════ */}
      <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-8">
        <div className="flex items-center gap-3 max-w-4xl">
          {/* Search input */}
          <div className="relative flex-1">
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl px-5 py-4 transition-all duration-300 border",
                "bg-white/[0.04]",
                isFocused
                  ? "border-[var(--rf-red)]/60 bg-white/[0.07] ring-2 ring-[var(--rf-red)]/15"
                  : "border-white/[0.08] hover:border-white/[0.16]",
              )}
            >
              <SearchIcon
                size={20}
                className={cn(
                  "shrink-0 transition-colors",
                  isFocused
                    ? "text-[var(--rf-red)]"
                    : "text-[var(--rf-text-dim)]",
                )}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search movies, shows, genres, actors…"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-[var(--rf-text-dim)] text-base font-medium"
                autoComplete="off"
              />
              <div className="flex items-center gap-2 shrink-0">
                <AnimatePresence>
                  {query && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => {
                        setQuery("");
                        inputRef.current?.focus();
                      }}
                      className="w-6 h-6 rounded-full glass-2 flex items-center justify-center hover:bg-white/10 transition-colors"
                      aria-label="Clear"
                    >
                      <X size={12} />
                    </motion.button>
                  )}
                </AnimatePresence>
                {!query && (
                  <span className="text-[10px] text-[var(--rf-text-dim)] glass rounded-md px-1.5 py-0.5 font-mono hidden sm:inline">
                    ⌘K
                  </span>
                )}
              </div>
            </div>

            {/* Recent searches dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass-3 z-30 overflow-hidden shadow-2xl shadow-black/50 border border-white/[0.08]"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest flex items-center gap-1.5">
                        <Clock size={11} /> Recent
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-[10px] text-[var(--rf-red)] font-bold hover:opacity-70 transition-opacity"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleTagClick(s)}
                          className="w-full text-left px-3 py-2 rounded-xl text-sm text-[var(--rf-text)] hover:bg-white/[0.06] transition-colors flex items-center gap-2.5"
                        >
                          <Clock
                            size={12}
                            className="text-[var(--rf-text-dim)] shrink-0"
                          />
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter button */}
          <div className="relative shrink-0" ref={filterRef}>
            <button
              onClick={() => setShowFilter((p) => !p)}
              className={cn(
                "flex items-center gap-2 px-4 py-4 rounded-2xl border transition-all duration-200 font-bold text-sm",
                hasActiveFilter
                  ? "bg-[var(--rf-red)] border-[var(--rf-red)] text-white shadow-lg shadow-[var(--rf-red)]/20"
                  : "glass-2 border-white/[0.08] text-[var(--rf-text-muted)] hover:text-white hover:border-white/[0.2]",
              )}
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilter && (
                <span className="w-2 h-2 rounded-full bg-white shrink-0" />
              )}
              <ChevronDown
                size={13}
                className={cn(
                  "transition-transform hidden sm:block",
                  showFilter && "rotate-180",
                )}
              />
            </button>

            {/* Filter dropdown */}
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-2 w-64 glass-3 rounded-2xl p-5 z-40 shadow-2xl shadow-black/60 border border-white/[0.1]"
                >
                  {/* Content type */}
                  <p className="text-[10px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-2.5">
                    Content type
                  </p>
                  <div className="flex gap-1.5 mb-5">
                    {TYPE_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setTypeFilter(key)}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                          typeFilter === key
                            ? "bg-[var(--rf-red)] border-transparent text-white shadow-md shadow-[var(--rf-red)]/20"
                            : "glass border-white/[0.08] text-[var(--rf-text-muted)] hover:text-white",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Sort by */}
                  <p className="text-[10px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-2.5">
                    Sort by
                  </p>
                  <div className="flex flex-col gap-1 mb-4">
                    {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setSortBy(key)}
                        className={cn(
                          "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                          sortBy === key
                            ? "bg-[var(--rf-red)]/15 text-white border border-[var(--rf-red)]/30"
                            : "hover:bg-white/[0.05] text-[var(--rf-text-muted)] hover:text-white border border-transparent",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={12} />
                          {label}
                        </span>
                        {sortBy === key && (
                          <Check size={12} className="text-[var(--rf-red)]" />
                        )}
                      </button>
                    ))}
                  </div>

                  {hasActiveFilter && (
                    <button
                      onClick={() => {
                        setSortBy("relevance");
                        setTypeFilter("all");
                      }}
                      className="w-full py-2.5 text-xs font-bold text-[var(--rf-red)] hover:opacity-70 transition-opacity border-t border-white/[0.06] pt-3"
                    >
                      Reset all filters
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Active filter pills */}
        <AnimatePresence>
          {hasActiveFilter && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 mt-3 flex-wrap"
            >
              <span className="text-[10px] text-[var(--rf-text-dim)] font-bold uppercase tracking-widest">
                Active:
              </span>
              {typeFilter !== "all" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--rf-red)]/15 border border-[var(--rf-red)]/30 text-[10px] font-bold text-[var(--rf-red)]">
                  {TYPE_OPTIONS.find((t) => t.key === typeFilter)?.label}
                  <button
                    onClick={() => setTypeFilter("all")}
                    className="hover:opacity-60"
                  >
                    <X size={9} />
                  </button>
                </span>
              )}
              {sortBy !== "relevance" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--rf-red)]/15 border border-[var(--rf-red)]/30 text-[10px] font-bold text-[var(--rf-red)]">
                  {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
                  <button
                    onClick={() => setSortBy("relevance")}
                    className="hover:opacity-60"
                  >
                    <X size={9} />
                  </button>
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ══════════════════════════════════════════
          LOADING
      ══════════════════════════════════════════ */}
      {isLoading && debouncedQuery.length > 2 && (
        <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28">
          <GridSkeleton count={12} />
        </div>
      )}

      {/* ══════════════════════════════════════════
          RESULTS
      ══════════════════════════════════════════ */}
      {!isLoading && results.length > 0 && (
        <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-12">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-[var(--rf-text-dim)] font-medium">
              <span className="text-white font-bold">
                {totalCount > 0 ? totalCount.toLocaleString() : results.length}
              </span>{" "}
              results for{" "}
              <span className="text-white font-bold">"{debouncedQuery}"</span>
              {hasActiveFilter && (
                <span className="text-[var(--rf-red)] ml-1">· filtered</span>
              )}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
          >
            {results.map((movie: any, idx: number) => (
              <MovieCard
                key={`${movie.subjectId}-${idx}`}
                movie={movie}
                index={idx}
                size="md"
              />
            ))}
          </motion.div>

          <div ref={loadMoreRef} className="py-10 flex justify-center">
            {isFetchingNextPage && (
              <div className="flex items-center gap-2.5 text-[var(--rf-text-dim)]">
                <Loader2
                  size={16}
                  className="animate-spin text-[var(--rf-red)]"
                />
                <span className="text-xs font-medium">Loading more…</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          ERROR
      ══════════════════════════════════════════ */}
      {error && debouncedQuery.length > 2 && (
        <div className="text-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-4 text-[var(--rf-red)]">
            <SearchIcon size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Search error</h3>
          <p className="text-sm text-[var(--rf-text-dim)]">
            {String((error as any)?.message)}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EMPTY RESULTS
      ══════════════════════════════════════════ */}
      {debouncedQuery.length > 2 &&
        !isLoading &&
        !error &&
        results.length === 0 && (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-4 text-[var(--rf-text-dim)]">
              <SearchIcon size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              No results found
            </h3>
            <p className="text-sm text-[var(--rf-text-dim)] max-w-sm mx-auto">
              Try a different term or browse a category below
            </p>
          </div>
        )}

      {/* ══════════════════════════════════════════
          DEFAULT LANDING
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {showDefaultView && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-14 pb-16"
          >
            {/* AI panel */}
            <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28">
              <AISearchPanel onSearchTitle={handleAISearchTitle} />
            </div>

            {/* ── Recommended row ── */}
            {recommended.length > 0 && (
              <div>
                <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--rf-red)]/15 flex items-center justify-center">
                      <Sparkles size={16} className="text-[var(--rf-red)]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[var(--rf-red)] uppercase tracking-widest">
                        Lenzorah Picks
                      </p>
                      <h2 className="text-lg font-black text-white leading-tight">
                        Recommended for you
                      </h2>
                    </div>
                  </div>
                </div>
                <MovieRow title="" subtitle="">
                  {recommended.map((movie: any, idx: number) => (
                    <div
                      key={`rec-${movie.subjectId}-${idx}`}
                      className="snap-start"
                    >
                      <MovieCard movie={movie} index={idx} size="md" />
                    </div>
                  ))}
                </MovieRow>
              </div>
            )}

            {/* ── Genre cards ── */}
            <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28">
              <p className="text-[10px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-4">
                Browse by genre
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {GENRE_CARDS.map(({ label, sub, icon: Icon, query: q }) => (
                  <button
                    key={label}
                    onClick={() => handleTagClick(q)}
                    className="group text-left glass-2 rounded-2xl p-4 border border-white/[0.06] hover:border-[var(--rf-red)]/40 hover:bg-white/[0.06] transition-all duration-200 active:scale-[0.97]"
                  >
                    <Icon
                      size={20}
                      className="text-[var(--rf-text-dim)] group-hover:text-[var(--rf-red)] transition-colors mb-3"
                    />
                    <p className="text-sm font-bold text-white leading-tight mb-0.5">
                      {label}
                    </p>
                    <p className="text-[11px] text-[var(--rf-text-dim)] leading-tight">
                      {sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Trending tags ── */}
            <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28">
              <p className="text-[10px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TrendingUp size={12} /> Trending searches
              </p>
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-4 py-2 glass-2 rounded-full text-sm font-medium text-[var(--rf-text-muted)] border border-white/[0.06] hover:border-[var(--rf-red)]/30 hover:text-white transition-all active:scale-95"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Discover footer card ── */}
            <div className="px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28">
              <div className="relative rounded-3xl overflow-hidden border border-white/[0.07] bg-white/[0.02] p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Subtle red accent line */}
                <div className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full bg-[var(--rf-red)]" />
                <div className="w-12 h-12 rounded-2xl bg-[var(--rf-red)]/10 border border-[var(--rf-red)]/20 flex items-center justify-center shrink-0">
                  <Sparkles size={22} className="text-[var(--rf-red)]" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[var(--rf-red)] uppercase tracking-[0.2em] mb-1">
                    Lenzorah
                  </p>
                  <h3 className="text-xl font-black text-white mb-1.5 leading-tight">
                    Discover something new
                  </h3>
                  <p className="text-sm text-[var(--rf-text-dim)] max-w-lg leading-relaxed">
                    Search for your favourite movies, TV shows, actors, or
                    genres. Start typing above to explore our entire library.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
