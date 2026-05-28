import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search as SearchIcon, Clock, X, TrendingUp } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { fetchSearch } from "../api/client";

interface Props {
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
  setQuery: (q: string) => void;
  isFocused: boolean;
  setIsFocused: (v: boolean) => void;
  recentSearches: string[];
  onClearRecent: () => void;
  onTagClick: (tag: string) => void;
}

export function SearchAutocomplete({
  inputRef,
  query,
  setQuery,
  isFocused,
  setIsFocused,
  recentSearches,
  onClearRecent,
  onTagClick,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debouncedQuery = useDebounce(query, 280);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch title suggestions whenever debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoadingSuggestions(true);
    fetchSearch(debouncedQuery, 1)
      .then((res) => {
        const titles = res.items
          .slice(0, 7)
          .map((m: any) => m.title as string)
          .filter(Boolean)
          // deduplicate and exclude exact current query
          .filter(
            (t: string, i: number, arr: string[]) =>
              arr.indexOf(t) === i &&
              t.toLowerCase() !== debouncedQuery.toLowerCase(),
          );
        setSuggestions(titles);
      })
      .catch(() => {})
      .finally(() => setLoadingSuggestions(false));
  }, [debouncedQuery]);

  const showRecents =
    query.length <= 1 && isFocused && recentSearches.length > 0;
  const showSuggestions =
    query.length >= 2 && isFocused && suggestions.length > 0;

  // Highlight the matching portion of a suggestion
  function highlight(title: string) {
    const idx = title.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{title}</span>;
    return (
      <>
        {title.slice(0, idx)}
        <span style={{ color: "#fff", fontWeight: 700 }}>
          {title.slice(idx, idx + query.length)}
        </span>
        {title.slice(idx + query.length)}
      </>
    );
  }

  return (
    <>
      {/* ── The actual input ── */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 250)}
        placeholder="Search movies, shows, genres, actors…"
        className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 text-white placeholder-white/20 text-[14px] font-bold py-4 px-3"
        style={{
          outline: "none",
          boxShadow: "none",
          border: "none",
          WebkitAppearance: "none",
          appearance: "none",
        }}
        autoComplete="off"
      />

      {/* ── Recent searches ── */}
      <AnimatePresence>
        {showRecents && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.13 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl z-40 overflow-hidden shadow-2xl"
            style={{
              background: "rgba(7,7,14,0.98)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <span
                  className="text-[8px] font-black uppercase tracking-widest flex items-center gap-2"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  <Clock size={10} /> Search History
                </span>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onClearRecent();
                  }}
                  className="text-[9px] font-black uppercase tracking-wider hover:opacity-75 transition-opacity"
                  style={{ color: "#4490ff" }}
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onTagClick(s);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-[12px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors flex items-center gap-3"
                >
                  <Clock
                    size={12}
                    style={{ color: "rgba(255,255,255,0.2)" }}
                    className="shrink-0"
                  />
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Live autocomplete suggestions ── */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl z-40 shadow-2xl overflow-hidden"
            style={{
              background: "rgba(7,7,14,0.98)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="p-2">
              <div className="px-2 py-1.5 mb-1 flex items-center gap-2">
                <SearchIcon
                  size={10}
                  style={{ color: "#4490ff" }}
                  className="shrink-0"
                />
                <span
                  className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Suggestions
                </span>
              </div>
              {suggestions.map((title) => (
                <button
                  key={title}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(title);
                    setSuggestions([]);
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 hover:bg-white/[0.04] transition-colors group"
                >
                  <SearchIcon
                    size={12}
                    style={{ color: "rgba(255,255,255,0.18)" }}
                    className="shrink-0 group-hover:text-[#4490ff] transition-colors"
                  />
                  <span
                    className="text-[12px] font-semibold truncate"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {highlight(title)}
                  </span>
                  <TrendingUp
                    size={10}
                    className="ml-auto shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                    style={{ color: "#4490ff" }}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
