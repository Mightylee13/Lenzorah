import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, Star, Tv, Film } from "lucide-react";
import { cn } from "../utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { fetchSearch, SearchItem } from "../api/client";
import { buildMoviePath } from "../utils/slug";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function getMediaLabel(item: SearchItem): string {
  return item.subjectType === 2 ? "TV Show" : "Movie";
}

function getMediaIcon(item: SearchItem) {
  return item.subjectType === 2 ? <Tv size={20} /> : <Film size={20} />;
}

const pillStyle = {
  background: "rgba(10,10,15,0.55)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
};

export default function Navbar({ sidebarOpen, onToggleSidebar }: NavbarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debouncedSearch = useDebounce(searchQuery, 350);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setSearchFocused(false);
    setMobileSearchOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileSearchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (mobileSearchOpen)
      setTimeout(() => mobileInputRef.current?.focus(), 100);
  }, [mobileSearchOpen]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedSearch]);

  const showDropdown = searchFocused && debouncedSearch.trim().length > 1;
  const showMobileDropdown =
    mobileSearchOpen && debouncedSearch.trim().length > 1;

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["navbar-search", debouncedSearch],
    queryFn: () => fetchSearch(debouncedSearch, 1),
    enabled: debouncedSearch.trim().length > 1,
    staleTime: 1000 * 60 * 5,
  });

  const results: SearchItem[] = searchResults?.items?.slice(0, 8) ?? [];
  const mobileResults: SearchItem[] = searchResults?.items?.slice(0, 10) ?? [];
  const totalCount = searchResults?.pager?.totalCount ?? 0;

  const handleResultClick = useCallback(
    (item: SearchItem) => {
      const path = buildMoviePath(
        item.title || item.name || "",
        item.subjectId,
      );
      setSearchFocused(false);
      setMobileSearchOpen(false);
      setSearchQuery("");
      setHighlightedIndex(-1);
      navigate(path);
    },
    [navigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown || results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex])
          handleResultClick(results[highlightedIndex]);
      } else if (e.key === "Escape") {
        setSearchFocused(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        inputRef.current?.blur();
      }
    },
    [showDropdown, results, highlightedIndex, handleResultClick],
  );

  if (location.pathname.startsWith("/watch")) return null;

  const ResultRow = ({
    item,
    index,
    highlighted,
    onClick,
  }: {
    item: SearchItem;
    index: number;
    highlighted: boolean;
    onClick: () => void;
  }) => (
    <button
      key={item.subjectId}
      onClick={onClick}
      onMouseEnter={() => setHighlightedIndex(index)}
      onMouseLeave={() => setHighlightedIndex(-1)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-colors text-left",
        highlighted ? "bg-white/[0.08]" : "hover:bg-white/[0.06]",
      )}
    >
      <div className="w-12 h-16 rounded-lg overflow-hidden bg-white/5 shrink-0">
        {item.thumbnail || item.cover?.url ? (
          <img
            src={item.thumbnail || item.cover?.url}
            alt={item.title || item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--rf-text-dim)]">
            {getMediaIcon(item)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white truncate">
          {item.title || item.name}
        </h4>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-[var(--rf-text-dim)]">
            {getMediaLabel(item)}
          </span>
          {item.releaseDate && (
            <>
              <span className="text-[var(--rf-text-dim)]">•</span>
              <span className="text-xs text-[var(--rf-text-dim)]">
                {item.releaseDate.slice(0, 4)}
              </span>
            </>
          )}
          {item.rating != null && item.rating > 0 && (
            <>
              <span className="text-[var(--rf-text-dim)]">•</span>
              <div className="flex items-center gap-1">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-[var(--rf-text-muted)]">
                  {Number(item.rating).toFixed(1)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  );

  const EmptyState = ({ query }: { query: string }) => (
    <div className="p-8 flex flex-col items-center gap-2 text-[var(--rf-text-dim)]">
      <Film size={32} className="opacity-30" />
      <span className="text-sm">No results for "{query}"</span>
      <span className="text-xs opacity-60">
        Try a different title or spelling
      </span>
    </div>
  );

  const LoadingState = () => (
    <div className="p-8 flex flex-col items-center gap-3 text-[var(--rf-text-dim)]">
      <div className="w-6 h-6 border-2 border-[var(--rf-red)] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs">Searching...</span>
    </div>
  );

  return (
    <>
      {/* ── TOP NAVBAR — 4 separate floating pills ── */}
      <div className="fixed top-0 left-0 right-0 z-[120] pt-[var(--safe-top)] pointer-events-none">
        <div className="px-3 md:px-5 pt-3 md:pt-4 flex items-center justify-between pointer-events-auto">
          {/* LEFT SIDE — hamburger + logo, each its own pill */}
          <div className="flex items-center gap-2">
            {/* Hamburger pill */}
            <button
              onClick={onToggleSidebar}
              className="w-10 h-10 rounded-2xl border border-white/[0.08] flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              style={pillStyle}
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={17} /> : <Menu size={17} />}
            </button>

            {/* Logo pill */}
            <Link
              to="/"
              className="h-10 px-3 rounded-2xl border border-white/[0.08] flex items-center justify-center shrink-0"
              style={pillStyle}
            >
              <img
                src="/logo.png"
                alt="Lenzorah"
                className="h-6 md:h-7 w-auto object-contain"
              />
            </Link>
          </div>

          {/* CENTER — desktop search pill */}
          <div
            ref={searchContainerRef}
            className="hidden md:flex flex-1 max-w-md mx-4 relative"
          >
            <div
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-200",
                searchFocused
                  ? "border-[var(--rf-red)]/40 ring-1 ring-[var(--rf-red)]/20"
                  : "border-white/[0.08] hover:border-white/10",
              )}
              style={pillStyle}
            >
              {isSearching && searchFocused ? (
                <div className="w-4 h-4 border-2 border-[var(--rf-red)] border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Search
                  size={15}
                  className={cn(
                    "shrink-0 transition-colors",
                    searchFocused ? "text-[var(--rf-red)]" : "text-white/40",
                  )}
                />
              )}
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder={t("Search movies & TV shows...")}
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none min-w-0"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery("");
                    setHighlightedIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Desktop Dropdown */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full mt-2 left-0 right-0 bg-[var(--rf-black)]/95 backdrop-blur-2xl border border-[var(--rf-border)] rounded-xl overflow-hidden shadow-2xl"
                  style={{ maxHeight: "70vh", overflowY: "auto" }}
                >
                  {isSearching ? (
                    <LoadingState />
                  ) : results.length > 0 ? (
                    <>
                      <div className="px-4 py-2 border-b border-white/[0.05]">
                        <span className="text-xs text-[var(--rf-text-dim)] font-medium uppercase tracking-wider">
                          Results for "{debouncedSearch}"
                        </span>
                      </div>
                      <div className="py-1">
                        {results.map((item, index) => (
                          <ResultRow
                            key={`${item.subjectId}-${index}`}
                            item={item}
                            index={index}
                            highlighted={index === highlightedIndex}
                            onClick={() => handleResultClick(item)}
                          />
                        ))}
                      </div>
                      {totalCount > 8 && (
                        <div className="px-4 py-2.5 border-t border-white/[0.05]">
                          <button
                            onClick={() => {
                              navigate(
                                `/search?q=${encodeURIComponent(debouncedSearch)}`,
                              );
                              setSearchFocused(false);
                              setSearchQuery("");
                            }}
                            className="text-xs text-[var(--rf-red)] hover:opacity-80 transition-opacity font-medium"
                          >
                            See all {totalCount.toLocaleString()} results →
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState query={debouncedSearch} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT SIDE — search + favicon, each its own pill */}
          <div className="flex items-center gap-2">
            {/* Search pill (mobile only) */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="md:hidden w-10 h-10 rounded-2xl border border-white/[0.08] flex items-center justify-center hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              style={pillStyle}
              aria-label="Open search"
            >
              <Search size={17} />
            </button>

            {/* Favicon pill */}
            <div
              className="w-10 h-10 rounded-2xl border border-white/[0.08] flex items-center justify-center overflow-hidden"
              style={pillStyle}
            >
              <img
                src="/favicon.png"
                alt="Lenzorah"
                className="w-6 h-6 object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE SEARCH MODAL ── */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[130] md:hidden"
              onClick={() => setMobileSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed top-0 left-0 right-0 z-[140] md:hidden pt-[var(--safe-top)]"
            >
              <div className="bg-[var(--rf-black)]/95 backdrop-blur-2xl border-b border-[var(--rf-border)]">
                <div className="px-3 py-3 flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-[var(--rf-red)]/40 ring-1 ring-[var(--rf-red)]/20">
                    {isSearching ? (
                      <div className="w-4 h-4 border-2 border-[var(--rf-red)] border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <Search
                        size={16}
                        className="shrink-0 text-[var(--rf-red)]"
                      />
                    )}
                    <input
                      ref={mobileInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("Search movies & TV shows...")}
                      className="flex-1 bg-transparent text-sm text-white placeholder-[var(--rf-text-dim)] focus:outline-none min-w-0"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-[var(--rf-text-dim)] hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setMobileSearchOpen(false)}
                    className="w-9 h-9 rounded-xl glass-2 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                    aria-label="Close search"
                  >
                    <X size={18} />
                  </button>
                </div>
                {showMobileDropdown && (
                  <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                    {isSearching ? (
                      <LoadingState />
                    ) : mobileResults.length > 0 ? (
                      <>
                        <div className="px-4 py-2 border-b border-white/[0.05]">
                          <span className="text-xs text-[var(--rf-text-dim)] font-medium uppercase tracking-wider">
                            Results for "{debouncedSearch}"
                          </span>
                        </div>
                        <div className="py-1">
                          {mobileResults.map((item, index) => (
                            <ResultRow
                              key={`${item.subjectId}-${index}`}
                              item={item}
                              index={index}
                              highlighted={false}
                              onClick={() => handleResultClick(item)}
                            />
                          ))}
                        </div>
                        {totalCount > 10 && (
                          <div className="px-4 py-3 border-t border-white/[0.05]">
                            <button
                              onClick={() => {
                                navigate(
                                  `/search?q=${encodeURIComponent(debouncedSearch)}`,
                                );
                                setMobileSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="text-xs text-[var(--rf-red)] font-medium"
                            >
                              See all {totalCount.toLocaleString()} results →
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <EmptyState query={debouncedSearch} />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
