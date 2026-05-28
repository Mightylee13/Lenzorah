/**
 * AnalyticsDashboard.tsx
 * Uses VITE_ANALYTICS_URL (your Express server), NOT VITE_API_BASE (movie API).
 */

import { useEffect, useState } from "react";
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
} from "lucide-react";

// ← KEY FIX: use VITE_ANALYTICS_URL not VITE_API_BASE
const API = (import.meta.env.VITE_ANALYTICS_URL as string | undefined)?.replace(
  /\/$/,
  "",
);

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

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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

const EVENT_ICONS: Record<string, React.ReactNode> = {
  play: <Play size={12} style={{ color: "#4490ff" }} />,
  download: <Download size={12} className="text-emerald-400" />,
  search: <Search size={12} className="text-yellow-400" />,
  watchlist_add: <Bookmark size={12} className="text-purple-400" />,
  watchlist_remove: <Bookmark size={12} className="text-white/30" />,
};

const EVENT_COLORS: Record<string, string> = {
  play: "text-[#4490ff]",
  download: "text-emerald-400",
  search: "text-yellow-400",
  watchlist_add: "text-purple-400",
  watchlist_remove: "text-white/40",
};

interface Props {
  adminPin: string;
}

export default function AnalyticsDashboard({ adminPin }: Props) {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = async () => {
    if (!API) {
      setError(
        "VITE_ANALYTICS_URL is not set. Add it to your Render frontend environment variables pointing to your Express server.",
      );
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
          res.status === 401
            ? "Invalid admin PIN"
            : `Server error ${res.status}`,
        );
      setData(await res.json());
      setLastFetch(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [adminPin]);

  const maxDaily = data
    ? Math.max(...data.dailyViews.map((d) => d.count), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <BarChart3 size={20} style={{ color: "#4490ff" }} /> Live Analytics
          </h2>
          {lastFetch && (
            <p
              className="text-[10px] mt-0.5"
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{
            background: "rgba(68,144,255,0.08)",
            border: "1px solid rgba(68,144,255,0.2)",
            color: "#4490ff",
          }}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />{" "}
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
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

      {/* Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl animate-pulse"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Unique Devices",
                value: data.totals.uniqueVisitors ?? 0,
                icon: <Eye size={16} />,
                color: "white",
              },
              {
                label: "Today",
                value: data.totals.viewsToday,
                icon: <Clock size={16} />,
                color: "#4490ff",
              },
              {
                label: "This Week",
                value: data.totals.viewsWeek,
                icon: <TrendingUp size={16} />,
                color: "#34d399",
              },
              {
                label: "This Month",
                value: data.totals.viewsMonth,
                icon: <BarChart3 size={16} />,
                color: "#a78bfa",
              },
            ].map(({ label, value, icon, color }) => (
              <div
                key={label}
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
                    className="text-[10px] mt-0.5 font-medium"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    {label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Event breakdown */}
          {data.eventCounts.length > 0 && (
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <Play size={13} style={{ color: "#4490ff" }} /> Event Breakdown
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.eventCounts.map(({ _id, count }) => (
                  <div
                    key={_id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {EVENT_ICONS[_id] ?? (
                      <BarChart3 size={12} className="text-white/40" />
                    )}
                    <span
                      className={`text-[11px] font-bold capitalize ${EVENT_COLORS[_id] ?? "text-white/60"}`}
                    >
                      {_id.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-black text-white">
                      {fmt(count)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart + Top Movies */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Daily bar chart */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                <TrendingUp size={13} className="text-emerald-400" /> Daily
                Views (14 days)
              </h3>
              {data.dailyViews.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No data yet — page views will appear here once tracked.
                </p>
              ) : (
                <div className="flex items-end gap-1.5 h-28">
                  {data.dailyViews.map(({ _id, count }) => (
                    <div
                      key={_id}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <div
                        className="w-full rounded-sm transition-all duration-300 relative"
                        style={{
                          height: `${Math.max((count / maxDaily) * 100, 4)}%`,
                          background: "rgba(68,144,255,0.6)",
                        }}
                        title={`${_id}: ${count}`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {count}
                        </div>
                      </div>
                      <span
                        className="text-[7px] rotate-45 origin-left whitespace-nowrap"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {_id.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Movies */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-white mb-4 flex items-center gap-2">
                <Film size={13} style={{ color: "#4490ff" }} /> Most Watched
              </h3>
              {data.topMovies.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No plays tracked yet. Wire trackPlay() into your player.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.topMovies.map((m, i) => (
                    <div key={m.subjectId} className="flex items-center gap-3">
                      <span
                        className="text-[10px] font-black w-4 shrink-0"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {m.title}
                        </p>
                        <div
                          className="mt-1 h-1 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max((m.views / (data.topMovies[0]?.views || 1)) * 100, 4)}%`,
                              background: "#4490ff",
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-black shrink-0"
                        style={{ color: "#4490ff" }}
                      >
                        {fmt(m.views)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Pages + Recent Activity */}
          <div className="grid md:grid-cols-2 gap-4">
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <Eye size={13} className="text-blue-400" /> Top Pages
              </h3>
              {data.topPages.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No pages tracked yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.topPages.map(({ _id, count, title }) => (
                    <div
                      key={_id}
                      className="flex items-center justify-between gap-3 py-1.5 border-b last:border-0"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    >
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
                      <span className="text-xs font-black text-blue-400 shrink-0">
                        {fmt(count)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <Clock size={13} className="text-yellow-400" /> Recent Activity
              </h3>
              {data.recentActivity.length === 0 ? (
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  No activity yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.recentActivity.map((ev, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 py-1.5 border-b last:border-0"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    >
                      <div
                        className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,255,255,0.04)" }}
                      >
                        {EVENT_ICONS[ev.type] ?? (
                          <BarChart3 size={10} className="text-white/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {ev.title || "—"}
                        </p>
                        <p
                          className={`text-[9px] capitalize font-semibold ${EVENT_COLORS[ev.type] ?? "text-white/30"}`}
                        >
                          {ev.type.replace(/_/g, " ")}
                        </p>
                      </div>
                      <span
                        className="text-[9px] shrink-0"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      >
                        {timeAgo(ev.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
