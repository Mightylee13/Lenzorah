import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  HardDriveDownload,
  Download,
  ListVideo,
  Loader2,
  X,
  Film,
  Tv,
  Star,
  Clock,
  ChevronDown,
  Zap,
  Globe,
  Monitor,
  FileVideo,
  Sparkles,
  Check,
  ArrowDownToLine,
  Package,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { Season, SourceItem, SubjectInfo, BatchEpisodeResult } from "../types";
import { useDownloadStore } from "../hooks/useDownloadStore";
import {
  downloadMovie,
  downloadSubtitle,
  formatDownloadFilename,
  buildSubtitleFilename,
} from "../../../utils/download";
import { formatFileSize } from "../../../utils/format";
import { lockBodyScroll, unlockBodyScroll } from "../../../utils/scrollLock";
import { OptimizedImage } from "../../../components/ui/OptimizedImage";
import { trackUmamiEvent } from "../../../hooks/useAnalytics";
import toast from "react-hot-toast";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectInfo;
  isTvSeries: boolean;
  seasons: Season[];
  selectedSeason: number;
  selectedEpisode: number;
  downloadMode: "single" | "batch" | "all";
  sources: SourceItem[];
  subtitles: any[];
  sourcesLoading: boolean;
  batchResults: BatchEpisodeResult[];
  batchLoading: boolean;
  onSeasonChange: (s: number) => void;
  onEpisodeChange: (e: number) => void;
  onModeChange: (m: "single" | "batch" | "all") => void;
  onFetchBatch: () => void;
  onDownloadBatchAll: (preferredQuality?: string, isOffline?: boolean) => void;
  onDownloadBatchAllSubtitles: (language?: string, isOffline?: boolean) => void;
  onDownloadFullSeries?: (
    preferredQuality?: string,
    isOffline?: boolean,
  ) => void;
  onDownloadFullSeriesSubtitles?: (isOffline?: boolean) => void;
}

/* ============ QUALITY CONFIG ============ */
const QUALITY_META: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  "4k": { icon: "✦", color: "from-amber-400 to-orange-500", label: "Ultra HD" },
  "2160p": {
    icon: "✦",
    color: "from-amber-400 to-orange-500",
    label: "Ultra HD",
  },
  "1080p": {
    icon: "⚡",
    color: "from-blue-400 to-indigo-500",
    label: "Full HD",
  },
  "720p": { icon: "●", color: "from-emerald-400 to-teal-500", label: "HD" },
  "480p": { icon: "○", color: "from-slate-400 to-slate-500", label: "SD" },
  "360p": { icon: "○", color: "from-zinc-400 to-zinc-500", label: "Low" },
};

function getQualityMeta(quality: string) {
  const q = quality?.toLowerCase() || "";
  return (
    QUALITY_META[q] || {
      icon: "●",
      color: "from-purple-400 to-purple-600",
      label: quality || "HD",
    }
  );
}

/* ============ PREFERRED QUALITY ============ */
const PREF_KEY = "rf-preferred-quality";
function getPreferredQuality(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}
function setPreferredQuality(q: string) {
  try {
    localStorage.setItem(PREF_KEY, q);
  } catch {
    /* */
  }
}

/* ============ MAIN MODAL ============ */
export const DownloadModal = ({
  isOpen,
  onClose,
  subject,
  isTvSeries,
  seasons,
  selectedSeason,
  selectedEpisode,
  downloadMode,
  sources,
  subtitles,
  sourcesLoading,
  batchResults,
  batchLoading,
  onSeasonChange,
  onEpisodeChange,
  onModeChange,
  onFetchBatch,
  onDownloadBatchAll,
  onDownloadBatchAllSubtitles,
  onDownloadFullSeries,
  onDownloadFullSeriesSubtitles,
}: DownloadModalProps) => {
  const navigate = useNavigate();
  const setProgress = useDownloadStore((state) => state.setProgress);
  const addToHistory = useDownloadStore((state) => state.addToHistory);
  const addOfflineDownload = useDownloadStore(
    (state) => state.addOfflineDownload,
  );
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"video" | "subtitle">("video");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    lockBodyScroll();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) setActiveTab("video");
  }, [isOpen]);

  const handleSingleDownload = (
    src: SourceItem,
    downloadId: string,
    episodeLabel?: string,
  ) => {
    setPreferredQuality(src.quality || "HD");

    const qualityStr = src.quality || "HD";
    const displayTitle = `${subject.title} ${qualityStr}`;
    const filename = formatDownloadFilename(
      subject.title,
      qualityStr,
      episodeLabel,
      subject.releaseDate,
      src.format,
    );

    const coverImg = subject.cover?.url || subject.stills?.url;

    if (isOfflineMode) {
      addOfflineDownload({
        id: downloadId,
        title: displayTitle,
        filename: filename,
        quality: qualityStr,
        type: "movie",
        url: src.download_url || src.stream_url,
        downloadUrl: src.download_url,
        streamUrl: src.stream_url,
        coverUrl: coverImg,
      });

      // Auto-download subtitles for single offline episode if any exist
      if (subtitles && subtitles.length > 0) {
        subtitles.forEach((sub, index) => {
          const ext = sub.url
            ? sub.url.split(".").pop()?.split("?")[0] || "srt"
            : "srt";
          const subId = `sub_${sub.id || index}_offline_${downloadId}`;
          addOfflineDownload({
            id: subId,
            title: subject.title,
            filename: buildSubtitleFilename(
              subject.title,
              sub.lanName,
              episodeLabel,
              subject.releaseDate,
              ext,
            ),
            type: "subtitle",
            url: sub.url,
          });
        });
      }

      toast(
        (t) => (
          <span className="flex items-center gap-2">
            <span>Added to offline storage with subtitles!</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate("/downloads");
              }}
              className="text-cyan-400 font-black hover:underline ml-1 cursor-pointer"
            >
              Go to Downloads
            </button>
          </span>
        ),
        { duration: 5000 },
      );
      onClose();
      return;
    }

    addToHistory({
      id: downloadId,
      title: displayTitle,
      filename: filename,
      quality: qualityStr,
      type: "movie",
      url: src.download_url || src.stream_url,
      downloadUrl: src.download_url,
      streamUrl: src.stream_url,
      coverUrl: coverImg,
    });
    downloadMovie(
      src.download_url || src.stream_url,
      subject.title,
      src.quality || "HD",
      src.format,
      episodeLabel,
      (p) =>
        setProgress(
          downloadId,
          p.progress,
          p.status === "done" || p.status === "error",
        ),
      subject.releaseDate,
    );

    // Auto-download subtitles for single direct download if any exist
    if (subtitles && subtitles.length > 0) {
      subtitles.forEach((sub, index) => {
        const ext = sub.url
          ? sub.url.split(".").pop()?.split("?")[0] || "srt"
          : "srt";
        const subId = `sub_${sub.id || index}_direct_${downloadId}`;
        addToHistory({
          id: subId,
          title: subject.title,
          filename: buildSubtitleFilename(
            subject.title,
            sub.lanName,
            episodeLabel,
            subject.releaseDate,
            ext,
          ),
          type: "subtitle",
          url: sub.url,
        });
        downloadSubtitle(
          sub.url,
          subject.title,
          sub.lanName,
          ext,
          episodeLabel,
          subject.releaseDate,
          (p) => {
            setProgress(
              subId,
              p.progress,
              p.status === "done" || p.status === "error",
            );
          },
        );
      });
    }
    trackUmamiEvent("download", {
      title: subject.title,
      id: subject.subjectId || "",
      quality: src.quality || "HD",
      format: src.format || "mp4",
      episode: episodeLabel || undefined,
    });
    trackUmamiEvent("download_movie", {
      title: subject.title,
      id: subject.subjectId || "",
      quality: src.quality || "HD",
      format: src.format || "mp4",
      episode: episodeLabel || undefined,
    });
  };

  const coverUrl = subject.cover?.url || subject.stills?.url;
  const activeSeason = seasons.find((s) => s.se === selectedSeason);
  const maxEp = activeSeason?.maxEp || 10;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end md:justify-center items-center pointer-events-none p-0 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dl-modal-title"
        >
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
          />

          {/* Modal Sheet / Popup */}
          <motion.div
            ref={modalRef}
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className="w-full max-w-full md:max-w-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col rounded-t-[2rem] md:rounded-[2rem] pointer-events-auto relative shadow-[0_-20px_80px_rgba(0,0,0,0.6)] md:shadow-[0_20px_80px_rgba(0,0,0,0.6)] bg-[#0a0a0c]/95 backdrop-blur-3xl border-t md:border border-white/[0.06] overflow-hidden"
          >
            {/* ─── Drag Handle (Mobile Only) ─── */}
            <div className="flex md:hidden justify-center pt-4 pb-2">
              <div
                className="w-12 h-1.5 rounded-full bg-white/20 cursor-pointer"
                onClick={onClose}
              />
            </div>

            {/* ─── Header with Movie Context ─── */}
            <div className="px-6 pt-2 md:pt-6 pb-5 flex items-start gap-4 relative shrink-0">
              {/* Mini Poster */}
              {coverUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="w-16 h-[96px] rounded-2xl border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)] shrink-0 bg-white/5 overflow-hidden"
                >
                  <OptimizedImage
                    src={coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              )}

              <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[82px]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-400/10 text-cyan-400 text-[9px] font-black uppercase tracking-wider">
                    {isTvSeries ? (
                      <>
                        <Tv size={10} /> Series
                      </>
                    ) : (
                      <>
                        <Film size={10} /> Movie
                      </>
                    )}
                  </span>
                  {subject.imdbRatingValue > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                      <Star size={10} className="fill-amber-400" />{" "}
                      {subject.imdbRatingValue}
                    </span>
                  )}
                </div>
                <h2
                  id="dl-modal-title"
                  className="text-sm sm:text-base font-black text-white truncate leading-tight"
                >
                  {subject.title}
                </h2>
                {isTvSeries && (
                  <p className="text-[10px] text-[var(--rf-text-dim)] mt-1.5 font-bold uppercase tracking-wider">
                    Season {selectedSeason} • {maxEp} episodes available
                  </p>
                )}
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] flex items-center justify-center transition-all shrink-0 group mt-1"
                aria-label="Close"
              >
                <X
                  size={16}
                  className="text-white/50 group-hover:text-white transition-colors"
                />
              </button>
            </div>

            {/* ─── Download Type Selector (Offline vs Phone) ─── */}
            <div className="px-6 mb-4 shrink-0">
              <div className="flex items-center p-1.5 rounded-2xl bg-black/40 border border-white/[0.05] shadow-inner">
                <button
                  onClick={() => setIsOfflineMode(false)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
                    !isOfflineMode
                      ? "bg-gradient-to-r from-red-600/20 to-rose-600/20 border border-red-500/20 text-red-400 shadow-[0_4px_20px_rgba(244,63,94,0.15)]"
                      : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
                  )}
                >
                  <ArrowDownToLine size={13} />
                  Download to Phone
                </button>
                <button
                  onClick={() => setIsOfflineMode(true)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
                    isOfflineMode
                      ? "bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/20 text-cyan-400 shadow-[0_4px_20px_rgba(34,211,238,0.15)]"
                      : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
                  )}
                >
                  <HardDriveDownload size={13} />
                  Save Offline (30 Days)
                </button>
              </div>
            </div>

            {/* ─── Mode Toggle for TV Series ─── */}
            {isTvSeries && seasons.length > 0 && (
              <div className="px-6 mb-5 shrink-0">
                <div className="flex items-center p-1.5 rounded-2xl bg-black/40 border border-white/[0.05] shadow-inner">
                  <button
                    onClick={() => onModeChange("single")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-300",
                      downloadMode === "single"
                        ? "bg-[#121216]/80 border border-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                        : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
                    )}
                  >
                    <Download size={14} />
                    Single
                  </button>
                  <button
                    onClick={() => onModeChange("batch")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-300",
                      downloadMode === "batch"
                        ? "bg-[#121216]/80 border border-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                        : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
                    )}
                  >
                    <ListVideo size={14} />
                    Batch
                  </button>
                  <button
                    onClick={() => onModeChange("all")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold transition-all duration-300",
                      downloadMode === "all"
                        ? "bg-[#121216]/80 border border-white/10 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                        : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
                    )}
                  >
                    <Package size={14} />
                    All
                  </button>
                </div>
              </div>
            )}

            {/* ─── Season / Episode Selectors ─── */}
            {isTvSeries && seasons.length > 0 && downloadMode !== "all" && (
              <div className="px-6 mb-5 flex gap-3 shrink-0">
                {/* Season */}
                <div className={downloadMode === "batch" ? "w-full" : "flex-1"}>
                  <label className="block text-[9px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-2">
                    Season
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-[#121216]/60 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-[11px] font-semibold appearance-none focus:border-cyan-400/50 outline-none transition-all cursor-pointer hover:bg-[#121216]/80"
                      value={selectedSeason}
                      onChange={(e) => onSeasonChange(Number(e.target.value))}
                    >
                      {seasons
                        .filter((s) => s.se > 0)
                        .map((s) => (
                          <option
                            key={s.se}
                            value={s.se}
                            className="bg-[#0a0a0c] text-white"
                          >
                            Season {s.se} ({s.maxEp} eps)
                          </option>
                        ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] pointer-events-none"
                    />
                  </div>
                </div>
                {/* Episode */}
                {downloadMode === "single" && (
                  <div className="flex-1">
                    <label className="block text-[9px] font-black text-[var(--rf-text-dim)] uppercase tracking-widest mb-2">
                      Episode
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-[#121216]/60 border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-[11px] font-semibold appearance-none focus:border-cyan-400/50 outline-none transition-all cursor-pointer hover:bg-[#121216]/80"
                        value={selectedEpisode}
                        onChange={(e) =>
                          onEpisodeChange(Number(e.target.value))
                        }
                      >
                        {Array.from({ length: maxEp }, (_, i) => i + 1).map(
                          (ep) => (
                            <option
                              key={ep}
                              value={ep}
                              className="bg-[#0a0a0c] text-white"
                            >
                              Episode {ep}
                            </option>
                          ),
                        )}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--rf-text-dim)] pointer-events-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── Scrollable Content Area ─── */}
            <div
              className="flex-1 overflow-y-auto px-6 pb-8"
              style={{
                WebkitOverflowScrolling: "touch",
                overscrollBehavior: "contain",
                touchAction: "pan-y",
              }}
            >
              {/* BATCH MODE */}
              {downloadMode === "batch" && (
                <BatchSection
                  batchResults={batchResults}
                  batchLoading={batchLoading}
                  title={subject.title}
                  selectedSeason={selectedSeason}
                  onFetchBatch={onFetchBatch}
                  onDownloadAll={(q) => {
                    onDownloadBatchAll(q, isOfflineMode);
                    if (isOfflineMode) {
                      toast(
                        (t) => (
                          <span className="flex items-center gap-2">
                            <span>Added batch to offline storage!</span>
                            <button
                              onClick={() => {
                                toast.dismiss(t.id);
                                navigate("/downloads");
                              }}
                              className="text-cyan-400 font-black hover:underline ml-1 cursor-pointer"
                            >
                              Go to Downloads
                            </button>
                          </span>
                        ),
                        { duration: 5000 },
                      );
                      onClose();
                    }
                  }}
                  onDownloadAllSubtitles={(l) => {
                    onDownloadBatchAllSubtitles(l, isOfflineMode);
                    if (isOfflineMode) {
                      toast(
                        (t) => (
                          <span className="flex items-center gap-2">
                            <span>
                              Added batch subtitles to offline storage!
                            </span>
                            <button
                              onClick={() => {
                                toast.dismiss(t.id);
                                navigate("/downloads");
                              }}
                              className="text-cyan-400 font-black hover:underline ml-1 cursor-pointer"
                            >
                              Go to Downloads
                            </button>
                          </span>
                        ),
                        { duration: 5000 },
                      );
                      onClose();
                    }
                  }}
                  onDownloadSingle={(src, id, ep) =>
                    handleSingleDownload(src, id, `S${selectedSeason}E${ep}`)
                  }
                />
              )}

              {/* ALL MODE */}
              {downloadMode === "all" && (
                <AllSeasonsSection
                  batchResults={batchResults}
                  batchLoading={batchLoading}
                  selectedSeason={selectedSeason}
                  onDownloadFullSeries={(q) => {
                    if (onDownloadFullSeries) {
                      onDownloadFullSeries(q, isOfflineMode);
                      if (isOfflineMode) {
                        toast(
                          (t) => (
                            <span className="flex items-center gap-2">
                              <span>Added full series to offline storage!</span>
                              <button
                                onClick={() => {
                                  toast.dismiss(t.id);
                                  navigate("/downloads");
                                }}
                                className="text-cyan-400 font-black hover:underline ml-1 cursor-pointer"
                              >
                                Go to Downloads
                              </button>
                            </span>
                          ),
                          { duration: 5000 },
                        );
                        onClose();
                      }
                    }
                  }}
                  onDownloadFullSeriesSubtitles={() => {
                    if (onDownloadFullSeriesSubtitles) {
                      onDownloadFullSeriesSubtitles(isOfflineMode);
                      if (isOfflineMode) {
                        toast(
                          (t) => (
                            <span className="flex items-center gap-2">
                              <span>Added full series subtitles offline!</span>
                              <button
                                onClick={() => {
                                  toast.dismiss(t.id);
                                  navigate("/downloads");
                                }}
                                className="text-cyan-400 font-black hover:underline ml-1 cursor-pointer"
                              >
                                Go to Downloads
                              </button>
                            </span>
                          ),
                          { duration: 5000 },
                        );
                        onClose();
                      }
                    }
                  }}
                  seasons={seasons}
                />
              )}

              {/* SINGLE MODE */}
              {downloadMode === "single" && (
                <>
                  {/* Video / Subtitle Tab Switcher */}
                  {subtitles && subtitles.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-5 p-1.5 rounded-2xl bg-black/40 border border-white/[0.05] shadow-inner">
                      <button
                        onClick={() => setActiveTab("video")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all duration-300",
                          activeTab === "video"
                            ? "bg-[#121216]/80 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-white/10"
                            : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
                        )}
                      >
                        <FileVideo size={14} /> Video Sources
                      </button>
                      <button
                        onClick={() => setActiveTab("subtitle")}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold transition-all duration-300",
                          activeTab === "subtitle"
                            ? "bg-[#121216]/80 text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-white/10"
                            : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
                        )}
                      >
                        <Globe size={14} /> Subtitles ({subtitles.length})
                      </button>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {activeTab === "video" && (
                      <motion.div
                        key="video-tab"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {sourcesLoading ? (
                          <LoadingState />
                        ) : sources.length > 0 ? (
                          <div className="space-y-3">
                            {sources.map((src, i) => {
                              const downloadId = `single_${subject.title}_S${selectedSeason}E${selectedEpisode}_${src.quality || "HD"}_${i}`;
                              return (
                                <QualitySourceCard
                                  key={downloadId}
                                  src={src}
                                  downloadId={downloadId}
                                  title={subject.title}
                                  episodeLabel={
                                    isTvSeries
                                      ? `S${selectedSeason}E${selectedEpisode}`
                                      : undefined
                                  }
                                  onDownload={(s, id) =>
                                    handleSingleDownload(
                                      s,
                                      id,
                                      isTvSeries
                                        ? `S${selectedSeason}E${selectedEpisode}`
                                        : undefined,
                                    )
                                  }
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState />
                        )}
                      </motion.div>
                    )}
                    {activeTab === "subtitle" && (
                      <motion.div
                        key="sub-tab"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SubtitleGrid
                          subtitles={subtitles}
                          title={subject.title}
                          onDownload={(sub, downloadId) => {
                            const ext = sub.url
                              ? sub.url.split(".").pop()?.split("?")[0] || "srt"
                              : "srt";
                            if (isOfflineMode) {
                              addOfflineDownload({
                                id: downloadId,
                                title: subject.title,
                                filename: `${subject.title}_${sub.lanName}.${ext}`,
                                type: "subtitle",
                                url: sub.url,
                              });
                              toast(
                                (t) => (
                                  <span className="flex items-center gap-2">
                                    <span>Subtitle added offline!</span>
                                    <button
                                      onClick={() => {
                                        toast.dismiss(t.id);
                                        navigate("/downloads");
                                      }}
                                      className="text-cyan-400 font-black hover:underline ml-1 cursor-pointer"
                                    >
                                      Go to Downloads
                                    </button>
                                  </span>
                                ),
                                { duration: 5000 },
                              );
                              onClose();
                              return;
                            }
                            addToHistory({
                              id: downloadId,
                              title: subject.title,
                              filename: `${subject.title}_${sub.lanName}.${ext}`,
                              type: "subtitle",
                              url: sub.url,
                            });
                            downloadSubtitle(
                              sub.url,
                              subject.title,
                              sub.lanName,
                              ext,
                              isTvSeries
                                ? `S${selectedSeason}E${selectedEpisode}`
                                : undefined,
                              subject.releaseDate,
                              (p) => {
                                setProgress(
                                  downloadId,
                                  p.progress,
                                  p.status === "done" || p.status === "error",
                                );
                              },
                            );
                            trackUmamiEvent("download", {
                              title: subject.title,
                              type: "subtitle",
                              language: sub.lanName,
                            });
                            trackUmamiEvent("download_subtitle", {
                              title: subject.title,
                              language: sub.lanName,
                            });
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Show subtitles inline if no tab switcher (no subtitles) */}
                  {(!subtitles || subtitles.length === 0) &&
                    !sourcesLoading &&
                    sources.length > 0 && (
                      <p className="text-[10px] text-[var(--rf-text-dim)] text-center mt-6">
                        No subtitles available for this episode
                      </p>
                    )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};

/* ============================================================
   SUB-COMPONENTS
   ============================================================ */

/* ─── Quality Source Card ─── */
function QualitySourceCard({
  src,
  downloadId,
  title,
  episodeLabel,
  onDownload,
}: {
  src: SourceItem;
  downloadId: string;
  title: string;
  episodeLabel?: string;
  onDownload: (src: SourceItem, id: string) => void;
}) {
  const progress = useDownloadStore(
    (state) => state.activeDownloads[downloadId] || 0,
  );
  const isDownloading = progress > 0;
  const quality = src.quality || "HD";
  const meta = getQualityMeta(quality);
  const preferred = getPreferredQuality();
  const isPreferred =
    preferred && quality.toLowerCase() === preferred.toLowerCase();

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onDownload(src, downloadId)}
      aria-label={`Download ${quality}`}
      className={cn(
        "w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 relative group overflow-hidden",
        "bg-[#121216]/60 hover:bg-[#121216]/80 border border-white/[0.04] hover:border-cyan-400/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(34,211,238,0.1)]",
        isPreferred && "border-cyan-400/20 bg-cyan-400/[0.03]",
      )}
    >
      {/* Progress fill */}
      {isDownloading && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400/20 to-cyan-400/5 pointer-events-none"
        />
      )}

      {/* Quality badge */}
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 relative",
          `bg-gradient-to-br ${meta.color} bg-opacity-15`,
        )}
        style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))`,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span className="text-base font-black text-white leading-none drop-shadow-md">
          {quality.replace("p", "")}
        </span>
        <span className="text-[7px] font-bold text-white/70 uppercase tracking-widest mt-0.5">
          {meta.label}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-black text-white">
            {quality} Quality
          </span>
          {isPreferred && (
            <span className="inline-flex items-center gap-1 text-[8px] font-black text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 shadow-inner">
              <Sparkles size={8} /> Preferred
            </span>
          )}
          {isDownloading && (
            <span className="text-[10px] font-black text-cyan-400 tabular-nums">
              {progress}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--rf-text-dim)] uppercase tracking-wider font-bold">
          {src.format && (
            <span className="bg-white/5 px-1.5 py-0.5 rounded">
              {src.format}
            </span>
          )}
          {src.size && (
            <span className="flex items-center gap-1.5">
              <Monitor size={10} />
              {formatFileSize(src.size)}
            </span>
          )}
          {episodeLabel && (
            <span className="text-cyan-400/80">{episodeLabel}</span>
          )}
        </div>
      </div>

      {/* Download arrow */}
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
          isDownloading
            ? "bg-cyan-400/20 text-cyan-400"
            : "bg-white/[0.04] text-white/40 group-hover:bg-cyan-400 group-hover:text-[#121216] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]",
        )}
      >
        {isDownloading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowDownToLine size={16} />
        )}
      </div>
    </motion.button>
  );
}

/* ─── Subtitle Grid ─── */
function SubtitleGrid({
  subtitles,
  title,
  onDownload,
}: {
  subtitles: any[];
  title: string;
  onDownload: (sub: any, id: string) => void;
}) {
  const activeDownloads = useDownloadStore((state) => state.activeDownloads);

  if (!subtitles || subtitles.length === 0)
    return (
      <div className="text-center py-10 text-[var(--rf-text-dim)] text-xs font-bold uppercase tracking-widest">
        No subtitles available
      </div>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {subtitles.map((sub: any, i: number) => {
        const downloadId = `sub_${sub.id || i}`;
        const progress = activeDownloads[downloadId] || 0;
        const isDownloading = progress > 0;

        return (
          <motion.button
            key={downloadId}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDownload(sub, downloadId)}
            className={cn(
              "relative flex items-center gap-3 p-3 rounded-2xl text-left transition-all group overflow-hidden",
              "bg-[#121216]/60 hover:bg-[#121216]/80 border border-white/[0.04] hover:border-blue-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)]",
            )}
          >
            {isDownloading && (
              <div
                className="absolute inset-y-0 left-0 bg-blue-500/10 pointer-events-none transition-all"
                style={{ width: `${progress}%` }}
              />
            )}
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 relative z-10 group-hover:bg-blue-500/20 transition-colors">
              {isDownloading ? (
                <Loader2 size={14} className="animate-spin text-blue-400" />
              ) : (
                <Globe size={14} className="text-blue-400" />
              )}
            </div>
            <div className="relative z-10 min-w-0 flex-1">
              <span className="text-[11px] font-black text-white block truncate mb-0.5">
                {sub.lanName}
              </span>
              <span className="text-[9px] font-bold text-[var(--rf-text-dim)] uppercase tracking-widest">
                .srt
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─── Batch Section ─── */
import { useMemo } from "react";
function BatchSection({
  batchResults,
  batchLoading,
  title,
  selectedSeason,
  onFetchBatch,
  onDownloadAll,
  onDownloadAllSubtitles,
  onDownloadSingle,
}: {
  batchResults: BatchEpisodeResult[];
  batchLoading: boolean;
  title: string;
  selectedSeason: number;
  onFetchBatch: () => void;
  onDownloadAll: (q?: string) => void;
  onDownloadAllSubtitles: (l?: string) => void;
  onDownloadSingle: (src: SourceItem, id: string, ep: number) => void;
}) {
  const [selectedQuality, setSelectedQuality] = useState("");
  const [selectedLang, setSelectedLang] = useState("");

  const availableCount = batchResults.filter(
    (r) => r.sources.length > 0,
  ).length;
  const subtitleCount = batchResults.filter(
    (r) => r.subtitles?.length > 0,
  ).length;

  const allQualities = useMemo(() => {
    const set = new Set<string>();
    batchResults.forEach((ep) =>
      ep.sources.forEach((s) => {
        if (s.quality) set.add(s.quality);
      }),
    );
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numB - numA;
    });
  }, [batchResults]);

  const allLangs = useMemo(
    () =>
      Array.from(
        new Set(
          batchResults
            .flatMap((ep) => ep.subtitles?.map((s: any) => s.lanName) || [])
            .filter(Boolean),
        ),
      ),
    [batchResults],
  );

  const activeQ = selectedQuality || allQualities[0] || "";
  const activeLang = selectedLang || allLangs[0] || "";

  // Not fetched yet — show loading since auto-fetch kicks in
  if (!batchLoading && batchResults.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white mb-0.5">
            Preparing Batch...
          </p>
          <p className="text-[10px] text-[var(--rf-text-dim)]">
            Season {selectedSeason} — Initializing
          </p>
        </div>
      </div>
    );
  }

  // Loading
  if (batchLoading) {
    return (
      <div className="py-16 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-2xl bg-purple-500/20"
          />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white mb-0.5">
            Analyzing Episodes...
          </p>
          <p className="text-[10px] text-[var(--rf-text-dim)]">
            Fetching download links for Season {selectedSeason}
          </p>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-emerald-400 font-bold">
          <Check size={12} />
          {availableCount}/{batchResults.length} available
        </span>
        {subtitleCount > 0 && (
          <span className="flex items-center gap-1 text-blue-400 font-bold">
            <Globe size={11} />
            {subtitleCount} with subs
          </span>
        )}
      </div>

      {/* Quality select + Download All Season */}
      {allQualities.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={12} className="text-cyan-400" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
              Season Quick Download
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allQualities.map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuality(q)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]",
                  activeQ === q
                    ? "bg-[#121216] text-white border border-cyan-400/30 shadow-[0_4px_20px_rgba(34,211,238,0.2)]"
                    : "bg-[#121216]/60 text-[var(--rf-text-muted)] hover:text-white border border-white/[0.05] hover:border-cyan-400/20",
                )}
              >
                {q}
              </button>
            ))}
          </div>
          <button
            onClick={() => onDownloadAll(activeQ || undefined)}
            className="w-full py-3.5 rounded-xl bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400 hover:text-[#121216] border border-cyan-400/20 hover:border-cyan-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_8px_30px_rgba(34,211,238,0.1)] hover:shadow-[0_8px_30px_rgba(34,211,238,0.3)]"
          >
            <Download size={14} />
            Download Season {selectedSeason} — {activeQ}
          </button>
        </div>
      )}

      {/* Subtitles batch download */}
      {subtitleCount > 0 && allLangs.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Globe size={12} className="text-blue-400" />
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
              Subtitles
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allLangs.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]",
                  activeLang === lang
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
                    : "bg-[#121216]/60 text-[var(--rf-text-muted)] hover:text-white border border-white/[0.05] hover:border-blue-500/20",
                )}
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            onClick={() => onDownloadAllSubtitles(activeLang || undefined)}
            className="w-full py-3.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20 hover:border-blue-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_8px_30px_rgba(59,130,246,0.1)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.3)]"
          >
            <Globe size={14} />
            Download Season Subtitles — {activeLang}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Loading State ─── */
function LoadingState() {
  return (
    <div className="py-16 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-14 h-14 rounded-2xl bg-[var(--rf-red)]/10 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[var(--rf-red)]" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.05, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl bg-[var(--rf-red)]/15"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white mb-0.5">
          Finding Sources...
        </p>
        <p className="text-[10px] text-[var(--rf-text-dim)]">
          Scanning for the best download links
        </p>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
        <HardDriveDownload size={28} className="text-[var(--rf-text-dim)]" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white mb-0.5">No Sources Found</p>
        <p className="text-[10px] text-[var(--rf-text-dim)] max-w-[220px]">
          Try selecting a different season or episode. Sources may not be
          available yet.
        </p>
      </div>
    </div>
  );
}

/* ─── All Seasons Section ─── */
function AllSeasonsSection({
  batchResults,
  batchLoading,
  selectedSeason,
  onDownloadFullSeries,
  onDownloadFullSeriesSubtitles,
  seasons,
}: {
  batchResults: BatchEpisodeResult[];
  batchLoading: boolean;
  selectedSeason: number;
  onDownloadFullSeries?: (q?: string) => void;
  onDownloadFullSeriesSubtitles?: () => void;
  seasons?: Season[];
}) {
  const [selectedQuality, setSelectedQuality] = useState("");
  const totalSeriesEpisodes = useMemo(
    () => seasons?.reduce((acc, s) => (s.se > 0 ? acc + s.maxEp : acc), 0) || 0,
    [seasons],
  );

  const allQualities = useMemo(() => {
    const set = new Set<string>();
    batchResults.forEach((ep) =>
      ep.sources.forEach((s) => {
        if (s.quality) set.add(s.quality);
      }),
    );
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numB - numA;
    });
  }, [batchResults]);

  const activeQ = selectedQuality || allQualities[0] || "";

  // Loading state
  if (batchLoading || (batchResults.length === 0 && !batchLoading)) {
    return (
      <div className="py-16 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
          {batchLoading && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-2xl bg-purple-500/20"
            />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white mb-0.5">
            {batchLoading ? "Analyzing Episodes..." : "Preparing Data..."}
          </p>
          <p className="text-[10px] text-[var(--rf-text-dim)]">
            Fetching quality information for Season {selectedSeason}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onDownloadFullSeries &&
        totalSeriesEpisodes > 0 &&
        allQualities.length > 0 && (
          <div className="p-4 rounded-2xl bg-purple-500/[0.02] border border-purple-500/10 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Package size={12} className="text-purple-400" />
              <span className="text-[10px] font-black text-purple-400/70 uppercase tracking-widest">
                Entire Series Download
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {allQualities.map((q) => (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]",
                    activeQ === q
                      ? "bg-[#121216] text-purple-300 border border-purple-400/30 shadow-[0_4px_20px_rgba(168,85,247,0.2)]"
                      : "bg-[#121216]/60 text-[var(--rf-text-muted)] hover:text-white border border-white/[0.05] hover:border-purple-400/20",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-white/50 leading-relaxed font-medium">
              This will fetch and download all {totalSeriesEpisodes} episodes
              across all seasons. Depending on the size, this might take a
              significant amount of time.
            </p>

            <button
              onClick={() => onDownloadFullSeries(activeQ || undefined)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 hover:from-purple-500 hover:to-indigo-500 hover:text-white border border-purple-500/30 hover:border-purple-400/50 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_8px_30px_rgba(168,85,247,0.1)] hover:shadow-[0_8px_30px_rgba(168,85,247,0.4)] mb-2.5"
            >
              <Package size={14} />
              Download All Seasons — {activeQ}
            </button>

            {onDownloadFullSeriesSubtitles && (
              <button
                onClick={() => onDownloadFullSeriesSubtitles()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 hover:from-blue-500 hover:to-cyan-500 hover:text-white border border-blue-500/30 hover:border-blue-400/50 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_8px_30px_rgba(59,130,246,0.1)] hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)]"
              >
                <Globe size={14} />
                Download All Subtitles (All Seasons)
              </button>
            )}
          </div>
        )}
    </div>
  );
}
