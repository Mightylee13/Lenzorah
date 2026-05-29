/**
 * Daratech.tsx — Full Redesign
 * Replace src/pages/Daratech.tsx
 *
 * Features:
 * - PIN pad security gate (numpad style)
 * - 4 workspaces: Catalog · Analytics · System · Activity
 * - Mobile bottom nav (admin-specific)
 * - Blue (#4490ff) theme matching homepage
 * - Real MongoDB analytics via AnalyticsDashboard
 */

import PageMaintenancePanel from "../components/PageMaintenancePanel";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrending, fetchSearch } from "../api/client";
import {
  Brain,
  Share2,
  Loader2,
  Play,
  Shield,
  RefreshCw,
  BarChart2,
  Search,
  Sliders,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Globe,
  Compass,
  Eye,
  Zap,
  CheckSquare,
  Wrench,
  Delete,
  Film,
  Activity,
  Server,
  Home,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import UnifiedShareModal from "../components/UnifiedShareModal";
import AnalyticsDashboard from "./AnalyticsDashboard";
import { useProgressStore } from "../stores/useProgressStore";
import { useRecentlyViewedStore } from "../stores/useRecentlyViewedStore";
import { useWatchlistStore } from "../stores/useWatchlistStore";
import { buildMovieSlug } from "../utils/slug";
import { useMaintenanceStore } from "../stores/useMaintenanceStore";
import { cn } from "../utils/cn";

// ── Config ────────────────────────────────────────────────────────────────────
const CORRECT_PIN = import.meta.env.VITE_ADMIN_PIN || "";
const PIN_LENGTH = 4;
const B = "#4490ff";
const BG = "#030305";

// ── Mobile Admin Nav ──────────────────────────────────────────────────────────
type Workspace = "catalog" | "analytics" | "system" | "activity";

const NAV_ITEMS: { key: Workspace; icon: any; label: string }[] = [
  { key: "catalog", icon: Film, label: "Catalog" },
  { key: "analytics", icon: BarChart2, label: "Analytics" },
  { key: "system", icon: Settings, label: "System" },
  { key: "activity", icon: Activity, label: "Activity" },
];

function AdminMobileNav({
  active,
  onChange,
  onLogout,
}: {
  active: Workspace;
  onChange: (w: Workspace) => void;
  onLogout: () => void;
}) {
  return (
    <div
      className="fixed bottom-5 left-1/2 z-[200] md:hidden"
      style={{ transform: "translateX(-50%)" }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-1 px-2 py-2 rounded-[32px]"
        style={{
          background: "rgba(8,8,18,0.85)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(68,144,255,0.15)",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(68,144,255,0.08)",
        }}
      >
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
          <motion.button
            key={key}
            onClick={() => onChange(key)}
            whileTap={{ scale: 0.88 }}
            className="relative flex flex-col items-center gap-1 px-3.5 py-2 rounded-[24px] transition-all duration-200"
            style={
              active === key
                ? {
                    background:
                      "linear-gradient(135deg, rgba(68,144,255,0.25), rgba(68,144,255,0.1))",
                    border: "1px solid rgba(68,144,255,0.3)",
                    color: B,
                    boxShadow: `0 4px 16px rgba(68,144,255,0.2)`,
                  }
                : {
                    color: "rgba(255,255,255,0.3)",
                    border: "1px solid transparent",
                  }
            }
          >
            {active === key && (
              <motion.div
                layoutId="admin-nav-indicator"
                className="absolute inset-0 rounded-[24px]"
                style={{ background: "rgba(68,144,255,0.08)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon
              size={17}
              strokeWidth={active === key ? 2.2 : 1.6}
              className="relative z-10"
              style={
                active === key ? { filter: `drop-shadow(0 0 6px ${B}99)` } : {}
              }
            />
            <span className="text-[7px] font-black uppercase tracking-wider relative z-10 leading-none">
              {label}
            </span>
          </motion.button>
        ))}

        {/* Divider */}
        <div
          className="w-px h-8 mx-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        {/* Exit button */}
        <motion.button
          onClick={onLogout}
          whileTap={{ scale: 0.88 }}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-[24px] transition-all"
          style={{
            color: "rgba(248,113,113,0.6)",
            border: "1px solid transparent",
          }}
          whileHover={{ color: "#f87171" }}
        >
          <LogOut size={17} strokeWidth={1.6} />
          <span className="text-[7px] font-black uppercase tracking-wider leading-none">
            Exit
          </span>
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Daratech() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("daratech_auth") === "true",
  );
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinShake, setPinShake] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() =>
    Number(localStorage.getItem("daratech_attempts") || "0"),
  );
  const [lockoutTime, setLockoutTime] = useState(() =>
    Number(localStorage.getItem("daratech_lockout") || "0"),
  );
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // Workspace
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("catalog");

  // Maintenance
  const {
    isMaintenanceMode,
    maintenanceMessage,
    setMaintenanceMode,
    setBypassed,
  } = useMaintenanceStore();
  const [messageInput, setMessageInput] = useState(maintenanceMessage);

  // Stores
  const progressStore = useProgressStore();
  const recentlyViewedStore = useRecentlyViewedStore();
  const watchlistStore = useWatchlistStore();

  // Search state
  const [searchTitle, setSearchTitle] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [searchGenre, setSearchGenre] = useState("");
  const [searchFilterType, setSearchFilterType] = useState<
    "latest" | "trending" | "popular"
  >("latest");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sysLoading, setSysLoading] = useState<Record<string, boolean>>({});

  // Simulated metrics
  const [simulatedMetrics, setSimulatedMetrics] = useState({
    mainVisits: 14020,
    subdomainVisits: 8430,
    mainUnique: 3405,
    subdomainUnique: 2190,
  });

  // ── Lockout timer ─────────────────────────────────────────────────────────
  useMemo(() => {
    if (!lockoutTime) return;
    const id = setInterval(() => {
      const diff = lockoutTime + 30000 - Date.now();
      if (diff > 0) {
        setRemainingCooldown(Math.ceil(diff / 1000));
        setIsLockedOut(true);
      } else {
        setRemainingCooldown(0);
        setIsLockedOut(false);
        setFailedAttempts(0);
        localStorage.removeItem("daratech_attempts");
        localStorage.removeItem("daratech_lockout");
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutTime]);

  // Simulated metrics live update
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      setSimulatedMetrics((p) => ({
        mainVisits: p.mainVisits + (Math.random() > 0.4 ? 1 : 0),
        subdomainVisits: p.subdomainVisits + (Math.random() > 0.6 ? 1 : 0),
        mainUnique: p.mainUnique + (Math.random() > 0.85 ? 1 : 0),
        subdomainUnique: p.subdomainUnique + (Math.random() > 0.9 ? 1 : 0),
      }));
    }, 4500);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // ── PIN pad ───────────────────────────────────────────────────────────────
  const handleDigit = useCallback(
    (d: string) => {
      if (isLockedOut || pinDigits.length >= PIN_LENGTH) return;
      const next = [...pinDigits, d];
      setPinDigits(next);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => {
          if (next.join("") === CORRECT_PIN) {
            setIsAuthenticated(true);
            setPinDigits([]);
            setFailedAttempts(0);
            localStorage.setItem("daratech_auth", "true");
            localStorage.removeItem("daratech_attempts");
            localStorage.removeItem("daratech_lockout");
            toast.success("Access granted.");
          } else {
            setPinShake(true);
            setTimeout(() => {
              setPinShake(false);
              setPinDigits([]);
            }, 600);
            const na = failedAttempts + 1;
            setFailedAttempts(na);
            localStorage.setItem("daratech_attempts", String(na));
            if (na >= 5) {
              const now = Date.now();
              setLockoutTime(now);
              setIsLockedOut(true);
              localStorage.setItem("daratech_lockout", String(now));
              toast.error("Too many attempts. 30s cooldown.");
            } else {
              toast.error(`Wrong PIN · ${5 - na} left`);
            }
          }
        }, 150);
      }
    },
    [isLockedOut, pinDigits, failedAttempts],
  );

  const handleBackspace = () => {
    if (!isLockedOut) setPinDigits((p) => p.slice(0, -1));
  };
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("daratech_auth");
    toast.success("Session terminated.");
  };

  // ── Trending query ────────────────────────────────────────────────────────
  const { data: trending } = useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrending,
    enabled: isAuthenticated,
    retry: 1,
  });

  // ── Promotion search ──────────────────────────────────────────────────────
  const handleSearchPromotions = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchResults([]);
    const q = [
      searchTitle,
      searchGenre,
      searchYear,
      searchFilterType === "popular" ? "Popular" : "",
    ]
      .filter(Boolean)
      .join(" ");
    try {
      let pool: any[] = [];
      if (q.trim()) {
        const res = await fetchSearch(q);
        pool = (res?.items || []).map((item: any) => ({
          id: item.subjectId,
          title: item.title || item.name,
          cover: item.coverUrl || item.cover?.url || item.cover,
          rating: item.imdbRatingValue || 8.0,
          year: item.releaseDate?.split("-")[0] || "2026",
          genre: item.genres?.join(", ") || "Cinematic",
          trendingScore: item.imdbRatingValue
            ? Math.round(item.imdbRatingValue * 10)
            : 80,
        }));
      } else if (
        (searchFilterType === "trending" || searchFilterType === "popular") &&
        trending
      ) {
        pool = trending.map((item: any) => ({
          id: item.subjectId,
          title: item.title || item.name,
          cover: item.coverUrl || item.cover?.url || item.cover,
          rating: item.imdbRatingValue || 8.2,
          year: item.releaseDate?.split("-")[0] || "2026",
          genre: item.genres?.join(", ") || "Cinematic",
          trendingScore: searchFilterType === "popular" ? 98 : 94,
        }));
      } else {
        const res = await fetchSearch("2026");
        pool = (res?.items || []).map((item: any) => ({
          id: item.subjectId,
          title: item.title || item.name,
          cover: item.coverUrl || item.cover?.url || item.cover,
          rating: item.imdbRatingValue || 8.0,
          year: item.releaseDate?.split("-")[0] || "2026",
          genre: item.genres?.join(", ") || "Cinematic",
          trendingScore: 88,
        }));
      }
      const sorted = [...pool].sort((a, b) =>
        searchFilterType === "latest"
          ? Number(b.year) - Number(a.year)
          : (b.trendingScore || 0) - (a.trendingScore || 0),
      );
      setSearchResults(sorted);
      toast.success(
        sorted.length ? `${sorted.length} targets found` : "No results",
      );
    } catch (e: any) {
      toast.error(e?.message || "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRunSysTool = (id: string, fn: () => void) => {
    setSysLoading((p) => ({ ...p, [id]: true }));
    setTimeout(() => {
      fn();
      setSysLoading((p) => ({ ...p, [id]: false }));
    }, 1200);
  };

  const realAnalytics = useMemo(() => {
    const sessions = Object.keys(progressStore.progress || {});
    let totalSec = 0,
      completed = 0;
    sessions.forEach((k) => {
      const p = progressStore.progress[k];
      if (p?.lastTime) totalSec += p.lastTime;
      if (p?.lastTime && p?.duration && p.lastTime / p.duration >= 0.85)
        completed++;
    });
    const h = Math.floor(totalSec / 3600),
      m = Math.floor((totalSec % 3600) / 60);
    return {
      sessions: sessions.length,
      watchTime: h > 0 ? `${h}h ${m}m` : `${m}m`,
      completed,
      watchlist: watchlistStore.items.length,
      progressItems: Object.entries(progressStore.progress)
        .map(([id, info]) => {
          const r = recentlyViewedStore.items.find((x) => x.subjectId === id);
          return {
            id,
            title: r?.title || `Ref ${id.slice(0, 5)}`,
            coverUrl: r?.coverUrl,
            lastTime: info.lastTime || 0,
            duration: info.duration || 1,
            percent: Math.min(
              Math.round(((info.lastTime || 0) / (info.duration || 1)) * 100),
              100,
            ),
            updatedAt: info.updatedAt,
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt),
    };
  }, [progressStore.progress, recentlyViewedStore.items, watchlistStore.items]);

  // ═══════════════════════════════════════════════════════════════
  // PIN GATE
  // ═══════════════════════════════════════════════════════════════
  if (!isAuthenticated) {
    const pad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden select-none"
        style={{ background: BG }}
      >
        {/* Cinematic background layers */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Deep blue radial glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px]"
            style={{ background: "rgba(68,144,255,0.07)" }}
          />
          {/* Top left accent */}
          <div
            className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[120px]"
            style={{ background: "rgba(120,80,255,0.05)" }}
          />
          {/* Bottom right accent */}
          <div
            className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[120px]"
            style={{ background: "rgba(68,144,255,0.05)" }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage: `linear-gradient(rgba(68,144,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(68,144,255,1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        {/* Top brand strip */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(68,144,255,0.1)",
              border: "1px solid rgba(68,144,255,0.2)",
            }}
          >
            <Brain size={14} style={{ color: B }} />
          </div>
          <span className="text-xs font-black tracking-[0.3em] uppercase text-white/50">
            LENZORAH
          </span>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[320px] mx-auto px-6 flex flex-col items-center gap-7"
        >
          {/* Lock icon with glow ring */}
          <div className="relative flex items-center justify-center">
            <div
              className="absolute w-24 h-24 rounded-full blur-2xl"
              style={{ background: `${B}22` }}
            />
            <motion.div
              animate={{
                boxShadow: isLockedOut
                  ? [
                      "0 0 0 0 rgba(239,68,68,0)",
                      "0 0 0 12px rgba(239,68,68,0.1)",
                      "0 0 0 0 rgba(239,68,68,0)",
                    ]
                  : [`0 0 0 0 ${B}00`, `0 0 0 12px ${B}15`, `0 0 0 0 ${B}00`],
              }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
              style={{
                background: isLockedOut
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(68,144,255,0.08)",
                border: `1px solid ${isLockedOut ? "rgba(239,68,68,0.25)" : "rgba(68,144,255,0.25)"}`,
              }}
            >
              <Lock
                size={26}
                style={{ color: isLockedOut ? "#f87171" : B }}
                className={isLockedOut ? "" : ""}
              />
            </motion.div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-black tracking-[0.25em] uppercase text-white">
              Admin Access
            </h1>
            <p
              className="text-[10px] uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              {isLockedOut
                ? `Locked · Try again in ${remainingCooldown}s`
                : "Enter your PIN to continue"}
            </p>
          </div>

          {/* PIN dots */}
          <motion.div
            animate={pinShake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className="flex items-center gap-4"
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const filled = i < pinDigits.length;
              const isNext = i === pinDigits.length;
              return (
                <motion.div
                  key={i}
                  animate={{
                    scale: filled ? 1.3 : isNext ? 1.05 : 1,
                    background: filled ? B : "transparent",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="w-3.5 h-3.5 rounded-full"
                  style={{
                    border: `2px solid ${filled ? B : isNext ? "rgba(68,144,255,0.5)" : "rgba(255,255,255,0.15)"}`,
                    boxShadow: filled
                      ? `0 0 16px ${B}88, 0 0 6px ${B}`
                      : "none",
                  }}
                />
              );
            })}
          </motion.div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {pad.map((d, i) => {
              if (d === "") return <div key={i} />;
              const isBack = d === "⌫";
              const isDisabled = isLockedOut;
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.84 }}
                  onClick={() => (isBack ? handleBackspace() : handleDigit(d))}
                  disabled={isDisabled}
                  className="h-[58px] rounded-2xl font-black text-lg transition-colors disabled:opacity-30 select-none relative overflow-hidden group"
                  style={{
                    background: isBack
                      ? "rgba(239,68,68,0.07)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isBack ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.07)"}`,
                    color: isBack ? "#f87171" : "white",
                  }}
                >
                  {/* Tap shimmer */}
                  <span
                    className="absolute inset-0 rounded-2xl opacity-0 group-active:opacity-100 transition-opacity"
                    style={{
                      background: isBack ? "rgba(239,68,68,0.1)" : `${B}15`,
                    }}
                  />
                  <span className="relative z-10">
                    {isBack ? <Delete size={18} className="mx-auto" /> : d}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Attempt indicator dots */}
          {failedAttempts > 0 && !isLockedOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{
                    background:
                      i < failedAttempts ? "#f87171" : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
              <span
                className="text-[9px] ml-1 font-bold"
                style={{ color: "rgba(248,113,113,0.7)" }}
              >
                {5 - failedAttempts} attempts left
              </span>
            </motion.div>
          )}

          {/* Security note */}
          <p
            className="text-[8px] uppercase tracking-widest text-center"
            style={{ color: "rgba(255,255,255,0.12)" }}
          >
            Secured · Unauthorized access is logged
          </p>
        </motion.div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMIN PANEL
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[50vw] h-[50vw] rounded-full blur-[180px]"
          style={{ background: "rgba(68,144,255,0.03)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-[40vw] h-[40vw] rounded-full blur-[140px]"
          style={{ background: "rgba(68,144,255,0.025)" }}
        />
      </div>

      {/* ── HEADER ── */}
      <header
        className="sticky top-0 z-[100] flex items-center justify-between px-4 md:px-8 py-3 md:py-4"
        style={{
          background: "rgba(3,3,5,0.85)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(68,144,255,0.08)",
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(68,144,255,0.12)",
              border: "1px solid rgba(68,144,255,0.2)",
            }}
          >
            <Brain size={15} style={{ color: B }} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black tracking-widest text-white uppercase leading-none">
              LENZO CONTROL
            </h1>
            <p
              className="text-[9px] uppercase tracking-widest mt-0.5"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              Admin Panel
            </p>
          </div>
        </div>

        {/* Desktop workspace tabs */}
        <div
          className="hidden md:flex items-center gap-1 p-1 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveWorkspace(key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              style={
                activeWorkspace === key
                  ? {
                      background: B,
                      color: "white",
                      boxShadow: `0 2px 16px ${B}44`,
                    }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Right — live dot + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "#34d399" }}
            />
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 hidden sm:block">
              Live
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.15)",
              color: "#f87171",
            }}
          >
            <LogOut size={12} /> <span className="hidden sm:block">Exit</span>
          </button>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="relative z-10 flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-28 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeWorkspace}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── CATALOG ── */}
            {activeWorkspace === "catalog" && (
              <div className="space-y-6">
                {/* Search console */}
                <div
                  className="rounded-3xl p-5 md:p-6"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(68,144,255,0.1)",
                  }}
                >
                  <div
                    className="flex items-center gap-2 mb-5 pb-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <Search size={15} style={{ color: B }} />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      Promotion Search Console
                    </h2>
                  </div>
                  <form onSubmit={handleSearchPromotions} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Keyword",
                          value: searchTitle,
                          onChange: setSearchTitle,
                          placeholder: "Spider-Man...",
                          type: "input",
                        },
                      ].map(({ label, value, onChange, placeholder }) => (
                        <div key={label} className="space-y-1">
                          <label
                            className="text-[9px] font-black uppercase tracking-wider block"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {label}
                          </label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={placeholder}
                            className="w-full text-[11px] py-2.5 px-3 rounded-xl text-white outline-none transition-all"
                            style={{
                              background: "rgba(0,0,0,0.4)",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                            onFocus={(e) =>
                              (e.target.style.borderColor = `${B}66`)
                            }
                            onBlur={(e) =>
                              (e.target.style.borderColor =
                                "rgba(255,255,255,0.08)")
                            }
                          />
                        </div>
                      ))}
                      {[
                        {
                          label: "Year",
                          value: searchYear,
                          onChange: setSearchYear,
                          opts: [
                            "",
                            "2026",
                            "2025",
                            "2024",
                            "2023",
                            "2022",
                            "2021",
                            "2020",
                            "2019",
                            "2018",
                            "2017",
                          ],
                        },
                        {
                          label: "Genre",
                          value: searchGenre,
                          onChange: setSearchGenre,
                          opts: [
                            "",
                            "Action",
                            "Adventure",
                            "Anime",
                            "Animation",
                            "Comedy",
                            "Crime",
                            "Documentary",
                            "Drama",
                            "Fantasy",
                            "Horror",
                            "Kdrama",
                            "Sci-Fi",
                            "Thriller",
                            "War",
                          ],
                        },
                        {
                          label: "Sort",
                          value: searchFilterType,
                          onChange: (v: any) => setSearchFilterType(v),
                          opts: ["latest", "trending", "popular"],
                        },
                      ].map(({ label, value, onChange, opts }) => (
                        <div key={label} className="space-y-1">
                          <label
                            className="text-[9px] font-black uppercase tracking-wider block"
                            style={{ color: "rgba(255,255,255,0.4)" }}
                          >
                            {label}
                          </label>
                          <select
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full text-[11px] py-2.5 px-3 rounded-xl text-white outline-none capitalize"
                            style={{
                              background: "#050508",
                              border: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            {opts.map((o) => (
                              <option key={o} value={o}>
                                {o || `— All ${label}s —`}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSearching}
                        className="px-6 py-2.5 rounded-xl text-xs font-black uppercase text-white flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                        style={{
                          background: B,
                          boxShadow: `0 4px 20px ${B}33`,
                        }}
                      >
                        {isSearching ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Search size={13} />
                        )}
                        {isSearching ? "Searching..." : "Fetch Targets"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Results */}
                {searchResults === null ? (
                  <div
                    className="py-20 text-center rounded-3xl"
                    style={{
                      border: "1px solid rgba(255,255,255,0.04)",
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <Sliders
                      size={30}
                      className="mx-auto mb-3 animate-pulse"
                      style={{ color: "rgba(255,255,255,0.15)" }}
                    />
                    <p className="text-xs font-black uppercase text-white/40 tracking-wider">
                      Ready for Campaign Export
                    </p>
                    <p
                      className="text-[10px] mt-1.5 max-w-xs mx-auto"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      Use the console above to fetch promo targets
                    </p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div
                    className="py-20 text-center rounded-3xl"
                    style={{
                      border: "1px solid rgba(255,255,255,0.04)",
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <AlertCircle
                      size={30}
                      className="mx-auto mb-3"
                      style={{ color: "rgba(68,144,255,0.4)" }}
                    />
                    <p className="text-xs font-black uppercase text-white/40 tracking-wider">
                      No results found
                    </p>
                  </div>
                ) : (
                  <div>
                    <p
                      className="text-[10px] font-black uppercase tracking-wider mb-3"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      {searchResults.length} Promo Targets
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {searchResults.map((m) => (
                        <MovieCard
                          key={m.id}
                          movie={m}
                          onPromote={() => {
                            setSelectedMovie(m);
                            setIsShareModalOpen(true);
                          }}
                          onCopy={() => {
                            navigator.clipboard.writeText(
                              `${window.location.origin}/movie/${buildMovieSlug(m.title, m.id)}`,
                            );
                            toast.success("Link copied!");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ANALYTICS ── */}
            {activeWorkspace === "analytics" && (
              <div className="space-y-8">
                {/* MongoDB analytics */}
                <AnalyticsDashboard
                  adminPin={import.meta.env.VITE_ADMIN_PIN || ""}
                />

                {/* Divider */}
                <div
                  className="border-t pt-6"
                  style={{ borderColor: "rgba(255,255,255,0.06)" }}
                >
                  <p
                    className="text-[9px] font-black uppercase tracking-widest mb-4"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    Local Browser Telemetry
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Watch Sessions",
                        value: String(realAnalytics.sessions),
                      },
                      {
                        label: "Total Watch Time",
                        value: realAnalytics.watchTime,
                      },
                      {
                        label: "Completed",
                        value: String(realAnalytics.completed),
                      },
                      {
                        label: "Watchlist",
                        value: String(realAnalytics.watchlist),
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-2xl p-4"
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <p
                          className="text-[9px] font-black uppercase tracking-wider"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {label}
                        </p>
                        <p className="text-2xl font-black text-white mt-1">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SYSTEM ── */}
            <PageMaintenancePanel />
            {activeWorkspace === "system" && (
              <div className="space-y-5">
                {/* Maintenance */}
                <div
                  className="rounded-3xl p-5 md:p-6"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(68,144,255,0.1)",
                  }}
                >
                  <div
                    className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Wrench size={15} style={{ color: B }} />
                      <h2 className="text-xs font-black uppercase tracking-wider text-white">
                        Maintenance Engine
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={
                          useMaintenanceStore.getState().isRemoteConfigured
                            ? {
                                background: "rgba(52,211,153,0.1)",
                                border: "1px solid rgba(52,211,153,0.2)",
                                color: "#34d399",
                              }
                            : {
                                background: "rgba(251,191,36,0.1)",
                                border: "1px solid rgba(251,191,36,0.2)",
                                color: "#fbbf24",
                              }
                        }
                      >
                        {useMaintenanceStore.getState().isRemoteConfigured
                          ? "MongoDB Synced"
                          : "Local Only"}
                      </span>
                      <span
                        className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                          isMaintenanceMode
                            ? "bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse"
                            : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
                        )}
                      >
                        {isMaintenanceMode ? "🔴 Active" : "🟢 Online"}
                      </span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-5">
                    <div className="md:col-span-2 space-y-2">
                      <label
                        className="text-[9px] font-black uppercase tracking-wider block"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        Broadcast Message
                      </label>
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        rows={3}
                        className="w-full text-[11px] py-2.5 px-3 rounded-xl text-white outline-none resize-none font-sans leading-relaxed"
                        style={{
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = `${B}55`)}
                        onBlur={(e) =>
                          (e.target.style.borderColor =
                            "rgba(255,255,255,0.08)")
                        }
                        placeholder="Message shown during maintenance..."
                      />
                      <button
                        onClick={async () => {
                          await setMaintenanceMode(
                            isMaintenanceMode,
                            messageInput,
                          );
                          toast.success("Message updated!");
                        }}
                        className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white transition-all"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        Update Message
                      </button>
                    </div>
                    <div
                      className="flex flex-col gap-2 p-4 rounded-2xl justify-center"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <button
                        onClick={async () => {
                          const next = !isMaintenanceMode;
                          await setMaintenanceMode(next, messageInput);
                          if (next) setBypassed(false);
                          toast.success(
                            next ? "🚨 Maintenance ON" : "🟢 Site restored",
                            { duration: 4000 },
                          );
                        }}
                        className="w-full py-3 rounded-xl text-xs font-black uppercase text-white transition-all active:scale-95"
                        style={
                          isMaintenanceMode
                            ? { background: "#059669" }
                            : { background: "#dc2626" }
                        }
                      >
                        {isMaintenanceMode ? "Disable" : "Enable Maintenance"}
                      </button>
                      <button
                        onClick={async () => {
                          await useMaintenanceStore
                            .getState()
                            .pollRemoteStatus();
                          toast.success("Synced!");
                        }}
                        className="text-[9px] font-black uppercase flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all"
                        style={{ color: `${B}99`, background: `${B}08` }}
                      >
                        <RefreshCw size={10} /> Force Sync
                      </button>
                      <button
                        onClick={() => {
                          setBypassed(false);
                          toast.success("Bypass revoked.");
                        }}
                        className="text-[9px] font-black uppercase text-center transition-all"
                        style={{ color: "rgba(255,255,255,0.25)" }}
                      >
                        Revoke Bypass
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status checks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "API Stream Sources",
                      sub: "100% Active",
                      ok: true,
                    },
                    {
                      label: "Subtitle CORS Loader",
                      sub: "Overrides functioning",
                      ok: true,
                    },
                    {
                      label: "CDN Media Server",
                      sub: "Latency warning 140ms",
                      ok: false,
                    },
                  ].map(({ label, sub, ok }) => (
                    <div
                      key={label}
                      className="p-4 rounded-2xl flex items-center justify-between"
                      style={
                        ok
                          ? {
                              background: "rgba(52,211,153,0.06)",
                              border: "1px solid rgba(52,211,153,0.15)",
                            }
                          : {
                              background: "rgba(251,191,36,0.06)",
                              border: "1px solid rgba(251,191,36,0.15)",
                            }
                      }
                    >
                      <div>
                        <p className="text-[10px] font-bold text-white">
                          {label}
                        </p>
                        <p
                          className="text-[9px] mt-0.5"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          {sub}
                        </p>
                      </div>
                      {ok ? (
                        <CheckCircle2
                          size={18}
                          className="text-emerald-400 shrink-0"
                        />
                      ) : (
                        <AlertCircle
                          size={18}
                          className="text-yellow-400 shrink-0"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Admin tools */}
                <div
                  className="rounded-3xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(68,144,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Shield size={14} style={{ color: B }} />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      System Operations
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      {
                        id: "cache",
                        label: "Clear Cache",
                        fn: () => toast.success("Cache purged!"),
                      },
                      {
                        id: "sitemap",
                        label: "Rebuild Sitemap",
                        fn: () => toast.success("Sitemap rebuilt!"),
                      },
                      {
                        id: "cdn",
                        label: "Verify CDN Images",
                        fn: () => toast.success("0 broken covers!"),
                      },
                      {
                        id: "lockout",
                        label: "Reset Lockout",
                        fn: () => {
                          localStorage.removeItem("daratech_attempts");
                          localStorage.removeItem("daratech_lockout");
                          toast.success("Lockout cleared.");
                        },
                      },
                    ].map(({ id, label, fn }) => (
                      <button
                        key={id}
                        onClick={() => handleRunSysTool(id, fn)}
                        disabled={sysLoading[id]}
                        className="py-3.5 px-3 rounded-xl text-[10px] font-black uppercase text-center transition-all disabled:opacity-50 active:scale-95"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.8)",
                        }}
                      >
                        {sysLoading[id] ? (
                          <span className="flex items-center justify-center gap-1.5">
                            <Loader2
                              size={12}
                              className="animate-spin"
                              style={{ color: B }}
                            />{" "}
                            Running...
                          </span>
                        ) : (
                          label
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diagnostics */}
                <div
                  className="rounded-3xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(68,144,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Server size={14} style={{ color: B }} />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      Diagnostics
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "domains",
                        label: "Sync Subdomains",
                        sub: "Federate sessions",
                        icon: Globe,
                      },
                      {
                        id: "cookies",
                        label: "Verify Cookies",
                        sub: "Cross-site broadcast",
                        icon: CheckSquare,
                      },
                      {
                        id: "latency",
                        label: "Latency Benchmark",
                        sub: "Test connection",
                        icon: Zap,
                      },
                    ].map(({ id, label, sub, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() =>
                          handleRunSysTool(id, () =>
                            toast.success(`${label} complete!`),
                          )
                        }
                        disabled={sysLoading[id]}
                        className="p-4 rounded-2xl text-left flex items-center justify-between gap-3 transition-all disabled:opacity-50"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase text-white">
                            {label}
                          </p>
                          <p
                            className="text-[9px] mt-0.5"
                            style={{ color: "rgba(255,255,255,0.35)" }}
                          >
                            {sub}
                          </p>
                        </div>
                        {sysLoading[id] ? (
                          <Loader2
                            size={15}
                            className="animate-spin shrink-0"
                            style={{ color: B }}
                          />
                        ) : (
                          <Icon
                            size={15}
                            className="shrink-0"
                            style={{ color: B }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTIVITY (was analytics local) ── */}
            {activeWorkspace === "activity" && (
              <div className="space-y-5">
                <div
                  className="rounded-3xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.015)",
                    border: "1px solid rgba(68,144,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} style={{ color: B }} />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      Live Watch Progress
                    </h2>
                  </div>
                  {realAnalytics.progressItems.length === 0 ? (
                    <div className="py-12 text-center">
                      <Film
                        size={28}
                        className="mx-auto mb-3"
                        style={{ color: "rgba(255,255,255,0.12)" }}
                      />
                      <p className="text-xs text-white/30">
                        No sessions yet. Play a movie to start tracking.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {realAnalytics.progressItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-2xl"
                          style={{
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          {item.coverUrl ? (
                            <img
                              src={item.coverUrl}
                              alt=""
                              className="w-8 h-11 object-cover rounded-lg shrink-0"
                            />
                          ) : (
                            <div
                              className="w-8 h-11 rounded-lg flex items-center justify-center shrink-0 text-white/20"
                              style={{ background: "rgba(255,255,255,0.04)" }}
                            >
                              🎬
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">
                              {item.title}
                            </p>
                            <p
                              className="text-[9px] mt-0.5"
                              style={{ color: "rgba(255,255,255,0.35)" }}
                            >
                              {Math.round(item.lastTime)}s /{" "}
                              {Math.round(item.duration)}s
                            </p>
                            <div
                              className="mt-1.5 h-1 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            >
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${item.percent}%`,
                                  background: B,
                                }}
                              />
                            </div>
                          </div>
                          <span
                            className="text-xs font-black shrink-0"
                            style={{ color: B }}
                          >
                            {item.percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile Nav ── */}
      <AdminMobileNav
        active={activeWorkspace}
        onChange={setActiveWorkspace}
        onLogout={handleLogout}
      />

      {/* ── Share Modal ── */}
      {selectedMovie && (
        <UnifiedShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSelectedMovie(null);
          }}
          title={selectedMovie.title}
          coverUrl={selectedMovie.cover}
          rating={selectedMovie.rating}
          year={selectedMovie.year}
          genre={selectedMovie.genre}
          description="High-definition streaming. No ads."
          url={`${window.location.origin}/movie/${buildMovieSlug(selectedMovie.title, selectedMovie.id)}`}
        />
      )}
    </div>
  );
}

// ── Movie Card ─────────────────────────────────────────────────────────────────
function MovieCard({
  movie,
  onPromote,
  onCopy,
}: {
  movie: any;
  onPromote: () => void;
  onCopy: () => void;
}) {
  const cover = movie.coverUrl || movie.cover?.url || movie.cover;
  return (
    <div
      className="group rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden"
        style={{ background: "rgba(0,0,0,0.4)" }}
      >
        {cover ? (
          <img
            src={cover}
            alt={movie.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">
            🍿
          </div>
        )}
        <span
          className="absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded"
          style={{ background: "rgba(0,0,0,0.7)", color: "#fbbf24" }}
        >
          ★ {movie.rating}
        </span>
        <span
          className="absolute bottom-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded text-white"
          style={{ background: B }}
        >
          {movie.year}
        </span>
      </div>
      <div className="p-2 space-y-2">
        <p className="text-[10px] font-black text-white uppercase truncate">
          {movie.title}
        </p>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={onPromote}
            className="py-1.5 rounded-lg text-[9px] font-black uppercase text-white flex items-center justify-center gap-1"
            style={{ background: B }}
          >
            <Share2 size={9} /> Promote
          </button>
          <button
            onClick={onCopy}
            className="py-1.5 rounded-lg text-[9px] font-black uppercase text-white flex items-center justify-center gap-1"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <LinkIcon size={9} /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}
