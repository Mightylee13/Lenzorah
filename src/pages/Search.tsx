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
  Brain,
  Calendar,
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
import toast from "react-hot-toast";

// Advanced Feature Imports [2]
import { SearchAutocomplete } from "../components/SearchAutocomplete";
import { YearRangeSlider } from "../components/YearRangeSlider";
import { CompareDrawer } from "../components/CompareDrawer";

// ── Analytics ─────────────────────────────────────────────────────────────────
import { usePageView, trackSearch } from "../hooks/useAnalytics";

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

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] =
  [
    { key: "relevance", label: "Relevance", icon: SearchIcon },
    { key: "rating", label: "Top Rated", icon: Star },
    { key: "newest", label: "Newest", icon: TrendingUp },
    { key: "oldest", label: "Oldest", icon: Clock },
  ];

const TYPE_OPTIONS: { key: TypeKey; label: string }[] = [
  { key: "all", label: "All Content" },
  { key: "movie", label: "Movies" },
  { key: "series", label: "Series" },
];

const toRating = (val?: string | number) => parseFloat(String(val ?? "0")) || 0;

const PAD = "px-4 sm:px-8 md:px-14 lg:px-20";

export default function Search() {
  useSEO({
    title: "Search — Lenzorah",
    description: "Search for any movie or TV series on Lenzorah",
  });

  // ── Track the search page view on mount ─────────────────────────────────────
  usePageView("Search — Lenzorah");

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [typeFilter, setTypeFilter] = useState<TypeKey>("all");
  const [showAI, setShowAI] = useState(false);

  // Advanced States & Corrections [2]
  const [yearRange, setYearRange] = useState({ min: 1970, max: 2026 });
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedCompare, setSelectedCompare] = useState<any[]>([]);
  const [openDropdown, setOpenDropdown] = useState<
    "year" | "rating" | "sort" | null
  >(null);

  const debouncedQuery = useDebounce(query, 500);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const filterBarRef = useRef<HTMLDivElement | null>(null);

  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    "rf-recent-searches",
    [],
  );

  // Handle dropdown clickaways [2]
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        filterBarRef.current &&
        !filterBarRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

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

  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrending,
    staleTime: 10 * 60 * 1000,
  });

  const rawResults = data?.pages.flatMap((p) => p.items) || [];
  const totalCount = data?.pages[0]?.pager?.totalCount || 0;

  // Integrated Filtering with Year and Rating ranges [2]
  const results = useMemo(() => {
    let list = [...rawResults];

    if (typeFilter === "movie") list = list.filter((m) => m.subjectType === 1);
    if (typeFilter === "series") list = list.filter((m) => m.subjectType === 2);

    list = list.filter((m) => {
      if (!m.releaseDate) return true;
      const year = parseInt(m.releaseDate.substring(0, 4));
      return isNaN(year) || (year >= yearRange.min && year <= yearRange.max);
    });

    list = list.filter((m) => toRating(m.imdbRatingValue) >= minRating);

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
  }, [rawResults, sortBy, typeFilter, debouncedQuery, yearRange, minRating]);

  const recommended = useMemo(() => {
    if (!trending) return [];
    return [...trending]
      .sort(
        (a: any, b: any) =>
          toRating(b.imdbRatingValue) - toRating(a.imdbRatingValue),
      )
      .slice(0, 15);
  }, [trending]);

  const highestRatedEver = useMemo(() => {
    if (!trending) return [];
    return [...trending]
      .filter((m: any) => toRating(m.imdbRatingValue) >= 8.5)
      .sort((a, b) => toRating(b.imdbRatingValue) - toRating(a.imdbRatingValue))
      .slice(0, 15);
  }, [trending]);

  const newReleases = useMemo(() => {
    if (!trending) return [];
    return [...trending]
      .filter((m: any) => m.releaseDate)
      .sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""))
      .slice(0, 15);
  }, [trending]);

  const hiddenGems = useMemo(() => {
    if (!trending) return [];
    return [...trending]
      .filter(
        (m: any) =>
          toRating(m.imdbRatingValue) >= 7.0 &&
          toRating(m.imdbRatingValue) <= 8.2,
      )
      .slice(5, 20);
  }, [trending]);

  // ── Track search when query fires and returns results ────────────────────────
  useEffect(() => {
    if (debouncedQuery.length > 2 && results.length > 0) {
      // Save to recent searches
      setRecentSearches((prev) => {
        const filtered = prev.filter(
          (s) => s.toLowerCase() !== debouncedQuery.toLowerCase(),
        );
        return [debouncedQuery, ...filtered].slice(0, 8);
      });

      // Track the search event
      trackSearch(debouncedQuery);
    }
  }, [debouncedQuery, results.length, setRecentSearches]);

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
    setShowAI(false);
    inputRef.current?.focus();
  }, []);

  const handleAISearchTitle = useCallback((t: string) => {
    setQuery(t);
    setShowAI(false);
    inputRef.current?.focus();
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

  const handleCompareToggle = useCallback((m: any) => {
    const id = String(m.subjectId);
    setSelectedCompare((prev) => {
      const exists = prev.some((x) => x.subjectId === id);
      if (exists) return prev.filter((x) => x.subjectId !== id);
      if (prev.length >= 3) {
        toast.error("You can compare up to 3 titles at once.");
        return prev;
      }
      return [...prev, m];
    });
  }, []);

  const showDefaultView = debouncedQuery.length <= 2 && !isLoading;

  const hasActiveFilter =
    typeFilter !== "all" ||
    sortBy !== "relevance" ||
    yearRange.min !== 1970 ||
    yearRange.max !== 2026 ||
    minRating !== 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen max-w-[1600px] mx-auto w-full select-none"
    >
      {/* ── HERO HEADER ── */}
      <div className={`relative ${PAD} pt-12 pb-8 overflow-visible`}>
        {/* Cinematic Ambient Glow (Royal Blue & Soft Purple) */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[260px] rounded-full blur-[130px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(68,144,255,0.06) 0%, rgba(167,139,250,0.02) 70%)",
          }}
        />

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 relative z-10">
          <span
            className="font-black text-[10px] tracking-[0.2em]"
            style={{ color: "var(--rf-red, #ef4444)" }}
          >
            LENZORAH
          </span>
          <span className="text-white/20 text-xs">/</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Search Hub
          </span>
        </div>

        {/* Headline */}
        <div className="relative z-10 mb-8">
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-2.5">
            Explore{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg,#4490ff,#a78bfa)",
              }}
            >
              Endless Lore.
            </span>
          </h1>
          <p className="text-xs font-semibold tracking-wide text-white/30 uppercase">
            Discover movies, series, anime, sports and real-time AI
            recommendations
          </p>
        </div>

        {/* ── SEARCH BAR CONTAINER ── */}
        <div className="relative z-10 max-w-3xl">
          <div
            className={cn(
              "flex items-center rounded-2xl border transition-all duration-300 backdrop-blur-md",
              isFocused
                ? "border-[#4490ff]/40 shadow-[0_0_35px_rgba(68,144,255,0.12)] bg-[#4490ff]/[0.02]"
                : "border-white/[0.08] hover:border-white/[0.14] bg-white/[0.02]",
            )}
          >
            {/* Search icon */}
            <div className="pl-4 shrink-0">
              <SearchIcon
                size={18}
                style={{
                  color: isFocused ? "#4490ff" : "rgba(255,255,255,0.25)",
                }}
                className="transition-colors duration-200"
              />
            </div>

            {/* Live Autocomplete Input [2] */}
            <SearchAutocomplete
              inputRef={inputRef}
              query={query}
              setQuery={setQuery}
              isFocused={isFocused}
              setIsFocused={setIsFocused}
              recentSearches={recentSearches}
              onClearRecent={clearRecentSearches}
              onTagClick={handleTagClick}
            />

            {/* Right controls */}
            <div className="flex items-center gap-1.5 pr-2.5 shrink-0">
              {/* Clear button */}
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <X size={11} className="text-white/50" />
                  </motion.button>
                )}
              </AnimatePresence>

              {!query && (
                <span
                  className="text-[9px] text-white/20 rounded-md px-1.5 py-0.5 font-mono hidden sm:inline"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  ⌘K
                </span>
              )}

              {/* Divider */}
              <div
                className="w-px h-5 mx-1 shrink-0"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />

              {/* ── AI Suite Toggle Button ── */}
              <button
                onClick={() => {
                  setShowAI((p) => !p);
                  setOpenDropdown(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 border outline-none focus:outline-none",
                  showAI
                    ? "text-purple-300 border-purple-500/30"
                    : "text-white/30 hover:text-purple-300 border-transparent hover:border-purple-500/15",
                )}
                style={showAI ? { background: "rgba(147,51,234,0.1)" } : {}}
                title="Advanced AI Options"
              >
                <Brain
                  size={13}
                  className={showAI ? "text-purple-400" : "text-white/30"}
                />
                <span className="hidden sm:inline">AI Suite</span>
                <AnimatePresence>
                  {showAI && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden"
                    >
                      <X size={9} className="text-purple-400/70" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* AI Panel dropdown (Wired to query and setQuery directly) [1] */}
          <AnimatePresence>
            {showAI && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-full left-0 right-0 mt-2 z-40"
              >
                <AISearchPanel
                  query={query}
                  setQuery={setQuery}
                  onSearchTitle={handleAISearchTitle}
                  open={showAI}
                  onClose={() => setShowAI(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── HORIZONTAL FILTER BAR (Blue Glow & Accents) [2] ── */}
        {/* Hidden when AI is active to prevent clashing [1] */}
        <AnimatePresence>
          {!showAI && (
            <motion.div
              ref={filterBarRef}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-30 mt-6 flex flex-wrap items-center gap-3 bg-[#07070a]/90 border border-white/[0.06] rounded-3xl p-3 md:p-3.5 shadow-xl select-none max-w-3xl overflow-hidden"
            >
              {/* Label + Divider */}
              <div className="flex items-center gap-2 px-1">
                <SlidersHorizontal size={14} className="text-[#4490ff]" />
                <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
                  Filters
                </span>
                <div className="w-px h-5 bg-white/10 ml-2" />
              </div>

              {/* Category Segmented Control (Blue Glow Accent) [2] */}
              <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 gap-1">
                {TYPE_OPTIONS.map(({ key, label }) => {
                  const isActive = typeFilter === key;
                  const Icon =
                    key === "all" ? Sparkles : key === "movie" ? Film : Tv;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setTypeFilter(key);
                        setOpenDropdown(null);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 outline-none focus:outline-none cursor-pointer",
                        isActive
                          ? "text-white bg-[#4490ff] shadow-[0_0_15px_rgba(68,144,255,0.35)]"
                          : "text-white/45 hover:text-white/70",
                      )}
                    >
                      <Icon
                        size={11}
                        className={isActive ? "text-white" : "text-white/30"}
                      />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Icon + Release Year Dropdown */}
              <div className="relative flex items-center gap-2">
                <Calendar size={13} className="text-white/30" />
                <button
                  onClick={() => {
                    setOpenDropdown(openDropdown === "year" ? null : "year");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] text-xs font-bold text-white rounded-xl outline-none transition-all cursor-pointer"
                >
                  <span>
                    {yearRange.min === 1970 && yearRange.max === 2026
                      ? "All Release Years"
                      : `${yearRange.min} - ${yearRange.max}`}
                  </span>
                  <ChevronDown
                    size={11}
                    className={cn(
                      "text-white/40 transition-transform duration-200",
                      openDropdown === "year" && "rotate-180",
                    )}
                  />
                </button>

                {/* Dropdown Box */}
                <AnimatePresence>
                  {openDropdown === "year" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute top-full left-0 mt-2 w-64 bg-[#0a0a0f] border border-white/[0.08] p-4 rounded-2xl shadow-2xl z-50"
                    >
                      <YearRangeSlider
                        minYear={1970}
                        maxYear={2026}
                        onChange={(range) => setYearRange(range)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Star Icon + Minimum Rating Dropdown */}
              <div className="relative flex items-center gap-2">
                <Star size={13} className="text-white/30" />
                <button
                  onClick={() => {
                    setOpenDropdown(
                      openDropdown === "rating" ? null : "rating",
                    );
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] text-xs font-bold text-white rounded-xl outline-none transition-all cursor-pointer"
                >
                  <span>
                    {minRating === 0
                      ? "Minimum Rating"
                      : `Rating: ${minRating}+`}
                  </span>
                  <ChevronDown
                    size={11}
                    className={cn(
                      "text-white/40 transition-transform duration-200",
                      openDropdown === "rating" && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {openDropdown === "rating" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-[#0a0a0f] border border-white/[0.08] p-2 rounded-2xl shadow-2xl z-50"
                    >
                      <div className="space-y-1">
                        {[0, 5, 6, 7, 8, 9].map((val) => (
                          <button
                            key={val}
                            onClick={() => {
                              setMinRating(val);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                              minRating === val
                                ? "text-white bg-[#4490ff]/10 text-[#4490ff]"
                                : "text-white/50 hover:bg-white/[0.03] hover:text-white",
                            )}
                          >
                            <span>
                              {val === 0 ? "All Ratings" : `${val}+ Rating`}
                            </span>
                            {minRating === val && <Check size={11} />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sliders Icon + Sort Dropdown */}
              <div className="relative flex items-center gap-2 ml-auto">
                <SlidersHorizontal size={13} className="text-white/30" />
                <button
                  onClick={() => {
                    setOpenDropdown(openDropdown === "sort" ? null : "sort");
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] text-xs font-bold text-white rounded-xl outline-none transition-all cursor-pointer"
                >
                  <span>
                    Sort:{" "}
                    {SORT_OPTIONS.find((opt) => opt.key === sortBy)?.label ||
                      "Relevance"}
                  </span>
                  <ChevronDown
                    size={11}
                    className={cn(
                      "text-white/40 transition-transform duration-200",
                      openDropdown === "sort" && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {openDropdown === "sort" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-[#0a0a0f] border border-white/[0.08] p-2 rounded-2xl shadow-2xl z-50"
                    >
                      <div className="space-y-1">
                        {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            onClick={() => {
                              setSortBy(key);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                              sortBy === key
                                ? "text-white bg-[#4490ff]/10 text-[#4490ff]"
                                : "text-white/50 hover:bg-white/[0.03] hover:text-white",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <Icon size={11} className="opacity-70" />
                              {label}
                            </span>
                            {sortBy === key && <Check size={11} />}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter pills */}
        <AnimatePresence>
          {hasActiveFilter && !showAI && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex items-center gap-2 mt-4 flex-wrap relative z-10 max-w-3xl"
            >
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Active Constraints:
              </span>
              {typeFilter !== "all" && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{
                    background: "rgba(68,144,255,0.08)",
                    border: "1px solid rgba(68,144,255,0.2)",
                    color: "#4490ff",
                  }}
                >
                  {TYPE_OPTIONS.find((t) => t.key === typeFilter)?.label}
                  <button
                    onClick={() => setTypeFilter("all")}
                    className="hover:opacity-60 cursor-pointer"
                  >
                    <X size={9} />
                  </button>
                </span>
              )}
              {sortBy !== "relevance" && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{
                    background: "rgba(68,144,255,0.08)",
                    border: "1px solid rgba(68,144,255,0.2)",
                    color: "#4490ff",
                  }}
                >
                  {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
                  <button
                    onClick={() => setSortBy("relevance")}
                    className="hover:opacity-60 cursor-pointer"
                  >
                    <X size={9} />
                  </button>
                </span>
              )}
              {(yearRange.min !== 1970 || yearRange.max !== 2026) && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{
                    background: "rgba(68,144,255,0.08)",
                    border: "1px solid rgba(68,144,255,0.2)",
                    color: "#4490ff",
                  }}
                >
                  {yearRange.min} - {yearRange.max}
                  <button
                    onClick={() => setYearRange({ min: 1970, max: 2026 })}
                    className="hover:opacity-60 cursor-pointer"
                  >
                    <X size={9} />
                  </button>
                </span>
              )}
              {minRating !== 0 && (
                <span
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                  style={{
                    background: "rgba(68,144,255,0.08)",
                    border: "1px solid rgba(68,144,255,0.2)",
                    color: "#4490ff",
                  }}
                >
                  Rating: {minRating}+
                  <button
                    onClick={() => setMinRating(0)}
                    className="hover:opacity-60 cursor-pointer"
                  >
                    <X size={9} />
                  </button>
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── LOADING SKELETON ── */}
      {isLoading && debouncedQuery.length > 2 && (
        <div className={`${PAD} pb-12`}>
          <GridSkeleton count={12} />
        </div>
      )}

      {/* ── SEARCH RESULTS ── */}
      {!isLoading && results.length > 0 && (
        <div className={`${PAD} pb-12`}>
          <div className="flex items-center justify-between mb-5">
            <p
              className="text-xs font-semibold"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Matched{" "}
              <span className="text-white font-black">
                {totalCount > 0 ? totalCount.toLocaleString() : results.length}
              </span>{" "}
              indexes for{" "}
              <span className="text-white font-black">"{debouncedQuery}"</span>
              {hasActiveFilter && (
                <span className="ml-1.5 font-bold" style={{ color: "#4490ff" }}>
                  · filtered
                </span>
              )}
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 md:gap-4.5"
          >
            {results.map((movie: any, idx: number) => (
              <MovieCard
                key={`${movie.subjectId}-${idx}`}
                movie={movie}
                index={idx}
                size="md"
                isCompared={selectedCompare.some(
                  (item) => item.subjectId === String(movie.subjectId),
                )}
                onCompareToggle={handleCompareToggle}
              />
            ))}
          </motion.div>
          <div ref={loadMoreRef} className="py-10 flex justify-center">
            {isFetchingNextPage && (
              <div
                className="flex items-center gap-2.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <Loader2
                  size={15}
                  className="animate-spin"
                  style={{ color: "#4490ff" }}
                />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Syncing Lore...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EXCEPTION ERROR STATE ── */}
      {error && debouncedQuery.length > 2 && (
        <EmptyState
          icon={<SearchIcon size={22} className="text-red-400" />}
          title="Search error occurred"
          sub={String((error as any)?.message)}
          bg="rgba(239,68,68,0.06)"
          border="rgba(239,68,68,0.15)"
        />
      )}

      {/* ── NULL RESULTS STATE ── */}
      {debouncedQuery.length > 2 &&
        !isLoading &&
        !error &&
        results.length === 0 && (
          <EmptyState
            icon={
              <SearchIcon
                size={22}
                style={{ color: "rgba(255,255,255,0.2)" }}
              />
            }
            title="No records found"
            sub="Refine your index terminology or scan predefined catalogs below"
          />
        )}

      {/* ── DEFAULT DEFAULT VIEW (LANDING) ── */}
      <AnimatePresence>
        {showDefaultView && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.04 }}
            className="space-y-16 pb-20"
          >
            {/* Recommended Row */}
            {recommended.length > 0 && (
              <div>
                <div className={`${PAD} mb-5 flex items-center gap-3`}>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(68,144,255,0.08)",
                      border: "1px solid rgba(68,144,255,0.15)",
                    }}
                  >
                    <Sparkles size={13} style={{ color: "#4490ff" }} />
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: "#4490ff" }}
                    >
                      Curated Selections
                    </p>
                    <h2 className="text-sm font-black text-white leading-tight">
                      Recommended Indexes
                    </h2>
                  </div>
                </div>
                <MovieRow title="" subtitle="">
                  {recommended.map((movie: any, idx: number) => (
                    <div
                      key={`rec-${movie.subjectId}-${idx}`}
                      className="snap-start"
                    >
                      <MovieCard
                        movie={movie}
                        index={idx}
                        size="md"
                        isCompared={selectedCompare.some(
                          (item) => item.subjectId === String(movie.subjectId),
                        )}
                        onCompareToggle={handleCompareToggle}
                      />
                    </div>
                  ))}
                </MovieRow>
              </div>
            )}

            {/* Curated Row: Highest Rated Ever [2] */}
            {highestRatedEver.length > 0 && (
              <div>
                <div className={`${PAD} mb-5 flex items-center gap-3`}>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(68,144,255,0.08)",
                      border: "1px solid rgba(68,144,255,0.15)",
                    }}
                  >
                    <Star size={13} style={{ color: "#4490ff" }} />
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: "#4490ff" }}
                    >
                      Legendary Directory
                    </p>
                    <h2 className="text-sm font-black text-white leading-tight">
                      Highest Rated Ever
                    </h2>
                  </div>
                </div>
                <MovieRow title="" subtitle="">
                  {highestRatedEver.map((movie: any, idx: number) => (
                    <div
                      key={`high-${movie.subjectId}-${idx}`}
                      className="snap-start"
                    >
                      <MovieCard
                        movie={movie}
                        index={idx}
                        size="md"
                        isCompared={selectedCompare.some(
                          (item) => item.subjectId === String(movie.subjectId),
                        )}
                        onCompareToggle={handleCompareToggle}
                      />
                    </div>
                  ))}
                </MovieRow>
              </div>
            )}

            {/* Curated Row: New Releases [2] */}
            {newReleases.length > 0 && (
              <div>
                <div className={`${PAD} mb-5 flex items-center gap-3`}>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(68,144,255,0.08)",
                      border: "1px solid rgba(68,144,255,0.15)",
                    }}
                  >
                    <TrendingUp size={13} style={{ color: "#4490ff" }} />
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: "#4490ff" }}
                    >
                      Just Added
                    </p>
                    <h2 className="text-sm font-black text-white leading-tight">
                      New Releases
                    </h2>
                  </div>
                </div>
                <MovieRow title="" subtitle="">
                  {newReleases.map((movie: any, idx: number) => (
                    <div
                      key={`new-${movie.subjectId}-${idx}`}
                      className="snap-start"
                    >
                      <MovieCard
                        movie={movie}
                        index={idx}
                        size="md"
                        isCompared={selectedCompare.some(
                          (item) => item.subjectId === String(movie.subjectId),
                        )}
                        onCompareToggle={handleCompareToggle}
                      />
                    </div>
                  ))}
                </MovieRow>
              </div>
            )}

            {/* Curated Row: Hidden Gems [2] */}
            {hiddenGems.length > 0 && (
              <div>
                <div className={`${PAD} mb-5 flex items-center gap-3`}>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(68,144,255,0.08)",
                      border: "1px solid rgba(68,144,255,0.15)",
                    }}
                  >
                    <Sparkles size={13} style={{ color: "#4490ff" }} />
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: "#4490ff" }}
                    >
                      Underrated
                    </p>
                    <h2 className="text-sm font-black text-white leading-tight">
                      Hidden Gems
                    </h2>
                  </div>
                </div>
                <MovieRow title="" subtitle="">
                  {hiddenGems.map((movie: any, idx: number) => (
                    <div
                      key={`gem-${movie.subjectId}-${idx}`}
                      className="snap-start"
                    >
                      <MovieCard
                        movie={movie}
                        index={idx}
                        size="md"
                        isCompared={selectedCompare.some(
                          (item) => item.subjectId === String(movie.subjectId),
                        )}
                        onCompareToggle={handleCompareToggle}
                      />
                    </div>
                  ))}
                </MovieRow>
              </div>
            )}

            {/* Premium Category Grid */}
            <div className={PAD}>
              <SectionLabel
                icon={<Film size={11} />}
                label="Categorized Directories"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {GENRE_CARDS.map(({ label, sub, icon: Icon, query: q }) => (
                  <button
                    key={label}
                    onClick={() => handleTagClick(q)}
                    className="group text-left rounded-2xl p-4.5 border transition-all duration-300 active:scale-[0.97] outline-none"
                    style={{
                      background: "rgba(255,255,255,0.015)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(68,144,255,0.25)";
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(68,144,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.015)";
                    }}
                  >
                    <Icon
                      size={18}
                      className="mb-3.5 transition-colors duration-300 group-hover:text-[#4490ff]"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    />
                    <p className="text-[13px] font-bold text-white leading-tight mb-1">
                      {label}
                    </p>
                    <p
                      className="text-[10px] font-medium leading-tight"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      {sub}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Tags */}
            <div className={PAD}>
              <SectionLabel
                icon={<TrendingUp size={11} />}
                label="Frequent queries"
              />
              <div className="flex flex-wrap gap-2">
                {TRENDING_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className="px-4.5 py-2.5 rounded-full text-[11px] font-bold tracking-wider transition-all active:scale-95 outline-none"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.4)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(68,144,255,0.3)";
                      (e.currentTarget as HTMLElement).style.color = "#fff";
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(68,144,255,0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "rgba(255,255,255,0.06)";
                      (e.currentTarget as HTMLElement).style.color =
                        "rgba(255,255,255,0.4)";
                      (e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.02)";
                    }}
                  >
                    #{tag.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Discover card */}
            <div className={PAD}>
              <div
                className="relative rounded-3xl overflow-hidden px-8 py-7 flex flex-col sm:flex-row items-start sm:items-center gap-6"
                style={{
                  background: "rgba(68,144,255,0.03)",
                  border: "1px solid rgba(68,144,255,0.07)",
                }}
              >
                <div
                  className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full"
                  style={{ background: "#4490ff" }}
                />
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(68,144,255,0.08)",
                    border: "1px solid rgba(68,144,255,0.15)",
                  }}
                >
                  <Film size={18} style={{ color: "#4490ff" }} />
                </div>
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.25em] mb-0.5"
                    style={{ color: "#4490ff" }}
                  >
                    Lenzorah Suite
                  </p>
                  <h3 className="text-[15px] font-black text-white mb-1.5">
                    Unravel custom indices
                  </h3>
                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Scan catalogs using standard queries, or leverage the{" "}
                    <button
                      onClick={() => setShowAI(true)}
                      className="inline-flex items-center gap-1 font-bold underline underline-offset-2 transition-colors"
                      style={{ color: "#a78bfa" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#c4b5fd")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#a78bfa")
                      }
                    >
                      <Brain size={11} /> AI Suite
                    </button>{" "}
                    integrated directly into your search bar.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Side Drawer overlay [2] */}
      <CompareDrawer
        selectedItems={selectedCompare}
        onRemove={(id) =>
          setSelectedCompare((prev) =>
            prev.filter((item) => item.subjectId !== id),
          )
        }
        onClear={() => setSelectedCompare([])}
      />
    </motion.div>
  );
}

/* ── UI Helpers ── */
function SectionLabel({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <p
      className="text-[9px] font-black uppercase tracking-widest mb-4 flex items-center gap-1.5"
      style={{ color: "rgba(255,255,255,0.3)" }}
    >
      {icon}
      {label}
    </p>
  );
}

function EmptyState({
  icon,
  title,
  sub,
  bg,
  border,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  bg?: string;
  border?: string;
}) {
  return (
    <div className="text-center py-20 px-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{
          background: bg || "rgba(255,255,255,0.015)",
          border: `1px solid ${border || "rgba(255,255,255,0.06)"}`,
        }}
      >
        {icon}
      </div>
      <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1.5">
        {title}
      </h3>
      <p
        className="text-xs max-w-sm mx-auto leading-relaxed"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        {sub}
      </p>
    </div>
  );
}
