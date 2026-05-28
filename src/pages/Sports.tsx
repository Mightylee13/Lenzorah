/**
 * Sports.tsx — SportSRC v2 (primary) + sportapi.ai (automatic backup)
 * Replace src/pages/Sports.tsx with this file.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Shield,
  Loader2,
  Tv,
  Radio,
  ChevronRight,
  Wifi,
  CalendarDays,
  Play,
  MapPin,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "../utils/cn";

// ─── API Config ───────────────────────────────────────────────────────────────
// Detect if running locally to use your local Vite proxy configurations [1]
const isLocal = typeof window !== "undefined" && (
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1"
);

const PRIMARY_BASE = isLocal
  ? "/api-sportsrc/"
  : (import.meta.env.VITE_SPORTSRC_BASE || "https://api.sportsrc.org/v2/");
const PRIMARY_KEY = import.meta.env.VITE_SPORTSRC_KEY as string;


const BACKUP_BASE = isLocal
  ? "/api-sportapi"
  : (import.meta.env.VITE_SPORTAPI_BASE || "https://api.sportapi.ai/v1");
const BACKUP_KEY = import.meta.env.VITE_SPORTAPI_KEY as string;
// ─── Cache ────────────────────────────────────────────────────────────────────
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function cacheSet(key: string, data: any) {
  try {
    localStorage.setItem(`sp_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}
function cacheGet(key: string): any | null {
  try {
    const raw = localStorage.getItem(`sp_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return Date.now() - ts > CACHE_TTL ? null : data;
  } catch {
    return null;
  }
}
function cacheGetStale(key: string): { data: any; ts: number } | null {
  try {
    const raw = localStorage.getItem(`sp_${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function cacheAgeLabel(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type DataSource = "primary" | "backup" | "cache" | null;

interface Match {
  id: string;
  home: { name: string; logo?: string; score?: number | string };
  away: { name: string; logo?: string; score?: number | string };
  status: string;
  time?: string;
  league?: string;
  leagueLogo?: string;
  venue?: string;
  date?: string;
  has_stream?: boolean;
  streamUrl?: string;
}

interface Channel {
  id: string;
  name: string;
  logo?: string;
  country?: string;
  stream_url?: string;
  is_live?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarUrl(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e293b&color=4490ff&bold=true&size=64`;
}

// Parse SportSRC match shape
function parsePrimaryMatch(raw: any): Match {
  const h = raw.home || raw.homeTeam || {};
  const a = raw.away || raw.awayTeam || {};
  return {
    id: String(raw.id || raw.match_id || Math.random()),
    home: {
      name: h.name || h.shortName || raw.home_name || "Home",
      logo: h.logo || h.image,
      score: h.score ?? raw.home_score,
    },
    away: {
      name: a.name || a.shortName || raw.away_name || "Away",
      logo: a.logo || a.image,
      score: a.score ?? raw.away_score,
    },
    status: raw.status || raw.state || "unknown",
    time: raw.time || raw.clock || raw.matchTime,
    league:
      raw.league?.name ||
      raw.league ||
      raw.competition?.name ||
      raw.competition,
    leagueLogo: raw.league?.logo || raw.competition?.logo,
    venue: raw.venue || raw.stadium,
    date: raw.date || raw.start_date || raw.scheduled,
    has_stream: raw.has_stream ?? false,
    streamUrl: raw.stream_url || raw.embed,
  };
}

// Parse sportapi.ai match shape
function parseBackupMatch(raw: any): Match {
  return {
    id: String(raw.match_id || raw.id || Math.random()),
    home: {
      name: raw.home_team || raw.homeTeam || "Home",
      logo: raw.home_logo || undefined,
      score: raw.score?.home ?? raw.home_score,
    },
    away: {
      name: raw.away_team || raw.awayTeam || "Away",
      logo: raw.away_logo || undefined,
      score: raw.score?.away ?? raw.away_score,
    },
    status: raw.status || "unknown",
    time: raw.minute ? `${raw.minute}'` : raw.time,
    league: raw.league || raw.tournament,
    venue: raw.venue,
    date: raw.scheduled_at || raw.date,
    has_stream: false,
    streamUrl: undefined,
  };
}

// ─── Transparent CORS Bypass Helper ───────────────────────────────────────────
async function fetchWithCORS(
  urlStr: string,
  key: string,
  keyHeaderName: string,
): Promise<Response> {
  try {
    // Attempt standard direct fetch
    const response = await fetch(urlStr, {
      method: "GET",
      headers: {
        [keyHeaderName]: key,
        "Content-Type": "application/json",
      },
    });
    if (response.ok || response.status === 429) {
      return response;
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (err: any) {
    // Handle CORS errors (TypeError) or failures by routing through a public proxy [1]
    if (err instanceof TypeError || err?.message?.includes("Failed to fetch")) {
      console.warn(
        `Direct request to ${urlStr} blocked by CORS or network [1]. Routing through proxy...`,
      );
      const url = new URL(urlStr);

      // Append keys as query fallback parameters inside the proxy
      url.searchParams.set("apikey", key);
      url.searchParams.set("api_key", key);
      url.searchParams.set("key", key);

      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url.toString())}`;
      const proxyResponse = await fetch(proxyUrl);
      if (proxyResponse.ok) {
        return proxyResponse;
      }
    }
    throw err;
  }
}

// ─── Primary fetch (SportSRC) ─────────────────────────────────────────────────
async function fetchPrimary(params: Record<string, string>) {
  const url = new URL(PRIMARY_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetchWithCORS(url.toString(), PRIMARY_KEY, "X-API-KEY");
  const rateRemaining = res.headers.get("X-RateLimit-Remaining");
  const ratePlan = res.headers.get("X-Plan");
  if (res.status === 429)
    throw Object.assign(new Error("rate_limited"), { status: 429 });

  const json = await res.json();
  return { json, rateRemaining, ratePlan };
}

// ─── Backup fetch (sportapi.ai) ───────────────────────────────────────────────
async function fetchBackup(params: Record<string, string>): Promise<any[]> {
  const type = params.type;
  const sport = params.sport || "football";
  const status = params.status;

  let endpoint = "";

  if (type === "matches") {
    if (status === "inprogress") {
      endpoint = "/scores/live";
    } else if (status === "upcoming") {
      endpoint = `/fixtures?sport=${encodeURIComponent(sport)}`;
    } else {
      return [];
    }
  } else if (type === "channels") {
    return [];
  } else {
    return [];
  }

  const url = `${BACKUP_BASE}${endpoint}`;
  const res = await fetchWithCORS(url, BACKUP_KEY, "X-API-Key");
  const json = await res.json();

  const raw =
    json?.data || json?.events || json?.fixtures || json?.results || [];
  return Array.isArray(raw) ? raw.map(parseBackupMatch) : [];
}

// ─── Sports & status config ───────────────────────────────────────────────────
const SPORTS = [
  { key: "football", label: "Football", emoji: "⚽" },
  { key: "basketball", label: "Basketball", emoji: "🏀" },
  { key: "american-football", label: "NFL", emoji: "🏈" },
  { key: "tennis", label: "Tennis", emoji: "🎾" },
  { key: "baseball", label: "Baseball", emoji: "⚾" },
  { key: "hockey", label: "Hockey", emoji: "🏒" },
  { key: "cricket", label: "Cricket", emoji: "🏏" },
];

const STATUS_TABS = [
  {
    key: "inprogress",
    label: "Live",
    icon: (
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
    ),
  },
  { key: "upcoming", label: "Upcoming", icon: <CalendarDays size={12} /> },
  { key: "finished", label: "Results", icon: <CheckCircle2 size={12} /> },
];

// ─── Match Card ───────────────────────────────────────────────────────────────
function MatchCard({
  match,
  onSelect,
}: {
  match: Match;
  onSelect: (m: Match) => void;
}) {
  const isLive = [
    "inprogress",
    "live",
    "1h",
    "2h",
    "ht",
    "et",
    "pen_live",
  ].includes(match.status);
  const isFinished = ["finished", "ft", "aet", "pen", "ended"].includes(
    match.status,
  );
  const showScore = isLive || isFinished;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(match)}
      className="group relative bg-white/[0.02] border border-white/[0.06] hover:border-[#4490ff]/30 rounded-3xl p-4 sm:p-5 cursor-pointer transition-all duration-300 overflow-hidden"
    >
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: "rgba(68,144,255,0.06)" }}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-1.5 min-w-0">
          {match.leagueLogo && (
            <img
              src={match.leagueLogo}
              alt=""
              className="w-4 h-4 object-contain rounded"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <span className="text-[9px] font-black uppercase tracking-widest text-white/40 truncate">
            {match.league || "Match"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {match.has_stream && (
            <span
              className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(68,144,255,0.1)",
                border: "1px solid rgba(68,144,255,0.25)",
                color: "#4490ff",
              }}
            >
              📺 Stream
            </span>
          )}
          <span
            className={cn(
              "text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider",
              isLive
                ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                : isFinished
                  ? "bg-white/5 text-white/40 border border-white/5"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20",
            )}
          >
            {isLive
              ? `● LIVE${match.time ? ` · ${match.time}` : ""}`
              : isFinished
                ? "FT"
                : match.date
                  ? new Date(match.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Upcoming"}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="grid grid-cols-7 items-center gap-2 text-center">
        <div className="col-span-3 flex flex-col items-center gap-1.5">
          <div
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center overflow-hidden p-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <img
              src={match.home.logo || avatarUrl(match.home.name)}
              alt={match.home.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = avatarUrl(match.home.name);
              }}
            />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-white truncate w-full">
            {match.home.name}
          </span>
        </div>

        <div className="col-span-1 flex flex-col items-center">
          {showScore ? (
            <>
              <span className="text-lg sm:text-2xl font-black text-white leading-none">
                {match.home.score ?? 0}
              </span>
              <span className="text-[9px] text-white/20 my-0.5">:</span>
              <span className="text-lg sm:text-2xl font-black text-white leading-none">
                {match.away.score ?? 0}
              </span>
            </>
          ) : (
            <span className="text-xs font-black text-white/30">VS</span>
          )}
        </div>

        <div className="col-span-3 flex flex-col items-center gap-1.5">
          <div
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center overflow-hidden p-1"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <img
              src={match.away.logo || avatarUrl(match.away.name)}
              alt={match.away.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = avatarUrl(match.away.name);
              }}
            />
          </div>
          <span className="text-[11px] sm:text-xs font-bold text-white truncate w-full">
            {match.away.name}
          </span>
        </div>
      </div>

      {match.venue && (
        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5">
          <MapPin size={9} className="text-white/30 shrink-0" />
          <span className="text-[9px] text-white/30 truncate">
            {match.venue}
          </span>
          <ChevronRight
            size={10}
            className="text-white/20 shrink-0 ml-auto group-hover:text-[#4490ff] transition-colors"
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Match Detail Modal ───────────────────────────────────────────────────────
function MatchDetailModal({
  matchId,
  onClose,
}: {
  matchId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrimary({ type: "detail", id: matchId })
      .then(({ json }) => setDetail(json?.data || json?.match || json))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [matchId]);

  const match = detail ? parsePrimaryMatch(detail) : null;
  const streamUrl =
    detail?.stream_url ||
    detail?.embed ||
    detail?.streams?.[0]?.url ||
    match?.streamUrl;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(3,3,5,0.92)", backdropFilter: "blur(20px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "#07070a",
          border: "1px solid rgba(68,144,255,0.15)",
        }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Match Detail
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={14} className="text-white/60" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2
                size={28}
                className="animate-spin"
                style={{ color: "#4490ff" }}
              />
              <span className="text-xs text-white/40 uppercase">
                Loading match data...
              </span>
            </div>
          ) : match ? (
            <>
              <div className="grid grid-cols-7 items-center text-center gap-3">
                <div className="col-span-3 flex flex-col items-center gap-2">
                  <img
                    src={match.home.logo || avatarUrl(match.home.name)}
                    alt=""
                    className="w-16 h-16 object-contain rounded-full p-1"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                    onError={(e) => {
                      e.currentTarget.src = avatarUrl(match.home.name);
                    }}
                  />
                  <span className="text-sm font-black text-white">
                    {match.home.name}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-3xl font-black text-white block">
                    {match.home.score ?? "-"}
                  </span>
                  <span className="text-white/20 text-xs">:</span>
                  <span className="text-3xl font-black text-white block">
                    {match.away.score ?? "-"}
                  </span>
                </div>
                <div className="col-span-3 flex flex-col items-center gap-2">
                  <img
                    src={match.away.logo || avatarUrl(match.away.name)}
                    alt=""
                    className="w-16 h-16 object-contain rounded-full p-1"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                    onError={(e) => {
                      e.currentTarget.src = avatarUrl(match.away.name);
                    }}
                  />
                  <span className="text-sm font-black text-white">
                    {match.away.name}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "League", value: match.league },
                  { label: "Venue", value: match.venue },
                  { label: "Status", value: match.status?.toUpperCase() },
                  { label: "Time", value: match.time || match.date },
                ]
                  .filter((m) => m.value)
                  .map((m) => (
                    <div
                      key={m.label}
                      className="p-3 rounded-2xl"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span className="text-[8px] uppercase text-white/30 block">
                        {m.label}
                      </span>
                      <span className="text-xs font-bold text-white block mt-0.5 truncate">
                        {m.value}
                      </span>
                    </div>
                  ))}
              </div>
              {streamUrl && (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase text-white active:scale-95 transition-all"
                  style={{
                    background: "#4490ff",
                    boxShadow: "0 4px 20px rgba(68,144,255,0.3)",
                  }}
                >
                  <Play size={14} /> Watch Live Stream
                  <ExternalLink size={12} className="opacity-60" />
                </a>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-white/30 text-sm">
              Could not load match details.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Channel Card ─────────────────────────────────────────────────────────────
function ChannelCard({ ch }: { ch: Channel }) {
  return (
    <a
      href={ch.stream_url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-3.5 rounded-2xl transition-all"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        {ch.logo ? (
          <img
            src={ch.logo}
            alt=""
            className="w-full h-full object-contain p-1"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <Tv size={16} className="text-white/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold text-white truncate block">
          {ch.name}
        </span>
        {ch.country && (
          <span className="text-[9px] text-white/30 uppercase">
            {ch.country}
          </span>
        )}
      </div>
      {ch.is_live && (
        <span
          className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0"
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}
        >
          LIVE
        </span>
      )}
      {ch.stream_url && (
        <Play
          size={12}
          className="text-white/20 group-hover:text-[#4490ff] transition-colors shrink-0"
        />
      )}
    </a>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Sports() {
  const [sport, setSport] = useState("football");
  const [status, setStatus] = useState("inprogress");
  const [activeTab, setActiveTab] = useState<"matches" | "channels">("matches");

  const [matches, setMatches] = useState<Match[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const [source, setSource] = useState<DataSource>(null);
  const [cacheAge, setCacheAge] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  // ── fetchMatches: primary → backup → cache ──────────────────────────────────
  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const cacheKey = `matches_${sport}_${status}_${today}`;

    // 1️⃣  Try primary (SportSRC)
    try {
      const { json } = await fetchPrimary({
        type: "matches",
        sport,
        status,
        date: today,
      });
      const raw: any[] =
        json?.data || json?.matches || json?.events || json?.results || [];
      const parsed = raw.map(parsePrimaryMatch);

      setMatches(parsed);
      setSource("primary");
      cacheSet(cacheKey, parsed);
      setLoading(false);
      return;
    } catch (e: any) {
      if (e?.status !== 429) {
        const stale = cacheGetStale(cacheKey);
        if (stale) {
          setMatches(stale.data);
          setSource("cache");
          setCacheAge(cacheAgeLabel(stale.ts));
          setLoading(false);
          return;
        }
      }
    }

    // 2️⃣  Try backup (sportapi.ai)
    try {
      const parsed = await fetchBackup({ type: "matches", sport, status });
      if (parsed.length > 0) {
        setMatches(parsed);
        setSource("backup");
        cacheSet(cacheKey, parsed);
        setLoading(false);
        return;
      }
    } catch {
      // Continue to cache
    }

    // 3️⃣  Serve stale cache as last resort
    const stale = cacheGetStale(cacheKey);
    if (stale) {
      setMatches(stale.data);
      setSource("cache");
      setCacheAge(cacheAgeLabel(stale.ts));
    } else {
      setMatches([]);
      setSource(null);
    }
    setLoading(false);
  }, [sport, status, today]);

  // ── fetchChannels: primary → cache ──────────────────────────────────────────
  const fetchChannels = useCallback(async () => {
    setLoading(true);
    const cacheKey = "channels_live";

    const parseChannels = (raw: any[]): Channel[] =>
      raw.map((ch) => ({
        id: String(ch.id || Math.random()),
        name: ch.name || ch.title || "Channel",
        logo: ch.logo || ch.image,
        country: ch.country || ch.country_code,
        stream_url: ch.stream_url || ch.url || ch.embed,
        is_live: ch.is_live ?? true,
      }));

    try {
      const { json } = await fetchPrimary({
        type: "channels",
        is_live: "true",
      });
      const raw: any[] = json?.data || json?.channels || [];
      const parsed = parseChannels(raw);
      setChannels(parsed);
      setSource("primary");
      cacheSet(cacheKey, parsed);
    } catch {
      const stale = cacheGetStale(cacheKey);
      if (stale) {
        setChannels(stale.data);
        setSource("cache");
        setCacheAge(cacheAgeLabel(stale.ts));
      } else {
        setChannels([]);
        setSource(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "matches") fetchMatches();
    else fetchChannels();
  }, [activeTab, fetchMatches, fetchChannels]);

  return (
    <div
      className="min-h-screen pt-4 pb-24"
      style={{ background: "var(--rf-black)" }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 space-y-6">
        {/* Hero */}
        <div
          className="relative rounded-[2rem] overflow-hidden shadow-2xl"
          style={{
            border: "1px solid rgba(68,144,255,0.1)",
            background:
              "linear-gradient(135deg, rgba(68,144,255,0.06) 0%, rgba(3,3,5,1) 60%)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] pointer-events-none"
            style={{ background: "rgba(68,144,255,0.08)" }}
          />

          <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col gap-4 min-h-[220px] justify-between">
            <div>
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full w-fit mb-4 text-xs font-bold uppercase tracking-widest"
                style={{
                  background: "rgba(68,144,255,0.1)",
                  border: "1px solid rgba(68,144,255,0.2)",
                  color: "#4490ff",
                }}
              >
                <Shield size={12} /> Lenzorah Sports Center
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-2 leading-none">
                Live Sports,{" "}
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #4490ff, #a78bfa)",
                  }}
                >
                  Real Time
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-white/40 max-w-md leading-relaxed">
                Live scores, upcoming fixtures, and live TV channels — with
                automatic backup API switching.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {[
                { icon: <Wifi size={11} />, label: "Live Scores" },
                { icon: <CalendarDays size={11} />, label: "Fixtures" },
                { icon: <Tv size={11} />, label: "Live TV" },
              ].map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 px-2.5 py-1.5 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ color: "#4490ff" }}>{f.icon}</span>
                  {f.label}
                </div>
              ))}
              <button
                onClick={() =>
                  activeTab === "matches" ? fetchMatches() : fetchChannels()
                }
                disabled={loading}
                className="ml-auto flex items-center gap-1.5 text-[10px] font-bold px-3.5 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: "rgba(68,144,255,0.08)",
                  border: "1px solid rgba(68,144,255,0.2)",
                  color: "#4490ff",
                }}
              >
                <RefreshCw
                  size={11}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex items-center gap-2">
          {[
            { key: "matches", icon: <Trophy size={13} />, label: "Matches" },
            { key: "channels", icon: <Tv size={13} />, label: "Live TV" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
              style={
                activeTab === t.key
                  ? {
                      background: "#4490ff",
                      color: "white",
                      boxShadow: "0 4px 20px rgba(68,144,255,0.3)",
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.5)",
                    }
              }
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* Matches tab */}
          {activeTab === "matches" && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              {/* Sport selector */}
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSport(s.key)}
                    className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    style={
                      sport === s.key
                        ? {
                            background: "rgba(68,144,255,0.15)",
                            border: "1px solid rgba(68,144,255,0.3)",
                            color: "#4490ff",
                          }
                        : {
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>

              {/* Status selector */}
              <div
                className="flex gap-2 p-1 rounded-xl w-fit"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setStatus(t.key)}
                    className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                    style={
                      status === t.key
                        ? t.key === "inprogress"
                          ? {
                              background: "rgba(239,68,68,0.12)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              color: "#f87171",
                            }
                          : t.key === "upcoming"
                            ? {
                                background: "rgba(68,144,255,0.12)",
                                border: "1px solid rgba(68,144,255,0.2)",
                                color: "#4490ff",
                              }
                            : {
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                color: "white",
                              }
                        : { color: "rgba(255,255,255,0.4)" }
                    }
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Match grid */}
              {loading ? (
                <div className="flex flex-col items-center py-20 gap-3">
                  <Loader2
                    size={32}
                    className="animate-spin"
                    style={{ color: "#4490ff" }}
                  />
                  <span className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    {source === null
                      ? "Fetching matches..."
                      : source === "backup"
                        ? "Loading from backup API..."
                        : "Loading..."}
                  </span>
                </div>
              ) : matches.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {matches.map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      onSelect={(m2) => setSelectedMatchId(m2.id)}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="text-center py-20 rounded-3xl"
                  style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Calendar size={36} className="mx-auto mb-3 text-white/20" />
                  <h3 className="text-sm font-bold text-white mb-1">
                    No Matches Found
                  </h3>
                  <p className="text-xs text-white/30 max-w-xs mx-auto">
                    No {status === "inprogress" ? "live" : status}{" "}
                    {SPORTS.find((s) => s.key === sport)?.label} matches
                    available. Try switching sport or status.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Channels tab */}
          {activeTab === "channels" && (
            <motion.div
              key="channels"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Radio size={14} style={{ color: "#4490ff" }} />
                <span className="text-xs font-black uppercase text-white tracking-wider">
                  Live Sports Channels
                </span>
                {channels.length > 0 && (
                  <span
                    className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ml-1"
                    style={{
                      background: "rgba(68,144,255,0.1)",
                      color: "#4490ff",
                    }}
                  >
                    {channels.length} channels
                  </span>
                )}
              </div>
              {loading ? (
                <div className="flex flex-col items-center py-20 gap-3">
                  <Loader2
                    size={32}
                    className="animate-spin"
                    style={{ color: "#4490ff" }}
                  />
                  <span className="text-xs font-bold text-white/40 uppercase">
                    Loading channels...
                  </span>
                </div>
              ) : channels.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {channels.map((ch) => (
                    <ChannelCard key={ch.id} ch={ch} />
                  ))}
                </div>
              ) : (
                <div
                  className="text-center py-20 rounded-3xl"
                  style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <Tv size={36} className="mx-auto mb-3 text-white/20" />
                  <h3 className="text-sm font-bold text-white mb-1">
                    No Live Channels
                  </h3>
                  <p className="text-xs text-white/30 max-w-xs mx-auto">
                    No live channels available right now.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedMatchId && (
          <MatchDetailModal
            matchId={selectedMatchId}
            onClose={() => setSelectedMatchId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
