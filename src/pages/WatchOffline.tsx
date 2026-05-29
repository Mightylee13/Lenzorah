import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  WifiOff,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Loader2,
  Film,
} from "lucide-react";
import {
  useDownloadStore,
  DownloadHistoryItem,
} from "./MovieDetails/hooks/useDownloadStore";
// offlineDb only exposes saveMedia/deleteMedia — playback uses the stream URL directly
import { useSEO } from "../hooks/useSEO";
import { cn } from "../utils/cn";

function daysLeft(expiresAt: number): number {
  return Math.max(
    0,
    Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function WatchOffline() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const history = useDownloadStore((s) => s.history);

  const [item, setItem] = useState<DownloadHistoryItem | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: item ? `${item.title} | Runflix Offline` : "Watch Offline | Runflix",
    description: item?.filename ?? "Watch your saved offline content",
  });

  // ── Find item in store & resolve video source ─────────────────────────────
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // history item id is exactly what Downloads.tsx passes to navigate()
    const found = history.find((h) => h.id === id && h.isOffline);

    if (!found || !found.offlineComplete) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setItem(found);

    // offlineDb stores a silent placeholder MP4, not the real video.
    // The actual playable URL is the stream URL saved on the history item.
    const src = found.streamUrl || found.downloadUrl || found.url || null;
    setVideoSrc(src);
    setLoading(false);
  }, [id, history]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // ── Autoplay once src is ready ────────────────────────────────────────────
  useEffect(() => {
    if (!videoSrc || !videoRef.current) return;
    if (searchParams.get("autoplay") === "true") {
      videoRef.current.play().catch(() => {});
    }
  }, [videoSrc, searchParams]);

  // ── Fullscreen sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Auto-hide controls ────────────────────────────────────────────────────
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "ArrowRight":
          v.currentTime = Math.min(v.duration, v.currentTime + 10);
          break;
        case "ArrowLeft":
          v.currentTime = Math.max(0, v.currentTime - 10);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, muted]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement)
      containerRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = parseFloat(e.target.value);
    setCurrentTime(v.currentTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    setVolume(val);
    setMuted(val === 0);
  };

  // ── Render states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="animate-spin text-cyan-400" />
        <p className="text-white/40 text-sm">Loading offline content...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <AlertTriangle size={28} className="text-amber-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">
          Video Not Available
        </h1>
        <p className="text-sm text-white/40 max-w-sm mb-8 leading-relaxed">
          This video may still be downloading, has expired, or was deleted from
          offline storage.
        </p>
        <button
          onClick={() => navigate("/downloads")}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-sm hover:bg-cyan-500/20 transition-all"
        >
          <ArrowLeft size={16} /> Back to Downloads
        </button>
      </div>
    );
  }

  if (!videoSrc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <Film size={28} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">
          No Playable Source
        </h1>
        <p className="text-sm text-white/40 max-w-sm mb-8 leading-relaxed">
          The stream URL was not saved with this offline item. Re-save the video
          from the download modal to fix this.
        </p>
        <button
          onClick={() => navigate("/downloads")}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold text-sm hover:bg-cyan-500/20 transition-all"
        >
          <ArrowLeft size={16} /> Back to Downloads
        </button>
      </div>
    );
  }

  const days = item!.expiresAt ? daysLeft(item!.expiresAt) : 30;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] bg-black/70 backdrop-blur-xl z-20 relative shrink-0">
        <button
          onClick={() => navigate("/downloads")}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} /> Downloads
        </button>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-wider">
            <WifiOff size={10} /> Offline
          </span>
          {days <= 7 && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border",
                days <= 3
                  ? "text-red-400 bg-red-500/10 border-red-500/20"
                  : "text-amber-400 bg-amber-500/10 border-amber-500/20",
              )}
            >
              <Clock size={9} /> {days}d left
            </span>
          )}
        </div>
      </div>

      {/* Player */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black flex items-center justify-center overflow-hidden"
        onMouseMove={resetControlsTimer}
        onTouchStart={resetControlsTimer}
        onClick={togglePlay}
        style={{ cursor: showControls ? "default" : "none" }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full max-h-[calc(100vh-130px)] object-contain"
          playsInline
          onPlay={() => {
            setPlaying(true);
            resetControlsTimer();
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={() =>
            setCurrentTime(videoRef.current?.currentTime ?? 0)
          }
          onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
          onWaiting={() => setBuffering(true)}
          onCanPlay={() => setBuffering(false)}
          onVolumeChange={() => {
            const v = videoRef.current;
            if (!v) return;
            setMuted(v.muted);
            setVolume(v.volume);
          }}
          onError={() =>
            setError(
              "Playback failed. The stream URL may have expired — re-save this video to fix it.",
            )
          }
        />

        {buffering && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 size={44} className="animate-spin text-white/50" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center pointer-events-none">
            <AlertTriangle size={32} className="text-amber-400 mb-3" />
            <p className="text-white font-bold mb-2">Playback Error</p>
            <p className="text-white/50 text-sm max-w-sm leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <AnimatePresence>
          {showControls && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col justify-end pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

              {/* Title */}
              <div className="relative px-5 pb-1 pointer-events-none">
                <p className="text-white font-black text-sm md:text-base leading-snug line-clamp-1">
                  {item!.title}
                </p>
                {item!.filename && item!.filename !== item!.title && (
                  <p className="text-white/40 text-xs mt-0.5 line-clamp-1">
                    {item!.filename}
                  </p>
                )}
              </div>

              {/* Seek */}
              <div
                className="relative px-4 pb-1 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={seek}
                  className="w-full h-1 cursor-pointer"
                  style={{ accentColor: "#22d3ee" }}
                />
                <div className="flex justify-between text-[10px] text-white/40 font-mono mt-0.5 select-none">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control buttons */}
              <div
                className="relative flex items-center justify-between px-4 pb-5 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                  >
                    {playing ? (
                      <Pause size={18} className="text-white" />
                    ) : (
                      <Play size={18} className="text-white fill-white" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current)
                        videoRef.current.currentTime = Math.max(
                          0,
                          videoRef.current.currentTime - 10,
                        );
                    }}
                    className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-all"
                  >
                    <RotateCcw size={15} className="text-white/70" />
                  </button>
                  <button
                    onClick={() => {
                      if (videoRef.current)
                        videoRef.current.currentTime = Math.min(
                          videoRef.current.duration,
                          videoRef.current.currentTime + 10,
                        );
                    }}
                    className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-all"
                  >
                    <RotateCw size={15} className="text-white/70" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-all"
                    >
                      {muted || volume === 0 ? (
                        <VolumeX size={15} className="text-white/70" />
                      ) : (
                        <Volume2 size={15} className="text-white/70" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 hidden sm:block"
                      style={{ accentColor: "#22d3ee" }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item!.quality && (
                    <span className="hidden sm:flex text-[10px] font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-lg">
                      {item!.quality}
                    </span>
                  )}
                  <button
                    onClick={toggleFullscreen}
                    className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center transition-all"
                  >
                    {isFullscreen ? (
                      <Minimize size={15} className="text-white/70" />
                    ) : (
                      <Maximize size={15} className="text-white/70" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Meta strip */}
      <div className="px-5 py-3 border-t border-white/[0.05] bg-black/70 backdrop-blur-xl shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-white font-black text-sm truncate">
              {item!.title}
            </h2>
            {item!.filename && item!.filename !== item!.title && (
              <p className="text-white/30 text-xs mt-0.5 truncate">
                {item!.filename}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={cn(
                "text-xs font-bold",
                days <= 3
                  ? "text-red-400"
                  : days <= 7
                    ? "text-amber-400"
                    : "text-white/30",
              )}
            >
              {days} days left
            </span>
            {item!.quality && (
              <span className="text-cyan-400 font-black text-xs">
                {item!.quality}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
