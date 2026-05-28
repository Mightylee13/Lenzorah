import { useState } from "react";
import {
  Trash2,
  Film,
  FileText,
  Download as DownloadIcon,
  Clock,
  HardDrive,
  Globe,
  Play,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDownloadStore } from "./MovieDetails/hooks/useDownloadStore";
import { useOfflineStore } from "../pages/MovieDetails/hooks/useOfflineStore";
import { getRelativeTime, formatFileSize } from "../utils/format";
import { useSEO } from "../hooks/useSEO";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Tab = "history" | "offline";

export default function Downloads() {
  useSEO({
    title: "Downloads",
    description: "Your download history and queue",
  });

  const [tab, setTab] = useState<Tab>("history");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Phone history
  const history = useDownloadStore((s) => s.history);
  const clearHistory = useDownloadStore((s) => s.clearHistory);
  const removeFromHistory = useDownloadStore((s) => s.removeFromHistory);

  // Offline / web saves
  const offlineItems = useOfflineStore((s) => s.items);
  const deleteOffline = useOfflineStore((s) => s.deleteOffline);
  const getVideoUrl = useOfflineStore((s) => s.getVideoUrl);
  const isExpired = useOfflineStore((s) => s.isExpired);

  const movieCount = history.filter((h) => h.type === "movie").length;
  const subtitleCount = history.filter((h) => h.type === "subtitle").length;

  const handleWatch = async (id: string) => {
    if (playingId === id) {
      // Close player
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setPlayingId(null);
      return;
    }
    const url = await getVideoUrl(id);
    if (!url) return;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setBlobUrl(url);
    setPlayingId(id);
  };

  const handleDelete = async (id: string) => {
    if (playingId === id) {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setPlayingId(null);
    }
    await deleteOffline(id);
  };

  function daysLeft(expiresAt: number) {
    return Math.max(
      0,
      Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen px-4 md:px-10 max-w-4xl mx-auto w-full py-4 md:py-8"
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <HardDrive size={24} className="text-[var(--rf-red)]" />
            My Downloads
          </h1>
          <p className="text-sm text-[var(--rf-text-dim)]">
            Your download history and offline saved movies
          </p>
        </div>

        {tab === "history" && history.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-[var(--rf-text-dim)]">
              <span className="badge badge-quality">{movieCount} movies</span>
              <span className="badge badge-type">
                {subtitleCount} subtitles
              </span>
            </div>
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-3 py-2 glass-2 rounded-xl text-xs font-semibold text-[var(--rf-text-muted)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all"
            >
              <Trash2 size={14} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-0.5 glass-2 rounded-xl w-fit">
        <button
          onClick={() => setTab("history")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
            tab === "history"
              ? "bg-[var(--rf-red)] text-white shadow-md shadow-[var(--rf-red)]/20"
              : "text-[var(--rf-text-dim)] hover:text-white",
          )}
        >
          <DownloadIcon size={12} /> History
          {history.length > 0 && (
            <span className="ml-1 bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("offline")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
            tab === "offline"
              ? "bg-[var(--rf-red)] text-white shadow-md shadow-[var(--rf-red)]/20"
              : "text-[var(--rf-text-dim)] hover:text-white",
          )}
        >
          <WifiOff size={12} /> Offline
          {offlineItems.length > 0 && (
            <span className="ml-1 bg-white/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {offlineItems.length}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════ HISTORY TAB ══════════════ */}
      {tab === "history" && (
        <>
          {history.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-2 rounded-2xl p-10 md:p-14 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
                <DownloadIcon size={32} className="text-[var(--rf-text-dim)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No Downloads Yet
              </h3>
              <p className="text-sm text-[var(--rf-text-dim)] max-w-sm mx-auto leading-relaxed">
                When you download movies, TV episodes, or subtitles, they will
                appear here.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {[...history]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((item, idx) => (
                    <motion.div
                      key={`${item.id}-${item.timestamp}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8, height: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(idx * 0.03, 0.2),
                      }}
                      className="group flex items-center justify-between p-4 glass-2 rounded-xl hover:bg-white/[0.06] transition-all"
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                            item.type === "movie"
                              ? "bg-[var(--rf-red)]/10 text-[var(--rf-red)]"
                              : "bg-blue-500/10 text-blue-400",
                          )}
                        >
                          {item.type === "movie" ? (
                            <Film size={18} />
                          ) : (
                            <FileText size={18} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-white text-sm truncate mb-0.5">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--rf-text-dim)]">
                            <span className="truncate max-w-[200px]">
                              {item.filename}
                            </span>
                            <span className="shrink-0 flex items-center gap-1">
                              <Clock size={9} />
                              {getRelativeTime(item.timestamp)}
                            </span>
                            {item.quality && (
                              <span className="badge badge-quality text-[8px] py-0 px-1.5">
                                {item.quality}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromHistory(item.id)}
                        className="p-2 rounded-lg text-[var(--rf-text-dim)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all shrink-0 ml-3 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label="Remove from history"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* ══════════════ OFFLINE TAB ══════════════ */}
      {tab === "offline" && (
        <>
          {offlineItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-2 rounded-2xl p-10 md:p-14 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
                <WifiOff size={32} className="text-[var(--rf-text-dim)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No Offline Movies
              </h3>
              <p className="text-sm text-[var(--rf-text-dim)] max-w-sm mx-auto leading-relaxed">
                When you choose "Save to Web" on any movie, it will appear here
                and play without internet.
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {offlineItems.map((item, idx) => {
                  const expired = isExpired(item);
                  const isPlaying = playingId === item.id;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(idx * 0.04, 0.2),
                      }}
                      className="glass-2 rounded-2xl overflow-hidden"
                    >
                      {/* Row */}
                      <div className="flex items-center justify-between p-4 gap-3">
                        <div className="flex items-center gap-3.5 overflow-hidden">
                          <div
                            className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                              expired
                                ? "bg-white/[0.04] text-white/20"
                                : "bg-emerald-500/10 text-emerald-400",
                            )}
                          >
                            <Globe size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-white text-sm truncate mb-0.5">
                              {item.title}
                              {item.episodeLabel && (
                                <span className="text-[var(--rf-text-dim)] font-normal">
                                  {" "}
                                  — {item.episodeLabel}
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--rf-text-dim)] flex-wrap">
                              {item.quality && (
                                <span className="badge badge-quality text-[8px] py-0 px-1.5">
                                  {item.quality}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <HardDrive size={9} />
                                {formatFileSize(item.size)}
                              </span>
                              {expired ? (
                                <span className="text-[var(--rf-red)] font-semibold flex items-center gap-1">
                                  <Clock size={9} /> Expired
                                </span>
                              ) : (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Clock size={9} /> {daysLeft(item.expiresAt)}d
                                  left
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {!expired && (
                            <button
                              onClick={() => handleWatch(item.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                                isPlaying
                                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
                              )}
                            >
                              <Play
                                size={12}
                                className={isPlaying ? "fill-current" : ""}
                              />
                              {isPlaying ? "Close" : "Watch"}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg text-[var(--rf-text-dim)] hover:text-[var(--rf-red)] hover:bg-[var(--rf-red)]/5 transition-all"
                            aria-label="Delete offline save"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Video Player */}
                      <AnimatePresence>
                        {isPlaying && blobUrl && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.3,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="overflow-hidden border-t border-[var(--rf-border)]"
                          >
                            <div className="p-3">
                              <video
                                src={blobUrl}
                                controls
                                autoPlay
                                className="w-full rounded-xl bg-black aspect-video"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
