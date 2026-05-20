import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  Search,
  Download,
  Heart,
  Menu,
  X,
  Tv,
  Trophy,
  Clock,
  Radio,
} from "lucide-react";
import { cn } from "../utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { fetchSearch } from "../api/client";
import { buildMoviePath } from "../utils/slug";
import { useQuery } from "@tanstack/react-query";

const navLinks = [
  { name: "Home", path: "/", icon: Home },
  { name: "Search", path: "/search", icon: Search },
  { name: "Explore", path: "/explore", icon: Compass },
  { name: "Anime", path: "/anime", icon: Tv },
  { name: "KDrama", path: "/kdrama", icon: Tv },
  { name: "Sports", path: "/sports", icon: Trophy },
  { name: "LENZ Mode", path: "/run-mode", icon: Radio },
  { name: "History", path: "/history", icon: Clock },
  { name: "Watchlist", path: "/watchlist", icon: Heart },
  { name: "Downloads", path: "/downloads", icon: Download },
];

const mobileNavLinks = [
  { name: "Home", path: "/", icon: Home },
  { name: "Explore", path: "/explore", icon: Compass },
  { name: "Search", path: "/search", icon: Search },
  { name: "Watchlist", path: "/watchlist", icon: Heart },
  { name: "History", path: "/history", icon: Clock },
];

export default function Navbar() {
  const location = useLocation();
  if (location.pathname.startsWith("/watch")) {
    return null;
  }
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close overlays on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  // Lock body scroll when search overlay is open
  useEffect(() => {
    if (searchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["global-dialog-search", debouncedSearch],
    queryFn: () => fetchSearch(debouncedSearch, 1),
    enabled: debouncedSearch.trim().length > 1,
  });

  return (
    <>
      {/* ============ DESKTOP NAVBAR ============ */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 pt-[var(--safe-top)]",
          scrolled
            ? "py-2.5 pt-[max(0.625rem,var(--safe-top))] bg-[var(--rf-black)]/80 backdrop-blur-xl border-b border-[var(--rf-border)]"
            : "py-4 pt-[max(1rem,var(--safe-top))] bg-transparent",
        )}
      >
        <div className="max-w-[1400px] mx-auto px-5 lg:px-10 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-1.5 group shrink-0"
            aria-label="Lenzorah Home"
          >
            <img
              src="/logo.png"
              alt="Lenzorah Entertainment"
              className="h-8 lg:h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              const isAnime = link.path === "/anime";
              const isKdrama = link.path === "/kdrama";
              const isSports = link.path === "/sports";
              const isRunMode = link.path === "/run-mode";
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-white"
                      : isAnime
                        ? "text-fuchsia-400 hover:text-fuchsia-300"
                        : isKdrama
                          ? "text-rose-400 hover:text-rose-300"
                          : isSports
                            ? "text-emerald-400 hover:text-emerald-300"
                            : isRunMode
                              ? "text-[var(--rf-red)] hover:text-red-300"
                              : "text-[var(--rf-text-muted)] hover:text-white",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className={cn(
                        "absolute inset-0 rounded-xl border",
                        isAnime
                          ? "bg-gradient-to-r from-pink-500/20 to-purple-600/20 border-pink-500/20"
                          : isKdrama
                            ? "bg-gradient-to-r from-rose-500/20 to-violet-600/20 border-rose-500/20"
                            : isSports
                              ? "bg-gradient-to-r from-emerald-500/20 to-teal-600/20 border-emerald-500/20"
                              : isRunMode
                                ? "bg-gradient-to-r from-red-500/20 to-orange-600/20 border-red-500/20"
                                : "bg-white/[0.06] border-white/[0.08]",
                      )}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 30,
                      }}
                    />
                  )}
                  <span
                    className="relative z-10 flex items-center gap-2"
                    title={link.name === "Downloads" ? "Downloads" : ''}
                  >
                    {isAnime ? (
                      <span className="text-base leading-none">🎌</span>
                    ) : isKdrama ? (
                      <span className="text-base leading-none">🇰🇷</span>
                    ) : isSports ? (
                      <span className="text-base leading-none">🏆</span>
                    ) : isRunMode ? (
                      <span className="relative text-base leading-none">
                        📺
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--rf-red)] animate-pulse" />
                      </span>
                    ) : (
                      <link.icon size={16} />
                    )}
                    {link.name !== "Downloads" && link.name}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-full glass-2 flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--rf-red)] to-[var(--rf-red-deep)] border border-white/10 flex items-center justify-center text-xs font-black">
              L
            </div>
          </div>

          {/* Mobile Search + Menu Toggle Toggles */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-xl glass-2 flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-xl glass-2 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ============ MOBILE BOTTOM NAVIGATION ============ */}
      <nav
        className="md:hidden mobile-nav"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around">
          {mobileNavLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            const isAnime = link.path === "/anime";
            const isSearch = link.name === "Search";

            const buttonContent = (
              <>
                {isActive && !isSearch && (
                  <motion.div
                    layoutId="mobile-nav-active"
                    className={cn(
                      "absolute -top-1 w-5 h-0.5 rounded-full",
                      isAnime ? "bg-fuchsia-400" : "bg-[var(--rf-red)]",
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {isAnime ? (
                  <span
                    className="text-xl leading-none"
                    style={
                      isActive
                        ? {
                            filter:
                              "drop-shadow(0 0 6px rgba(232,121,249,0.6))",
                          }
                        : {}
                    }
                  >
                    🎌
                  </span>
                ) : (
                  <Icon
                    size={20}
                    className={cn(
                      "transition-all duration-300",
                      isActive &&
                        !isSearch &&
                        "drop-shadow-[0_0_6px_rgba(229,9,20,0.5)]",
                    )}
                    fill={isActive && !isSearch ? "currentColor" : "none"}
                  />
                )}
                <span className="text-[10px] font-semibold">{link.name}</span>
              </>
            );

            if (isSearch) {
              return (
                <button
                  key={link.name}
                  onClick={() => setSearchOpen(true)}
                  className="relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-300 text-[var(--rf-text-dim)] active:scale-90"
                  aria-label={link.name}
                >
                  {buttonContent}
                </button>
              );
            }

            return (
              <Link
                key={link.name}
                to={link.path}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-300",
                  isActive
                    ? isAnime
                      ? "text-fuchsia-400"
                      : "text-[var(--rf-red)]"
                    : "text-[var(--rf-text-dim)] active:scale-90",
                )}
                aria-label={link.name}
                aria-current={isActive ? "page" : undefined}
              >
                {buttonContent}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ============ MOBILE FULL MENU (Sleek Compact Dropdown Card) ============ */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed top-[calc(60px+var(--safe-top))] right-4 z-40 w-56 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              const isAnime = link.path === "/anime";
              const isKdrama = link.path === "/kdrama";
              const isSports = link.path === "/sports";
              const isRunMode = link.path === "/run-mode";
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                    isActive
                      ? isAnime
                        ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/10"
                        : isKdrama
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                          : isSports
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                            : isRunMode
                              ? "bg-red-500/10 text-[var(--rf-red)] border border-red-500/10"
                              : "bg-[var(--rf-red)]/10 text-[var(--rf-red)] border border-[var(--rf-red)]/10"
                      : isAnime
                        ? "text-fuchsia-400/80 hover:bg-fuchsia-500/5"
                        : isKdrama
                          ? "text-rose-400/80 hover:bg-rose-500/5"
                          : isSports
                            ? "text-emerald-400/80 hover:bg-emerald-500/5"
                            : isRunMode
                              ? "text-red-400/80 hover:bg-red-500/5"
                              : "text-[var(--rf-text-muted)] hover:text-white hover:bg-white/5",
                  )}
                >
                  {isAnime ? (
                    <span className="text-base">🎌</span>
                  ) : isKdrama ? (
                    <span className="text-base">🇰🇷</span>
                  ) : isSports ? (
                    <span className="text-base">🏆</span>
                  ) : isRunMode ? (
                    <span className="text-base">📺</span>
                  ) : (
                    <link.icon size={14} />
                  )}
                  <span>{link.name}</span>
                  {isAnime && (
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[8px] font-black tracking-wider uppercase scale-90">
                      NEW
                    </span>
                  )}
                  {isKdrama && (
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[8px] font-black tracking-wider uppercase scale-90">
                      HOT
                    </span>
                  )}
                  {isSports && (
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-black tracking-wider uppercase scale-90">
                      LIVE
                    </span>
                  )}
                  {isRunMode && (
                    <span className="ml-auto px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[8px] font-black tracking-wider uppercase scale-90 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                      TV
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Divider + Quick Links */}
            <div className="h-px bg-white/[0.06] my-1" />
            <Link
              to="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                location.pathname === "/contact"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                  : "text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/5",
              )}
            >
              <span className="text-base">💬</span>
              <span>Contact Us</span>
            </Link>
            <Link
              to="/dmca"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200",
                location.pathname === "/dmca"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                  : "text-[var(--rf-text-muted)] hover:text-white hover:bg-white/5",
              )}
            >
              <span className="text-base">🛡️</span>
              <span>DMCA</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ INSTANT SEARCH DIALOG OVERLAY ============ */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex flex-col p-4 md:p-8"
          >
            {/* Header / Top row */}
            <div className="max-w-5xl w-full mx-auto flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--rf-red)] to-[var(--rf-red-deep)] flex items-center justify-center text-lg font-black shadow-lg shadow-[var(--rf-red)]/20">
                  R
                </div>
                <h2 className="text-xl font-bold text-white hidden sm:block">
                  Instant Search
                </h2>
              </div>
              <button
                onClick={() => setSearchOpen(false)}
                className="w-10 h-10 rounded-xl glass-2 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-[var(--rf-text-muted)] hover:text-white"
                aria-label="Close search"
              >
                <X size={20} />
              </button>
            </div>

            {/* Large Search Input */}
            <div className="max-w-5xl w-full mx-auto relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[var(--rf-text-dim)]">
                <Search size={22} className="text-white/40" />
              </div>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, anime, series..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-2xl py-4.5 pl-14 pr-12 text-lg text-white placeholder-white/30 focus:outline-none focus:border-[var(--rf-red)]/50 focus:ring-1 focus:ring-[var(--rf-red)]/40 transition-all font-medium glass-3 shadow-2xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-4 flex items-center text-[var(--rf-text-dim)] hover:text-white p-2 rounded transition-colors"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Results Grid Container */}
            <div className="max-w-5xl w-full mx-auto flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      ease: "linear",
                    }}
                    className="w-8 h-8 border-3 border-[var(--rf-red)] border-t-transparent rounded-full mb-4"
                  />
                  <p className="text-sm text-[var(--rf-text-dim)]">
                    Searching database...
                  </p>
                </div>
              ) : searchQuery.trim().length <= 1 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4 opacity-30">🍿</div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    Discover Something New
                  </h3>
                  <p className="text-xs text-[var(--rf-text-dim)] max-w-sm mx-auto">
                    Type a movie name, animated anime, TV series, or genre
                    keywords to find what you want instantly.
                  </p>
                </div>
              ) : searchResults?.items && searchResults.items.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-12"
                >
                  {searchResults.items.map((movie, idx) => (
                      <Link
                        key={`${movie.subjectId}-${idx}`}
                        to={buildMoviePath(
                          movie.title || movie.name || "",
                          movie.subjectId,
                        )}
                        onClick={() => setSearchOpen(false)}
                      className="group flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-[var(--rf-red)]/30 rounded-2xl p-2.5 transition-all duration-300 active:scale-[0.99]"
                    >
                      {/* Left cover image */}
                      <div className="w-16 h-22 sm:w-20 sm:h-26 rounded-xl overflow-hidden shrink-0 bg-white/[0.02] border border-white/[0.04]">
                        <img
                          src={
                            typeof movie.cover === "object" && movie.cover
                              ? (movie.cover as any).url
                              : movie.cover || ""
                          }
                          alt={movie.title || movie.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </div>

                      {/* Right details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1 group-hover:text-[var(--rf-red)] transition-colors">
                          {movie.title || movie.name}
                        </h4>

                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-[var(--rf-text-muted)] font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] text-white/70 font-semibold uppercase tracking-wider">
                            {movie.subjectType === 2 ? "📺 Series" : "🎬 Movie"}
                          </span>
                          {movie.releaseDate && (
                            <span>{movie.releaseDate.substring(0, 4)}</span>
                          )}
                          {movie.genre && (
                            <span className="text-[10px] text-white/40 truncate max-w-[120px] sm:max-w-none">
                              • {movie.genre}
                            </span>
                          )}
                        </div>

                        {(() => {
                          const rawRating =
                            movie.rating || movie.imdbRatingValue;
                          const ratingNum = Number(rawRating);
                          if (!rawRating || isNaN(ratingNum) || ratingNum <= 0)
                            return null;
                          return (
                            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-[var(--rf-gold)]">
                              <span>★</span>
                              <span>{ratingNum.toFixed(1)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </Link>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    No Results Found
                  </h3>
                  <p className="text-xs text-[var(--rf-text-dim)]">
                    We couldn't find any match for "{searchQuery}". Try
                    different keywords.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
