import { memo, useState } from "react";
import {
  Download,
  Loader2,
  HardDrive,
  Star,
  Globe,
  Smartphone,
  X,
  Clock,
} from "lucide-react";
import { SourceItem } from "../types";
import { useDownloadStore } from "../hooks/useDownloadStore";
import { saveVideoOffline } from "../../../utils/saveOffline";
import { formatFileSize } from "../../../utils/format";

interface SourceCardProps {
  src: SourceItem;
  downloadId: string;
  title: string;
  episodeLabel?: string;
  onDownload: (src: SourceItem, id: string) => void;
}

const PREF_KEY = "rf-preferred-quality";

function getPreferredQuality(): string | null {
  try {
    return localStorage.getItem(PREF_KEY);
  } catch {
    return null;
  }
}
function setPreferredQuality(quality: string): void {
  try {
    localStorage.setItem(PREF_KEY, quality);
  } catch {
    /* ignore */
  }
}
function daysUntilExpiry(expiresAt: number): number {
  return Math.max(
    0,
    Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
  );
}

export const SourceCard = memo(
  ({ src, downloadId, title, episodeLabel, onDownload }: SourceCardProps) => {
    const [showChoice, setShowChoice] = useState(false);

    const phoneProgress = useDownloadStore(
      (s) => s.activeDownloads[downloadId] || 0,
    );
    const isDownloadingPhone = phoneProgress > 0;

    const savingProgress = saveVideoOffline(
      (s) => s.savingProgress[downloadId] || 0,
    );
    const isSavingWeb = savingProgress > 0;
    const offlineItems = saveVideoOffline((s) => s.items);
    const saveToWeb = saveVideoOffline((s) => s.saveToWeb);
    const isExpired = saveVideoOffline((s) => s.isExpired);

    const savedItem = offlineItems.find((i) => i.id === downloadId);
    const isSavedWeb = !!savedItem && !isExpired(savedItem);

    const quality = src.quality || "HD";
    const preferredQuality = getPreferredQuality();
    const isPreferred =
      preferredQuality &&
      quality.toLowerCase() === preferredQuality.toLowerCase();
    const isActive = isDownloadingPhone || isSavingWeb;

    const handleCardClick = () => {
      if (isActive || isSavedWeb) return;
      setPreferredQuality(quality);
      setShowChoice(true);
    };

    const handleSaveToPhone = () => {
      setShowChoice(false);
      onDownload(src, downloadId);
    };

    const handleSaveToWeb = async () => {
      setShowChoice(false);
      const url = src.download_url || src.stream_url;
      if (!url) return;
      try {
        await saveToWeb(
          downloadId,
          title,
          url,
          quality,
          src.format,
          episodeLabel,
        );
      } catch {
        // error already logged in store
      }
    };

    return (
      <div className="relative">
        {/* Choice Popover */}
        {showChoice && (
          <div className="absolute inset-x-0 bottom-full mb-2 z-50 glass-2 border border-[var(--rf-border)] rounded-2xl p-3 shadow-2xl shadow-black/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
                Save {quality} to
              </p>
              <button
                onClick={() => setShowChoice(false)}
                className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 text-white/40 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Save to Phone */}
              <button
                onClick={handleSaveToPhone}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--rf-border)] transition-all group active:scale-95"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--rf-surface)] border border-[var(--rf-border)] flex items-center justify-center group-hover:border-white/20 transition-colors">
                  <Smartphone size={16} className="text-white/70" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white">Phone</p>
                  <p className="text-[10px] text-[var(--rf-text-dim)] leading-tight">
                    Save to device
                  </p>
                </div>
              </button>

              {/* Save to Web */}
              <button
                onClick={handleSaveToWeb}
                className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--rf-red)]/[0.06] hover:bg-[var(--rf-red)]/[0.12] border border-[var(--rf-red)]/20 transition-all group active:scale-95"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--rf-red)]/10 border border-[var(--rf-red)]/20 flex items-center justify-center group-hover:border-[var(--rf-red)]/40 transition-colors">
                  <Globe size={16} className="text-[var(--rf-red)]" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white">Web</p>
                  <p className="text-[10px] text-[var(--rf-text-dim)] leading-tight">
                    Watch offline
                  </p>
                </div>
              </button>
            </div>

            {/* 30-day notice */}
            <p className="text-[10px] text-[var(--rf-text-dim)] text-center mt-2.5 flex items-center justify-center gap-1">
              <Clock size={9} />
              Web saves expire after 30 days
            </p>
          </div>
        )}

        {/* Main Card */}
        <button
          onClick={handleCardClick}
          disabled={isActive}
          aria-label={`Download ${title} ${episodeLabel || ""} ${quality} Quality`}
          className={`w-full text-left flex items-center justify-between p-4 glass-2 hover:bg-white/[0.06] rounded-xl transition-all group relative overflow-hidden active:scale-[0.99] ${
            isPreferred
              ? "ring-1 ring-[var(--rf-red)]/30 bg-[var(--rf-red)]/[0.03]"
              : ""
          } ${isSavedWeb ? "ring-1 ring-emerald-500/30 bg-emerald-500/[0.03]" : ""} ${isActive ? "cursor-wait" : ""}`}
        >
          {/* Progress bar — phone download */}
          {isDownloadingPhone && (
            <div
              className="absolute inset-0 bg-[var(--rf-red)]/8 pointer-events-none transition-all duration-300"
              style={{ width: `${phoneProgress}%` }}
            />
          )}

          {/* Progress bar — web save */}
          {isSavingWeb && (
            <div
              className="absolute inset-0 bg-emerald-500/10 pointer-events-none transition-all duration-300"
              style={{ width: `${savingProgress}%` }}
            />
          )}

          <div className="flex items-center gap-3.5 relative z-10">
            {/* Quality Badge */}
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-black border text-sm ${
                isSavedWeb
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : isPreferred
                    ? "bg-[var(--rf-red)]/10 text-[var(--rf-red)] border-[var(--rf-red)]/20"
                    : "bg-[var(--rf-surface)] text-[var(--rf-red)] border-[var(--rf-border)]"
              }`}
            >
              {quality.replace("p", "") || "HD"}
            </div>

            {/* Info */}
            <div>
              <div className="font-semibold text-white text-sm group-hover:text-[var(--rf-red)] transition-colors flex items-center gap-2 flex-wrap">
                {quality} Quality
                {isPreferred && !isSavedWeb && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--rf-gold)] uppercase tracking-wider">
                    <Star size={8} className="fill-current" /> Preferred
                  </span>
                )}
                {isSavedWeb && savedItem && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                    <Globe size={8} /> Saved ·{" "}
                    {daysUntilExpiry(savedItem.expiresAt)}d left
                  </span>
                )}
                {isDownloadingPhone && (
                  <span className="text-xs text-[var(--rf-red)] font-bold">
                    {phoneProgress}%
                  </span>
                )}
                {isSavingWeb && (
                  <span className="text-xs text-emerald-400 font-bold">
                    {savingProgress}%
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--rf-text-dim)] flex items-center gap-2 mt-0.5">
                {src.format && (
                  <span className="uppercase font-medium">{src.format}</span>
                )}
                {src.size && (
                  <span className="flex items-center gap-1">
                    <HardDrive size={9} />
                    {formatFileSize(src.size)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Icon */}
          <div
            className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              isSavedWeb
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-[var(--rf-red)]/10 text-[var(--rf-red)] group-hover:bg-[var(--rf-red)] group-hover:text-white"
            }`}
          >
            {isDownloadingPhone || isSavingWeb ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isSavedWeb ? (
              <Globe size={16} />
            ) : (
              <Download size={16} />
            )}
          </div>
        </button>
      </div>
    );
  },
);

SourceCard.displayName = "SourceCard";
