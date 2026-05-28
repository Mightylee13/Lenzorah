import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  HardDriveDownload,
  Download,
  ListVideo,
  Loader2,
  X,
  Tv2,
  Star,
  WifiOff,
  Package,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import { Season, SourceItem, SubjectInfo, BatchEpisodeResult } from "../types";
import { EpisodeSelector } from "./EpisodeSelector";
import { BatchDownloads } from "./BatchDownloads";
import { SourceCard } from "./SourceCard";
import { SubtitleList } from "./SubtitleList";
import { useDownloadStore } from "../hooks/useDownloadStore";
import { useProgressStore } from "../../../stores/useProgressStore";
import { downloadMovie } from "../../../utils/download";
import { saveVideoOffline, isVideoSaved } from "../../../utils/saveOffline";

type ActiveMode = "download" | "offline";
type DownloadTab = "single" | "batch" | "all";

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: SubjectInfo;
  isTvSeries: boolean;
  seasons: Season[];
  selectedSeason: number;
  selectedEpisode: number;
  downloadMode: "single" | "batch";
  sources: SourceItem[];
  subtitles: any[];
  sourcesLoading: boolean;
  batchResults: BatchEpisodeResult[];
  batchLoading: boolean;
  onSeasonChange: (s: number) => void;
  onEpisodeChange: (e: number) => void;
  onModeChange: (m: "single" | "batch") => void;
  onFetchBatch: () => void;
  onDownloadBatchAll: (preferredQuality?: string) => void;
  onDownloadBatchAllSubtitles: (language?: string) => void;
}

const QUALITIES = ["1080p", "480p", "360p"];

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
}: DownloadModalProps) => {
  const setProgress = useDownloadStore((s) => s.setProgress);
  const addToHistory = useDownloadStore((s) => s.addToHistory);
  const markEpisodeComplete = useProgressStore((s) => s.markEpisodeComplete);
  const modalRef = useRef<HTMLDivElement>(null);

  const [activeMode, setActiveMode] = useState<ActiveMode>("download");
  const [activeTab, setActiveTab] = useState<DownloadTab>("all");
  const [selectedQuality, setSelectedQuality] = useState("360p");
  const [offlineSaved, setOfflineSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOfflineSaved(isVideoSaved(subject.subjectId || subject.title));
    }
  }, [isOpen, subject]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Sync internal tab with external downloadMode
  useEffect(() => {
    if (downloadMode === "batch") setActiveTab("batch");
  }, [downloadMode]);

  const handleTabChange = (tab: DownloadTab) => {
    setActiveTab(tab);
    if (tab === "single") onModeChange("single");
    else if (tab === "batch") onModeChange("batch");
    else onModeChange("single");
  };

  const handleSingleDownload = (
    src: SourceItem,
    downloadId: string,
    episodeLabel?: string,
  ) => {
    addToHistory({
      id: downloadId,
      title: subject.title,
      filename: episodeLabel
        ? `${subject.title} - ${episodeLabel}`
        : subject.title,
      quality: src.quality || "HD",
      type: "movie",
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
    );
    if (isTvSeries) {
      const match = episodeLabel?.match(/E(\d+)/);
      if (match?.[1])
        markEpisodeComplete(
          subject.subjectId || "",
          selectedSeason,
          parseInt(match[1], 10),
        );
    }
  };

  const handleSaveOffline = () => {
    const firstSource = sources[0];
    saveVideoOffline({
      id: subject.subjectId || subject.title,
      title: subject.title,
      videoUrl: firstSource?.stream_url || firstSource?.download_url || "",
      thumbnailUrl: subject.poster || "",
      quality: selectedQuality,
      episodeInfo: isTvSeries
        ? `Season ${selectedSeason} · Episode ${selectedEpisode}`
        : undefined,
    });
    setOfflineSaved(true);
  };

  const episodeCount = isTvSeries
    ? (seasons.find((s) => s.season_number === selectedSeason)?.episodes
        ?.length ?? 0)
    : 0;

  const totalEpisodes = isTvSeries
    ? seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0)
    : 0;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="relative z-[100]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dm-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Panel — centered card on desktop, bottom sheet on mobile */}
          <div className="fixed inset-0 flex items-end md:items-center justify-center pointer-events-none">
            <motion.div
              ref={modalRef}
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 30, stiffness: 260 }}
              className="pointer-events-auto w-full md:w-[560px] bg-[#111111] border border-white/[0.08] rounded-t-[20px] md:rounded-[20px] max-h-[88vh] overflow-hidden flex flex-col"
            >
              {/* ── Header ── */}
              <div className="flex items-start gap-3 p-5 pb-4 border-b border-white/[0.06]">
                {/* Poster */}
                <div className="w-[68px] h-[96px] rounded-xl overflow-hidden shrink-0 bg-white/[0.05] border border-white/[0.08]">
                  {subject.poster ? (
                    <img
                      src={subject.poster}
                      alt={subject.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <HardDriveDownload size={22} className="text-white/20" />
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    {isTvSeries && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold tracking-wide">
                        <Tv2 size={10} /> SERIES
                      </span>
                    )}
                    {subject.rating && (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-[11px] font-semibold">
                        <Star size={10} fill="currentColor" /> {subject.rating}
                      </span>
                    )}
                  </div>
                  <h2
                    id="dm-title"
                    className="text-white text-[17px] font-bold leading-snug truncate"
                  >
                    {subject.title}
                  </h2>
                  {isTvSeries && (
                    <p className="text-white/30 text-[11px] tracking-widest uppercase mt-0.5">
                      Season {selectedSeason} · {episodeCount} episodes
                      available
                    </p>
                  )}
                </div>

                {/* Close */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0"
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* ── Mode toggle: Download / Save Offline ── */}
              <div className="grid grid-cols-2 gap-2 px-5 pt-4">
                <button
                  onClick={() => setActiveMode("download")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-all border",
                    activeMode === "download"
                      ? "bg-white/[0.06] border-white/[0.12] text-white"
                      : "border-white/[0.05] bg-transparent text-white/40 hover:text-white/60",
                  )}
                >
                  <Download size={15} />
                  Download to phone
                </button>
                <button
                  onClick={() => setActiveMode("offline")}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all border",
                    activeMode === "offline"
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                      : "border-white/[0.05] bg-transparent text-white/40 hover:text-white/60",
                  )}
                >
                  <WifiOff size={15} />
                  Save offline (30 days)
                </button>
              </div>

              {/* ── Tab bar: Single / Batch / All ── */}
              <div className="flex gap-1 mx-5 mt-3 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                {(["single", "batch", "all"] as DownloadTab[]).map((tab) => {
                  const icons = {
                    single: <Download size={12} />,
                    batch: <ListVideo size={12} />,
                    all: <Package size={12} />,
                  };
                  const labels = {
                    single: "Single",
                    batch: "Batch",
                    all: "All",
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-all",
                        activeTab === tab
                          ? "bg-[#1e1e1e] text-white shadow-sm"
                          : "text-white/35 hover:text-white/60",
                      )}
                    >
                      {icons[tab]} {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* ── Scrollable content ── */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {/* ══ SAVE OFFLINE MODE ══ */}
                {activeMode === "offline" && (
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-4">
                    <p className="text-purple-400 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-1.5">
                      <WifiOff size={12} /> Save for offline viewing
                    </p>
                    <div className="flex gap-2">
                      {QUALITIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => setSelectedQuality(q)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all",
                            selectedQuality === q
                              ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                              : "bg-transparent border-white/[0.08] text-white/40 hover:text-white/70",
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                    <p className="text-white/25 text-[12px] leading-relaxed">
                      Saves the video link locally for quick access. Requires
                      internet to stream. Auto-expires after 30 days.
                    </p>
                    <button
                      onClick={handleSaveOffline}
                      disabled={offlineSaved}
                      className={cn(
                        "w-full py-3.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all border",
                        offlineSaved
                          ? "bg-green-500/10 border-green-500/20 text-green-400 cursor-default"
                          : "bg-purple-600/80 hover:bg-purple-600 border-purple-500/30 text-white",
                      )}
                    >
                      {offlineSaved ? (
                        <>
                          <CheckCircle2 size={16} /> Saved — {selectedQuality}
                        </>
                      ) : (
                        <>
                          <WifiOff size={15} /> Save offline — {selectedQuality}
                        </>
                      )}
                    </button>
                    <button className="w-full py-3.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15 transition-all">
                      <Globe size={15} /> Save all subtitles
                    </button>
                  </div>
                )}

                {/* ══ DOWNLOAD MODE ══ */}
                {activeMode === "download" && (
                  <>
                    {/* Episode selector (TV only) */}
                    <EpisodeSelector
                      seasons={seasons}
                      selectedSeason={selectedSeason}
                      selectedEpisode={selectedEpisode}
                      downloadMode={downloadMode}
                      onSeasonChange={onSeasonChange}
                      onEpisodeChange={onEpisodeChange}
                      subjectId={subject.subjectId}
                    />

                    {/* ALL tab */}
                    {activeTab === "all" && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                        <p className="text-purple-400 text-[11px] font-semibold tracking-widest uppercase flex items-center gap-1.5">
                          <Package size={12} /> Entire series download
                        </p>
                        <div className="flex gap-2">
                          {QUALITIES.map((q) => (
                            <button
                              key={q}
                              onClick={() => setSelectedQuality(q)}
                              className={cn(
                                "px-4 py-2 rounded-lg text-[12px] font-semibold border transition-all",
                                selectedQuality === q
                                  ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                                  : "bg-transparent border-white/[0.08] text-white/40 hover:text-white/70",
                              )}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                        <p className="text-white/25 text-[12px] leading-relaxed">
                          This will fetch and download all {totalEpisodes}{" "}
                          episodes across all seasons. Depending on size, this
                          might take a significant amount of time.
                        </p>
                        <button
                          onClick={() => onDownloadBatchAll(selectedQuality)}
                          className="w-full py-3.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white transition-all"
                        >
                          <Package size={15} />
                          Download all seasons — {selectedQuality}
                        </button>
                        <button
                          onClick={() => onDownloadBatchAllSubtitles()}
                          className="w-full py-3.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/15 transition-all"
                        >
                          <Globe size={15} />
                          Download all subtitles (all seasons)
                        </button>
                      </div>
                    )}

                    {/* SINGLE tab */}
                    {activeTab === "single" && (
                      <>
                        {sourcesLoading ? (
                          <div className="py-12 flex justify-center">
                            <Loader2
                              size={24}
                              className="animate-spin text-purple-400"
                            />
                          </div>
                        ) : sources.length > 0 ? (
                          <div className="space-y-2">
                            {sources.map((src, i) => {
                              const downloadId = `single_${subject.title}_S${selectedSeason}E${selectedEpisode}_${src.quality || "HD"}_${i}`;
                              return (
                                <SourceCard
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
                            <SubtitleList
                              subtitles={subtitles}
                              title={subject.title}
                            />
                          </div>
                        ) : (
                          <div className="text-center py-10 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                            <Download
                              size={22}
                              className="text-white/15 mx-auto mb-2"
                            />
                            <p className="text-white/30 text-[12px]">
                              No sources available
                            </p>
                            <p className="text-white/15 text-[11px] mt-0.5">
                              Try a different season or episode
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* BATCH tab */}
                    {activeTab === "batch" && (
                      <>
                        {!batchLoading && batchResults.length === 0 && (
                          <button
                            onClick={onFetchBatch}
                            className="w-full py-3.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white transition-all"
                          >
                            <ListVideo size={15} />
                            Fetch all episodes — Season {selectedSeason}
                          </button>
                        )}
                        {batchLoading && (
                          <div className="py-10 flex flex-col items-center gap-3">
                            <Loader2
                              size={22}
                              className="animate-spin text-purple-400"
                            />
                            <p className="text-white/30 text-[12px]">
                              Fetching episode links...
                            </p>
                          </div>
                        )}
                        {batchResults.length > 0 && (
                          <BatchDownloads
                            batchResults={batchResults}
                            title={subject.title}
                            selectedSeason={selectedSeason}
                            onDownloadAll={onDownloadBatchAll}
                            onDownloadAllSubtitles={onDownloadBatchAllSubtitles}
                            onDownloadSingle={(src, id, ep) =>
                              handleSingleDownload(
                                src,
                                id,
                                `S${selectedSeason}E${ep}`,
                              )
                            }
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
};
