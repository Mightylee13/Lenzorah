/**
 * AnalyticsDashboard.tsx — Full redesign
 * - Live active users counter (heartbeat)
 * - Event breakdown as stat boxes
 * - Most Watched / Top Pages / Recent Activity as collapsible dropdowns
 * - No overlapping — each section is fully independent
 */

import { useEffect, useState, useRef } from "react";
import {
  BarChart3,
  Eye,
  Play,
  Download,
  Search,
  Bookmark,
  TrendingUp,
  Clock,
  Film,
  RefreshCw,
  AlertCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Globe,
  Activity,
  Wifi,
  MoreHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const API = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.replace(
  /\/$/,
  "",
);
const B = "#4490ff";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Summary {
  totals: {
    totalViews: number;
    viewsToday: number;
    viewsWeek: number;
    viewsMonth: number;
    uniqueVisitors: number;
  };
  topPages: { _id: string; count: number; title: string }[];
  topMovies: {
    subjectId: string;
    title: string;
    views: number;
    lastWatched: string;
  }[];
  eventCounts: { _id: string; count: number }[];
  recentActivity: { type: string; title: string; timestamp: string }[];
  dailyViews: { _id: string; count: number }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n ?? 0);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const EVENT_META: Record<
  string,
  { icon: any; color: string; bg: string; label: string }
> = {
  play: { icon: Play, color: B, bg: `${B}15`, label: "Plays" },
  download: {
    icon: Download,
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    label: "Downloads",
  },
  search: {
    icon: Search,
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.1)",
    label: "Searches",
  },
  watchlist_add: {
    icon: Bookmark,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    label: "Watchlist+",
  },
  watchlist_remove: {
    icon: Bookmark,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    label: "Watchlist-",
  },
  unique_visitor: {
    icon: Users,
    color: "#f472b6",
    bg: "rgba(244,114,182,0.1)",
    label: "New Users",
  },
};

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({
  icon,
  title,
  count,
  color,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header — clickable */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02] text-left"
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-xs font-black uppercase tracking-wider text-white flex-1">
          {title}
        </span>
        {count !== undefined && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full mr-2"
            style={{
              background: `${color}12`,
              color,
              border: `1px solid ${color}20`,
            }}
          >
            {count}
          </span>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div
              className="px-5 pb-5 pt-1"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  adminPin: string;
}

export default function AnalyticsDashboard({ adminPin }: Props) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [activeAnim, setActiveAnim] = useState(false);
  const prevActive = useRef<number | null>(null);

  // ── Fetch summary ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    if (!API) {
      setError("VITE_ANALYTICS_URL is not set.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/analytics/summary`, {
        headers: { "x-admin-pin": adminPin },
      });
      if (!res.ok)
        throw new Error(
          res.status === 401 ? "Invalid admin PIN" : `Error ${res.status}`,
        );
      setData(await res.json());
      setLastFetch(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Poll active users every 15s ────────────────────────────────────────────
  const fetchActive = async () => {
    if (!API) return;
    try {
      const res = await fetch(`${API}/api/analytics/active`, {
        headers: { "x-admin-pin": adminPin },
      });
      if (!res.ok) return;
      const { activeCount } = await res.json();
      if (prevActive.current !== null && activeCount !== prevActive.current) {
        setActiveAnim(true);
        setTimeout(() => setActiveAnim(false), 800);
      }
      prevActive.current = activeCount;
      setActiveUsers(activeCount);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    fetchActive();
    const summaryId = setInterval(fetchData, 60_000);
    const activeId = setInterval(fetchActive, 15_000);
    return () => {
      clearInterval(summaryId);
      clearInterval(activeId);
    };
  }, [adminPin]);

  const maxDaily = data
    ? Math.max(...data.dailyViews.map((d) => d.count), 1)
    : 1;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <BarChart3 size={18} style={{ color: B }} /> Live Analytics
          </h2>
          {lastFetch && (
            <p
              className="text-[9px] mt-0.5"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Updated {timeAgo(lastFetch.toISOString())} · auto-refreshes every
              60s
            </p>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{
            background: "rgba(68,144,255,0.08)",
            border: "1px solid rgba(68,144,255,0.2)",
            color: B,
          }}
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-400">Analytics Error</p>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {error}
            </p>
          </div>
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-2xl animate-pulse"
              style={{ background: "rgba(255,255,255,0.03)" }}
            />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── ROW 1: Active users (live) + stat cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Active users — highlighted */}
            <motion.div
              animate={activeAnim ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              className="col-span-2 md:col-span-1 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(68,144,255,0.1), rgba(68,144,255,0.04))",
                border: `1px solid ${B}30`,
                boxShadow: `0 4px 24px ${B}15`,
              }}
            >
              {/* Pulsing live dot */}
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${B}15`, border: `1px solid ${B}25` }}
                >
                  <Users size={20} style={{ color: B }} />
                </div>
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#030305]"
                  style={{ background: "#34d399" }}
                >
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: "#34d399", opacity: 0.5 }}
                  />
                </span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">
                  {activeUsers !== null ? activeUsers : "—"}
                </p>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: B }}
                >
                  Currently Online
                </p>
                <p
                  className="text-[9px] mt-0.5"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  updates every 15s
                </p>
              </div>
            </motion.div>

            {/* Unique devices */}
            <StatCard
              label="Unique Devices"
              value={data.totals.uniqueVisitors ?? 0}
              icon={<Eye size={15} />}
              color="white"
            />

            {/* Today */}
            <StatCard
              label="Views Today"
              value={data.totals.viewsToday}
              icon={<Clock size={15} />}
              color={B}
            />

            {/* Week */}
            <StatCard
              label="This Week"
              value={data.totals.viewsWeek}
              icon={<TrendingUp size={15} />}
              color="#34d399"
            />

            {/* Month */}
            <StatCard
              label="This Month"
              value={data.totals.viewsMonth}
              icon={<BarChart3 size={15} />}
              color="#a78bfa"
            />

            {/* Total */}
            <StatCard
              label="Total Views"
              value={data.totals.totalViews}
              icon={<Globe size={15} />}
              color="#f472b6"
            />
          </div>

          {/* ── ROW 2: Event breakdown boxes ── */}
          {data.eventCounts.length > 0 && (
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-widest mb-2.5"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                Event Breakdown
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {data.eventCounts.map(({ _id, count }) => {
                  const meta = EVENT_META[_id] ?? {
                    icon: MoreHorizontal,
                    color: "rgba(255,255,255,0.5)",
                    bg: "rgba(255,255,255,0.04)",
                    label: _id.replace(/_/g, " "),
                  };
                  const Icon = meta.icon;
                  return (
                    <div
                      key={_id}
                      className="rounded-xl p-3 flex flex-col gap-1.5"
                      style={{
                        background: meta.bg,
                        border: `1px solid ${meta.color}20`,
                      }}
                    >
                      <Icon size={13} style={{ color: meta.color }} />
                      <p
                        className="text-base font-black"
                        style={{ color: meta.color }}
                      >
                        {fmt(count)}
                      </p>
                      <p
                        className="text-[9px] font-bold capitalize leading-tight"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        {meta.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── ROW 3: Daily chart (always open, not collapsible) ── */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <TrendingUp size={13} className="text-emerald-400" /> Daily Views
              — 14 Days
            </p>
            {data.dailyViews.length === 0 ? (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                No data yet. Views appear once tracking is wired in.
              </p>
            ) : (
              <div className="flex items-end gap-1 h-24">
                {data.dailyViews.map(({ _id, count }) => (
                  <div
                    key={_id}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <div
                      className="w-full rounded-t-sm transition-all duration-500 relative cursor-pointer"
                      style={{
                        height: `${Math.max((count / maxDaily) * 100, 4)}%`,
                        background: `${B}70`,
                        minHeight: "4px",
                      }}
                      title={`${_id}: ${count}`}
                    >
                      {/* Tooltip */}
                      <div
                        className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
                        style={{ border: `1px solid ${B}40` }}
                      >
                        {count}
                      </div>
                    </div>
                    <span
                      className="text-[6px] whitespace-nowrap"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      {_id.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 4: Collapsible sections — stacked, never overlapping ── */}
          <div className="space-y-2">
            {/* Most Watched */}
            <Section
              icon={<Film size={14} />}
              title="Most Watched"
              count={data.topMovies.length}
              color={B}
              defaultOpen
            >
              {data.topMovies.length === 0 ? (
                <p
                  className="text-xs pt-3"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No plays tracked yet. Wire trackPlay() into your player.
                </p>
              ) : (
                <div className="space-y-3 pt-3">
                  {data.topMovies.map((m, i) => (
                    <div key={m.subjectId} className="flex items-center gap-3">
                      <span
                        className="text-[10px] font-black w-5 shrink-0 text-center py-1 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {m.title}
                        </p>
                        <div
                          className="mt-1.5 h-1 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max((m.views / (data.topMovies[0]?.views || 1)) * 100, 4)}%`,
                              background: B,
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-black shrink-0"
                        style={{ color: B }}
                      >
                        {fmt(m.views)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Top Pages */}
            <Section
              icon={<Eye size={14} />}
              title="Top Pages"
              count={data.topPages.length}
              color="#60a5fa"
            >
              {data.topPages.length === 0 ? (
                <p
                  className="text-xs pt-3"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No pages tracked yet.
                </p>
              ) : (
                <div className="space-y-0 pt-3">
                  {data.topPages.map(({ _id, count, title }, i) => (
                    <div
                      key={_id}
                      className="flex items-center justify-between gap-3 py-2.5"
                      style={{
                        borderBottom:
                          i < data.topPages.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                      }}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span
                          className="text-[9px] font-black w-4 shrink-0 text-center"
                          style={{ color: "rgba(255,255,255,0.25)" }}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {title || _id}
                          </p>
                          <p
                            className="text-[9px] truncate"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            {_id}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black shrink-0 text-blue-400">
                        {fmt(count)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Recent Activity */}
            <Section
              icon={<Activity size={14} />}
              title="Recent Activity"
              count={data.recentActivity.length}
              color="#fbbf24"
            >
              {data.recentActivity.length === 0 ? (
                <p
                  className="text-xs pt-3"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-0 pt-3">
                  {data.recentActivity.map((ev, i) => {
                    const meta = EVENT_META[ev.type];
                    const Icon = meta?.icon ?? BarChart3;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-2.5"
                        style={{
                          borderBottom:
                            i < data.recentActivity.length - 1
                              ? "1px solid rgba(255,255,255,0.04)"
                              : "none",
                        }}
                      >
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: meta?.bg ?? "rgba(255,255,255,0.04)",
                          }}
                        >
                          <Icon
                            size={12}
                            style={{
                              color: meta?.color ?? "rgba(255,255,255,0.4)",
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {ev.title || "—"}
                          </p>
                          <p
                            className="text-[9px] font-bold capitalize"
                            style={{
                              color: meta?.color ?? "rgba(255,255,255,0.3)",
                            }}
                          >
                            {ev.type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <span
                          className="text-[9px] shrink-0 tabular-nums"
                          style={{ color: "rgba(255,255,255,0.3)" }}
                        >
                          {timeAgo(ev.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

// ── Small stat card ───────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ color, opacity: 0.7 }}>{icon}</span>
      <div>
        <p className="text-xl font-black" style={{ color }}>
          {fmt(value)}
        </p>
        <p
          className="text-[9px] mt-0.5 font-medium uppercase tracking-wider"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}
