import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  Film,
  FileText,
  Download as DownloadIcon,
  Clock,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCw,
  ArrowDown,
  Sparkles,
  MoreVertical,
  Ban,
  Play,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  useDownloadStore,
  DownloadHistoryItem,
} from "./MovieDetails/hooks/useDownloadStore";
import { saveVideoOffline } from "../utils/saveOffline";
import { getRelativeTime } from "../utils/format";
import { useSEO } from "../hooks/useSEO";
import { downloadFile } from "../utils/download";
import { buildMoviePath } from "../utils/slug";
import toast from "react-hot-toast";
import { cn } from "../utils/cn";

interface ProcessedDownloadItem {
  key: string;
  isBatch: boolean;
  type: "movie" | "subtitle";
  title: string;
  timestamp: number;
  quality?: string;
  filename?: string;
  count?: number;
  url?: string;
  downloadUrl?: string;
  streamUrl?: string;
  id?: string;
  allIds?: string[];
  items?: {
    id: string;
    filename: string;
    quality?: string;
    timestamp: number;
    url?: string;
    downloadUrl?: string;
    streamUrl?: string;
    count: number;
    allIds: string[];
  }[];
}

const isDesktop =
  typeof navigator !== "undefined"
    ? !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      )
    : false;
const saveLabel = isDesktop ? "Save to Desktop" : "Save to Phone";
const saveAllLabel = isDesktop ? "Save All to Desktop" : "Save All to Phone";

export default function Downloads() {
  const navigate = useNavigate();
  useSEO({
    title: "Downloads & Offline Storage | Runflix Premium",
    description:
      "Manage your high-speed cloud download logs and in-app offline storage container.",
  });

  const history = useDownloadStore((state) => state.history);
  const clearHistory = useDownloadStore((state) => state.clearHistory);
  const removeFromHistory = useDownloadStore(
    (state) => state.removeFromHistory,
  );
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);
  const expireOldDownloads = useDownloadStore(
    (state) => state.expireOldDownloads,
  );

  useEffect(() => {
    expireOldDownloads();
  }, [expireOldDownloads]);

  // Also expire saveVideoOffline items on mount
  useEffect(() => {
    saveVideoOffline.getState().expireOld();
  }, []);

  const [activeSection, setActiveSection] = useState<"offline" | "cloud">(
    "offline",
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>(
    {},
  );
  const [batchDownloading, setBatchDownloading] = useState<
    Record<string, boolean>
  >({});
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{
    used: string;
    total: string;
    percent: number;
  } | null>(null);
  const [isStoragePersistent, setIsStoragePersistent] =
    useState<boolean>(false);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((estimate) => {
          const used = estimate.usage || 0;
          const total = estimate.quota || 1;
          const percent = Math.round((used / total) * 100);
          const fmt = (b: number) =>
            b >= 1024 * 1024 * 1024
              ? `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`
              : `${(b / (1024 * 1024)).toFixed(0)} MB`;
          setStorageEstimate({ used: fmt(used), total: fmt(total), percent });
        })
        .catch(() => {});
    }
    if (navigator.storage?.persisted) {
      navigator.storage
        .persisted()
        .then(setIsStoragePersistent)
        .catch(() => {});
    }
  }, [history]);

  const handleRequestPersistence = async () => {
    if (navigator.storage?.persist) {
      try {
        const persisted = await navigator.storage.persist();
        setIsStoragePersistent(persisted);
        if (persisted)
          toast.success(
            "Storage locked to device — OS will never auto-delete downloads.",
            { duration: 5000 },
          );
        else
          toast("Persistence denied by browser/device settings.", {
            icon: "ℹ️",
          });
      } catch {
        toast.error("Could not request persistence.");
      }
    } else {
      toast.error("Device does not support storage persistence settings.");
    }
  };

  useEffect(() => {
    if (!activeMenuId) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".dropdown-trigger") && !t.closest(".dropdown-menu"))
        setActiveMenuId(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [activeMenuId]);

  const cloudHistory = useMemo(
    () => history.filter((h) => !h.isOffline),
    [history],
  );
  const offlineHistory = useMemo(
    () => history.filter((h) => h.isOffline),
    [history],
  );

  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleDownloadAgain = async (item: {
    url?: string;
    downloadUrl?: string;
    streamUrl?: string;
    title: string;
    filename: string;
    id: string;
  }) => {
    const targetUrl = item.downloadUrl || item.url || item.streamUrl;
    if (!targetUrl) {
      toast("Direct link not saved. Opening movie details page...", {
        icon: "🔍",
      });
      const parts = item.id.split("_");
      const subjectId = parts.find((p) => /^\d+$/.test(p)) || "";
      window.location.href = subjectId
        ? buildMoviePath(item.title, subjectId)
        : `/search?q=${encodeURIComponent(item.title)}`;
      return;
    }
    setDownloadingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await downloadFile(targetUrl, item.filename);
      toast.success(`Downloading ${item.filename}`);
    } catch {
      toast.error("Failed to trigger download");
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const handleDeleteMultiple = (ids: string[]) => {
    ids.forEach((id) => removeFromHistory(id));
    toast.success("Removed successfully");
  };

  const handleBatchDownload = async (group: any) => {
    if (!group.items?.length) return;
    setBatchDownloading((prev) => ({ ...prev, [group.key]: true }));
    try {
      await Promise.all(
        group.items.map(async (item: any) => {
          const url = item.downloadUrl || item.url || item.streamUrl;
          if (url) await downloadFile(url, item.filename);
        }),
      );
      toast.success("Batch download started");
    } catch {
      toast.error("Batch download failed");
    } finally {
      setBatchDownloading((prev) => ({ ...prev, [group.key]: false }));
    }
  };

  // ── Cloud grouping (unchanged) ────────────────────────────────────────────
  const processedCloudItems = useMemo(() => {
    const processed: ProcessedDownloadItem[] = [];
    const fileGroups: Record<string, typeof cloudHistory> = {};
    cloudHistory.forEach((item) => {
      const key = `${item.title.trim()}_${(item.filename || "").trim()}_${item.type}`;
      if (!fileGroups[key]) fileGroups[key] = [];
      fileGroups[key].push(item);
    });
    const uniqueFiles = Object.entries(fileGroups).map(([key, items]) => {
      const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);
      const mostRecent = sorted[0];
      const qualities = Array.from(
        new Set(items.map((i) => i.quality).filter(Boolean)),
      );
      return {
        key,
        id: mostRecent.id,
        title: mostRecent.title,
        filename: mostRecent.filename,
        quality:
          qualities.length > 0 ? qualities.join("/") : mostRecent.quality,
        type: mostRecent.type,
        timestamp: mostRecent.timestamp,
        url: mostRecent.url,
        downloadUrl: mostRecent.downloadUrl,
        streamUrl: mostRecent.streamUrl,
        count: items.length,
        allIds: items.map((i) => i.id),
      };
    });
    const tvShowGroups: Record<string, typeof uniqueFiles> = {};
    const standaloneFiles: typeof uniqueFiles = [];
    uniqueFiles.forEach((file) => {
      const isTvEpisode =
        /S\d+E\d+/i.test(file.filename) ||
        file.filename.toLowerCase().includes("episode") ||
        file.id.startsWith("batch_");
      if (isTvEpisode) {
        const groupKey = `tv_${file.title}_${file.type}`;
        if (!tvShowGroups[groupKey]) tvShowGroups[groupKey] = [];
        tvShowGroups[groupKey].push(file);
      } else {
        standaloneFiles.push(file);
      }
    });
    Object.entries(tvShowGroups).forEach(([groupKey, episodes]) => {
      const seasonNumbers = episodes.map((ep) => {
        const m = /S(\d+)E\d+/i.exec(ep.filename);
        return m ? parseInt(m[1], 10) : 0;
      });
      const minS = Math.min(...seasonNumbers),
        maxS = Math.max(...seasonNumbers);
      const seasonLabel = minS === maxS ? `S${minS}` : `S${minS}-${maxS}`;
      const sorted = [...episodes].sort((a, b) => {
        const am = /S(\d+)E(\d+)/i.exec(a.filename),
          bm = /S(\d+)E(\d+)/i.exec(b.filename);
        const as_ = am ? parseInt(am[1], 10) : 0,
          bs = bm ? parseInt(bm[1], 10) : 0;
        const ae = am ? parseInt(am[2], 10) : 0,
          be = bm ? parseInt(bm[2], 10) : 0;
        return as_ !== bs ? as_ - bs : ae - be;
      });
      const first = sorted[0];
      processed.push({
        key: groupKey,
        isBatch: true,
        type: first.type,
        title: `${first.title} (${seasonLabel})`,
        timestamp: Math.max(...episodes.map((e) => e.timestamp)),
        items: sorted.map((ep) => ({
          id: ep.id,
          filename: ep.filename,
          quality: ep.quality,
          timestamp: ep.timestamp,
          url: ep.url,
          downloadUrl: ep.downloadUrl,
          streamUrl: ep.streamUrl,
          count: ep.count,
          allIds: ep.allIds,
        })),
      });
    });
    standaloneFiles.forEach((file) => {
      processed.push({
        key: file.key,
        isBatch: false,
        type: file.type,
        title: file.title,
        filename: file.filename,
        quality: file.quality,
        timestamp: file.timestamp,
        count: file.count,
        url: file.url,
        downloadUrl: file.downloadUrl,
        streamUrl: file.streamUrl,
        id: file.id,
        allIds: file.allIds,
      });
    });
    return processed.sort((a, b) => b.timestamp - a.timestamp);
  }, [cloudHistory]);

  // ── Offline grouping ──────────────────────────────────────────────────────
  const processedOfflineGroups = useMemo(() => {
    const groups: Record<string, typeof offlineHistory> = {};
    offlineHistory.forEach((item) => {
      if (!groups[item.title]) groups[item.title] = [];
      groups[item.title].push(item);
    });
    return Object.entries(groups)
      .map(([title, items]) => {
        const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);
        return {
          title,
          isStack: items.length > 1,
          items: sorted,
          type: sorted[0].type,
          timestamp: Math.max(...items.map((i) => i.timestamp)),
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [offlineHistory]);

  const handlePlayOffline = (item: DownloadHistoryItem) => {
    if (!item.offlineComplete) {
      toast.error("Still downloading — wait until 100% to play.");
      return;
    }
    navigate(`/watch-offline/${item.id}?autoplay=true`);
  };

  const handleSaveToPhone = async (item: DownloadHistoryItem) => {
    const targetUrl = item.downloadUrl || item.url || item.streamUrl;
    if (!targetUrl) {
      toast.error("Direct download URL unavailable.");
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = targetUrl;
      a.download = item.filename || item.title;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Triggered download for: ${item.filename || item.title}`);
      if (item.type === "movie") {
        const cleanId = item.id.replace("_offline", "");
        const subs = history.filter(
          (h) => h.isOffline && h.type === "subtitle" && h.id.includes(cleanId),
        );
        for (const sub of subs) {
          const subUrl = sub.url || sub.downloadUrl || sub.streamUrl;
          if (subUrl) {
            await new Promise((r) => setTimeout(r, 800));
            const sa = document.createElement("a");
            sa.href = subUrl;
            sa.download = sub.filename;
            sa.style.display = "none";
            document.body.appendChild(sa);
            sa.click();
            document.body.removeChild(sa);
          }
        }
      }
    } catch {
      toast.error("Failed to trigger download.");
    }
  };

  const handleSaveAllToPhone = async (items: DownloadHistoryItem[]) => {
    let count = 0;
    const videoIds: string[] = [];
    for (const item of items) {
      const url = item.downloadUrl || item.url || item.streamUrl;
      if (url) {
        if (item.type === "movie")
          videoIds.push(item.id.replace("_offline", ""));
        const a = document.createElement("a");
        a.href = url;
        a.download = item.filename || item.title;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        count++;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    for (const vidId of videoIds) {
      const subs = history.filter(
        (h) => h.isOffline && h.type === "subtitle" && h.id.includes(vidId),
      );
      for (const sub of subs) {
        const subUrl = sub.url || sub.downloadUrl || sub.streamUrl;
        if (subUrl) {
          const a = document.createElement("a");
          a.href = subUrl;
          a.download = sub.filename;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          count++;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }
    toast.success(`Triggered download for all ${count} files!`);
  };

  return (
    <div className="min-h-screen px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 max-w-[1000px] mx-auto w-full py-24 md:py-28 relative">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full relative"
      >
        <div className="absolute top-10 left-10 w-[200px] h-[200px] bg-cyan-500/5 blur-[90px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-white/[0.04]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded bg-cyan-400/10 text-[9px] font-black uppercase tracking-wider text-cyan-400 border border-cyan-400/20">
                Download Center
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <HardDrive size={28} className="text-cyan-400" /> My Downloads
            </h1>
            <p className="text-xs text-[var(--rf-text-dim)] font-medium mt-1">
              Access your containerized offline content or high-speed cloud
              download records.
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.02] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-xs font-bold text-[var(--rf-text-muted)] hover:text-white transition-all active:scale-95 group cursor-pointer self-start md:self-auto shrink-0"
            >
              <Trash2
                size={13}
                className="text-white/40 group-hover:text-[var(--rf-red)] transition-colors"
              />{" "}
              Clear All
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="relative z-10 flex items-center p-1.5 rounded-2xl bg-black/40 border border-white/[0.05] shadow-inner mb-8 max-w-md">
          <button
            onClick={() => setActiveSection("offline")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
              activeSection === "offline"
                ? "bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/20 text-cyan-400 shadow-[0_4px_20px_rgba(34,211,238,0.15)]"
                : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
            )}
          >
            <HardDrive size={13} /> Offline Storage ({offlineHistory.length})
          </button>
          <button
            onClick={() => setActiveSection("cloud")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer",
              activeSection === "cloud"
                ? "bg-gradient-to-r from-red-600/20 to-rose-600/20 border border-red-500/20 text-red-400 shadow-[0_4px_20px_rgba(244,63,94,0.15)]"
                : "text-[var(--rf-text-dim)] hover:text-white hover:bg-white/[0.02]",
            )}
          >
            <DownloadIcon size={13} /> Cloud History ({cloudHistory.length})
          </button>
        </div>

        {/* OFFLINE SECTION */}
        {activeSection === "offline" && (
          <div className="relative z-10 space-y-6 mb-10">
            {storageEstimate && (
              <div className="p-5 rounded-3xl border border-white/[0.04] bg-[#07070a]/60 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                      Sandbox Storage
                    </span>
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest py-0.5 px-2 rounded border",
                        isStoragePersistent
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20",
                      )}
                    >
                      {isStoragePersistent
                        ? "Persistent (Locked)"
                        : "Transient Storage"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs bg-white/5 rounded-full h-2 overflow-hidden border border-white/[0.04]">
                      <div
                        style={{ width: `${storageEstimate.percent}%` }}
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[var(--rf-text-muted)] font-bold shrink-0">
                      {storageEstimate.used} of {storageEstimate.total} used (
                      {storageEstimate.percent}%)
                    </span>
                  </div>
                  {!isStoragePersistent && (
                    <p className="text-[9px] text-[var(--rf-text-dim)] font-medium mt-2 leading-relaxed">
                      ⚠️ Transiency Alert: Your OS may auto-clean offline files
                      when disk space runs low.
                    </p>
                  )}
                </div>
                {!isStoragePersistent && (
                  <button
                    onClick={handleRequestPersistence}
                    className="flex items-center justify-center gap-2 h-9 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 cursor-pointer"
                  >
                    <ShieldCheck size={13} /> Lock to Phone Storage
                  </button>
                )}
              </div>
            )}

            {offlineHistory.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-white/[0.04] bg-white/[0.01] p-12 md:p-20 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-3xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-6">
                  <HardDrive size={24} className="text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  No offline storage containers
                </h3>
                <p className="text-xs text-[var(--rf-text-dim)] max-w-xs mx-auto leading-relaxed">
                  Use "Save Offline" in the download modal to save content here.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {processedOfflineGroups.map((group) => {
                  const isExpanded = !!expandedGroups[group.title];
                  if (group.isStack) {
                    const downloading = group.items.filter(
                      (i) => !i.offlineComplete,
                    );
                    const hasActive = downloading.length > 0;
                    const avgProgress = hasActive
                      ? Math.round(
                          downloading.reduce(
                            (a, i) => a + (i.offlineProgress || 0),
                            0,
                          ) / downloading.length,
                        )
                      : 0;
                    return (
                      <div key={group.title} className="relative z-10">
                        {!isExpanded && (
                          <>
                            <div className="absolute inset-0 bg-[#0a0a0c]/80 border border-white/[0.03] rounded-3xl translate-y-3.5 scale-[0.94] -z-20 blur-[1px] h-full" />
                            <div className="absolute inset-0 bg-[#121216]/90 border border-white/[0.04] rounded-3xl translate-y-1.5 scale-[0.97] -z-10 h-full" />
                          </>
                        )}
                        <div className="rounded-3xl border border-white/[0.06] bg-[#121216]/95 hover:border-cyan-500/25 transition-all shadow-xl backdrop-blur-3xl">
                          <div
                            onClick={() => toggleGroup(group.title)}
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors relative select-none"
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div className="w-11 h-16 rounded-xl overflow-hidden shrink-0 shadow-md bg-white/5 border border-white/10 relative">
                                {group.items[0]?.coverUrl ? (
                                  <img
                                    src={group.items[0].coverUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-cyan-400">
                                    <Film size={18} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-black text-white text-xs sm:text-sm line-clamp-1 break-words leading-snug">
                                    {group.title}
                                  </h4>
                                  <span className="text-[8px] font-black uppercase tracking-widest py-0.5 px-2 rounded border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-md">
                                    Series Stack
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-[var(--rf-text-dim)] font-semibold">
                                  <span>
                                    {group.items.length} container files
                                  </span>
                                  <span className="shrink-0 flex items-center gap-1 text-[10px]">
                                    <Clock size={10} /> Updated{" "}
                                    {getRelativeTime(group.timestamp)}
                                  </span>
                                </div>
                                {hasActive && (
                                  <div className="flex items-center gap-2 mt-2.5 w-full max-w-xs">
                                    <span className="text-[9px] font-black text-cyan-400 shrink-0">
                                      Saving offline ({avgProgress}%)
                                    </span>
                                    <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/[0.04] relative shrink-0">
                                      <div
                                        style={{ width: `${avgProgress}%` }}
                                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div
                              className="flex items-center gap-2 shrink-0 ml-3 relative z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setActiveMenuId(
                                      activeMenuId === group.title
                                        ? null
                                        : group.title,
                                    )
                                  }
                                  className="p-2.5 rounded-2xl text-[var(--rf-text-dim)] hover:text-white hover:bg-white/5 transition-all cursor-pointer dropdown-trigger"
                                  title="Actions"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                <AnimatePresence>
                                  {activeMenuId === group.title && (
                                    <motion.div
                                      initial={{
                                        opacity: 0,
                                        scale: 0.95,
                                        y: -5,
                                      }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute right-0 mt-2 w-48 rounded-2xl bg-[#0e0e12]/95 border border-white/[0.08] backdrop-blur-2xl py-2 shadow-[0_10px_35px_rgba(0,0,0,0.8)] z-[100] dropdown-menu"
                                    >
                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleSaveAllToPhone(group.items);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-cyan-500/10 hover:text-cyan-400 font-bold transition-colors flex items-center gap-2 cursor-pointer"
                                      >
                                        <DownloadIcon size={13} />{" "}
                                        {saveAllLabel}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          handleDeleteMultiple(
                                            group.items.map((i) => i.id),
                                          );
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold transition-colors border-t border-white/[0.04] flex items-center gap-2 cursor-pointer"
                                      >
                                        <Trash2 size={13} /> Delete All Stacked
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <button
                                onClick={() => toggleGroup(group.title)}
                                className="p-2.5 rounded-2xl text-white/40 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-white/[0.04] bg-white/[0.005] divide-y divide-white/[0.03] rounded-b-3xl overflow-hidden">
                              {group.items.map((item) => (
                                <OfflineRowItem
                                  key={item.id}
                                  item={item}
                                  cancelDownload={cancelDownload}
                                  removeFromHistory={removeFromHistory}
                                  handlePlayOffline={handlePlayOffline}
                                  handleSaveToPhone={handleSaveToPhone}
                                  activeMenuId={activeMenuId}
                                  setActiveMenuId={setActiveMenuId}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const item = group.items[0];
                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-white/[0.05] bg-[#121216]/95 hover:border-cyan-500/25 transition-all shadow-xl backdrop-blur-3xl relative z-10"
                      >
                        <OfflineRowItem
                          item={item}
                          cancelDownload={cancelDownload}
                          removeFromHistory={removeFromHistory}
                          handlePlayOffline={handlePlayOffline}
                          handleSaveToPhone={handleSaveToPhone}
                          activeMenuId={activeMenuId}
                          setActiveMenuId={setActiveMenuId}
                        />
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        )}

        {/* CLOUD SECTION */}
        {activeSection === "cloud" && (
          <div className="relative z-10 space-y-4 mb-10">
            {cloudHistory.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl border border-white/[0.04] bg-white/[0.01] p-12 md:p-20 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-3xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-6">
                  <DownloadIcon size={24} className="text-white/20" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  No cloud download records
                </h3>
                <p className="text-xs text-[var(--rf-text-dim)] max-w-xs mx-auto leading-relaxed">
                  Your regular browser-triggered direct downloads will be logged
                  here.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {processedCloudItems.map((group, idx) => {
                  const isExpanded = !!expandedGroups[group.key];
                  const totalBatchCount = group.items
                    ? group.items.reduce((s, i) => s + i.count, 0)
                    : 0;
                  const uniqueBatchCount = group.items ? group.items.length : 0;
                  const allIdsInGroup = group.isBatch
                    ? group.items
                      ? group.items.flatMap((i) => i.allIds)
                      : []
                    : group.allIds || [group.id!];
                  return (
                    <motion.div
                      key={group.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min(idx * 0.03, 0.2),
                      }}
                      className="rounded-3xl border border-white/[0.04] bg-white/[0.01] hover:border-white/[0.08] transition-all shadow-lg backdrop-blur-xl"
                    >
                      {!group.isBatch ? (
                        <div className="flex items-center justify-between p-5 relative select-none">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div
                              className={cn(
                                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner relative",
                                group.type === "movie"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                              )}
                            >
                              {group.type === "movie" ? (
                                <Film size={18} />
                              ) : (
                                <FileText size={18} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h4 className="font-bold text-white text-sm truncate leading-snug">
                                  {group.count && group.count > 1 && (
                                    <span className="text-red-400 font-black mr-1.5">
                                      {group.count}x
                                    </span>
                                  )}
                                  {group.title}
                                </h4>
                                {group.quality && (
                                  <span className="badge badge-quality text-[8px] py-0 px-1.5 font-black border border-red-500/20 shadow-md">
                                    {group.quality}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-[var(--rf-text-dim)] font-semibold">
                                <span className="truncate max-w-[280px]">
                                  {group.filename}
                                </span>
                                <span className="shrink-0 flex items-center gap-1 text-[10px]">
                                  <Clock size={10} />
                                  {getRelativeTime(group.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <button
                              onClick={() =>
                                handleDownloadAgain({
                                  url: group.url,
                                  title: group.title,
                                  filename: group.filename || "",
                                  id: group.id!,
                                })
                              }
                              disabled={downloadingIds[group.id!]}
                              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer"
                            >
                              <div className="relative flex items-center justify-center shrink-0">
                                <RotateCw size={13} className="text-red-400" />
                                <ArrowDown
                                  size={7}
                                  className="absolute text-red-400"
                                />
                              </div>
                              <span className="hidden sm:inline">
                                Redownload
                              </span>
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteMultiple(allIdsInGroup)
                              }
                              className="p-2.5 rounded-2xl text-[var(--rf-text-dim)] hover:text-red-400 hover:bg-red-400/5 transition-all active:scale-90 cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div
                            onClick={() => toggleGroup(group.key)}
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-all relative select-none"
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <div
                                className={cn(
                                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner relative",
                                  group.type === "movie"
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                )}
                              >
                                {group.type === "movie" ? (
                                  <Film size={18} />
                                ) : (
                                  <FileText size={18} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-bold text-white text-sm truncate leading-snug">
                                    {group.title}
                                  </h4>
                                  <span className="text-[8px] font-black uppercase tracking-widest py-0.5 px-2 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-md">
                                    Series
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-[var(--rf-text-dim)] font-semibold">
                                  <span>
                                    {uniqueBatchCount}{" "}
                                    {group.type === "movie"
                                      ? "episodes"
                                      : "subtitles"}
                                    {totalBatchCount > uniqueBatchCount &&
                                      ` (${totalBatchCount} total)`}
                                  </span>
                                  <span className="shrink-0 flex items-center gap-1 text-[10px]">
                                    <Clock size={10} />
                                    {getRelativeTime(group.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div
                              className="flex items-center gap-2 shrink-0 ml-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  handleDeleteMultiple(allIdsInGroup)
                                }
                                className="p-2.5 rounded-2xl text-[var(--rf-text-dim)] hover:text-red-400 hover:bg-red-400/5 transition-all active:scale-90 cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                onClick={() => handleBatchDownload(group)}
                                disabled={batchDownloading[group.key]}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer"
                              >
                                {batchDownloading[group.key] ? (
                                  <Loader2
                                    size={13}
                                    className="animate-spin text-red-400"
                                  />
                                ) : (
                                  <div className="relative flex items-center justify-center shrink-0">
                                    <RotateCw
                                      size={13}
                                      className="text-red-400"
                                    />
                                    <ArrowDown
                                      size={7}
                                      className="absolute text-red-400"
                                    />
                                  </div>
                                )}
                                <span className="hidden sm:inline">
                                  Download All
                                </span>
                              </button>
                              <button
                                onClick={() => toggleGroup(group.key)}
                                className="p-2.5 rounded-2xl text-white/40 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronUp size={16} />
                                ) : (
                                  <ChevronDown size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-white/[0.04] bg-white/[0.005] divide-y divide-white/[0.03]">
                              {group.items?.map((subItem) => (
                                <div
                                  key={subItem.id}
                                  className="flex items-center justify-between py-3.5 px-6 hover:bg-white/[0.02] transition-colors"
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="text-xs font-bold text-white/80 truncate block">
                                          {subItem.count > 1 && (
                                            <span className="text-red-400 font-black mr-1.5">
                                              {subItem.count}x
                                            </span>
                                          )}
                                          {subItem.filename}
                                        </span>
                                        {subItem.quality && (
                                          <span className="badge badge-quality text-[8px] py-0 px-1 font-black">
                                            {subItem.quality}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-[var(--rf-text-dim)] font-semibold flex items-center gap-1">
                                        <Clock size={8} />
                                        {getRelativeTime(subItem.timestamp)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-3">
                                    <button
                                      onClick={() =>
                                        handleDownloadAgain({
                                          url: subItem.url,
                                          title: group.title,
                                          filename: subItem.filename,
                                          id: subItem.id,
                                        })
                                      }
                                      disabled={!!downloadingIds[subItem.id]}
                                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-[10px] font-bold text-white transition-all active:scale-95 shrink-0 cursor-pointer"
                                    >
                                      <div className="relative flex items-center justify-center shrink-0">
                                        <RotateCw
                                          size={11}
                                          className="text-red-400"
                                        />
                                        <ArrowDown
                                          size={6}
                                          className="absolute text-red-400"
                                        />
                                      </div>
                                      <span className="hidden xs:inline ml-1">
                                        Redownload
                                      </span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteMultiple(subItem.allIds)
                                      }
                                      className="p-2 rounded-xl text-[var(--rf-text-dim)] hover:text-red-400 hover:bg-red-400/5 transition-all active:scale-90 cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Info panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 rounded-3xl p-6 md:p-8 border border-white/[0.04] bg-white/[0.01] shadow-2xl backdrop-blur-3xl mt-12"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          <h3 className="text-sm md:text-base font-black uppercase tracking-widest text-white/90 mb-6 flex items-center gap-2 pb-3 border-b border-white/[0.04]">
            <Sparkles size={16} className="text-cyan-400 animate-pulse" /> Speed
            & Storage Operations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                ⚡ Offline Storage Limits
              </h4>
              <ul className="space-y-3 text-[11px] text-[var(--rf-text-dim)] font-semibold">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✔</span>
                  <span>
                    <strong className="text-white/80">
                      30 Days Storage Lifetime:
                    </strong>{" "}
                    Every offline file auto-expires after 30 days to save device
                    space.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">✔</span>
                  <span>
                    <strong className="text-white/80">
                      Instant playability:
                    </strong>{" "}
                    Plays without internet buffering once the blob is fully
                    saved.
                  </span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
                🎬 Transfer & Playback Setup
              </h4>
              <ul className="space-y-3 text-[11px] text-[var(--rf-text-dim)] font-semibold">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 shrink-0">✔</span>
                  <span>
                    <strong className="text-white/80">
                      Save to Phone Storage:
                    </strong>{" "}
                    Use the three-dot menu to export files to your device's
                    native storage.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5 shrink-0">✔</span>
                  <span>
                    <strong className="text-white/80">
                      VLC Audio/Subs Support:
                    </strong>{" "}
                    Use VLC player for perfect audio-channel shifting and SRT
                    subtitle sync.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ── OfflineRowItem ──────────────────────────────────────────────────────── */
interface OfflineRowItemProps {
  item: DownloadHistoryItem;
  cancelDownload: (id: string) => void;
  removeFromHistory: (id: string) => void;
  handlePlayOffline: (item: DownloadHistoryItem) => void;
  handleSaveToPhone: (item: DownloadHistoryItem) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
}

function OfflineRowItem({
  item,
  cancelDownload,
  removeFromHistory,
  handlePlayOffline,
  handleSaveToPhone,
  activeMenuId,
  setActiveMenuId,
}: OfflineRowItemProps) {
  // Simulated UI progress from useDownloadStore
  const storeProgress = item.offlineProgress || 0;

  // Real blob fetch progress from saveVideoOffline (keyed by offlineSourceId)
  const blobProgress = saveVideoOffline(
    (s) => s.savingProgress[item.offlineSourceId || ""] || 0,
  );

  // Show the higher of the two — blob fetch is the real progress,
  // store simulation catches up visually while blob is still fetching
  const progress = Math.max(storeProgress, blobProgress);

  // Only truly complete when BOTH the store says done AND blob is saved (blobProgress === 0 means finished/not started)
  const blobDone = blobProgress === 0 || blobProgress >= 100;
  const isComplete = !!item.offlineComplete && blobDone;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 relative select-none pr-12 sm:pr-5">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="relative w-11 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-md group flex items-center justify-center">
          {item.coverUrl ? (
            <img
              src={item.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center",
                item.type === "subtitle"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-cyan-400/10 text-cyan-400",
              )}
            >
              {item.type === "subtitle" ? (
                <FileText size={18} />
              ) : (
                <Film size={18} />
              )}
            </div>
          )}
          <button
            onClick={() => isComplete && handlePlayOffline(item)}
            disabled={!isComplete || item.type === "subtitle"}
            className={cn(
              "absolute inset-0 flex items-center justify-center transition-all duration-300",
              isComplete
                ? item.type === "subtitle"
                  ? "bg-black/20 text-blue-400"
                  : "bg-black/40 hover:bg-emerald-500/20 text-white cursor-pointer"
                : "bg-black/60 text-cyan-400",
            )}
          >
            {isComplete ? (
              item.type === "subtitle" ? (
                <FileText size={16} />
              ) : (
                <Play size={16} className="fill-white text-white drop-shadow" />
              )
            ) : (
              <Loader2 size={16} className="animate-spin text-cyan-400" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4
              onClick={() => isComplete && handlePlayOffline(item)}
              className={cn(
                "font-black text-xs sm:text-sm line-clamp-2 break-words leading-snug",
                isComplete
                  ? "text-white hover:text-emerald-400 cursor-pointer transition-colors"
                  : "text-white/60",
              )}
            >
              {item.filename || item.title}
            </h4>
            {item.quality && (
              <span className="badge badge-quality text-[8px] py-0 px-1.5 font-black border border-cyan-500/20 text-cyan-300 bg-cyan-400/10 shadow-md">
                {item.quality}
              </span>
            )}
            {isComplete ? (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                Saved Offline
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded">
                Saving ({progress}%)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-[11px] text-[var(--rf-text-dim)] font-semibold mt-1">
            <span className="shrink-0 flex items-center gap-1 text-[9px] sm:text-[10px]">
              <Clock size={10} /> {getRelativeTime(item.timestamp)}
            </span>
            {item.expiresAt && (
              <span className="text-[9px] sm:text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">
                {Math.max(
                  0,
                  Math.ceil(
                    (item.expiresAt - Date.now()) / (24 * 60 * 60 * 1000),
                  ),
                )}{" "}
                days left
              </span>
            )}
          </div>

          {/* Progress bar — shown while saving */}
          {!isComplete && (
            <div className="mt-2 w-full max-w-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black text-cyan-400">
                  {blobProgress > 0
                    ? `Downloading blob (${blobProgress}%)`
                    : `Preparing (${storeProgress}%)`}
                </span>
                <span className="text-[9px] text-white/30 font-mono">
                  {progress}%
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/[0.04]">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                />
              </div>
              {item.downloadSpeed && item.downloadSpeed !== "0.0 MB/s" && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] font-black text-cyan-400 tabular-nums">
                    {item.downloadSpeed}
                  </span>
                  <span className="text-[9px] font-semibold text-white/30">
                    {item.downloadedSize} / {item.totalSize}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cancel button while saving */}
      {!isComplete && (
        <div className="flex items-center justify-end shrink-0">
          <button
            onClick={() => cancelDownload(item.id)}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-400 transition-all shrink-0 cursor-pointer"
            title="Cancel Download"
          >
            <Ban size={13} />
          </button>
        </div>
      )}

      {/* Three-dot menu for completed items */}
      {isComplete && (
        <div className="absolute top-4 right-4 z-50">
          <div className="relative">
            <button
              onClick={() =>
                setActiveMenuId(activeMenuId === item.id ? null : item.id)
              }
              className="p-1.5 rounded-xl text-[var(--rf-text-dim)] hover:text-white hover:bg-white/5 transition-all cursor-pointer dropdown-trigger"
            >
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {activeMenuId === item.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-44 rounded-2xl bg-[#0e0e12]/95 border border-white/[0.08] backdrop-blur-2xl py-2 shadow-[0_10px_35px_rgba(0,0,0,0.8)] z-[100] dropdown-menu"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      handleSaveToPhone(item);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-cyan-500/10 hover:text-cyan-400 font-bold transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <DownloadIcon size={13} /> {saveLabel}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      removeFromHistory(item.id);
                      toast.success("Deleted offline file successfully");
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold transition-colors border-t border-white/[0.04] flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete Offline
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
