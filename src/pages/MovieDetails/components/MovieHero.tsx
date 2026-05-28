import { useState, useEffect } from "react";
import {
  Star,
  Download,
  ChevronLeft,
  Clock,
  Globe,
  BarChart3,
  Calendar,
  Tv,
  Heart,
  Share2,
  Play,
  X,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { SubjectInfo, MovieMetadata, Season } from "../types";
import { OptimizedImage } from "../../../components/ui/OptimizedImage";
import {
  formatDuration,
  formatRating,
  formatCount,
  formatYear,
} from "../../../utils/format";
import { useWatchlistStore } from "../../../stores/useWatchlistStore";
import { useYouTubeTrailer } from "../../../hooks/useYouTubeTrailer";
import toast from "react-hot-toast";
import UnifiedShareModal from "../../../components/UnifiedShareModal";

interface MovieHeroProps {
  subject: SubjectInfo;
  metadata?: MovieMetadata;
  coverUrl?: string;
  isTvSeries: boolean;
  seasons?: Season[];
  onOpenDownload: () => void;
  onOpenPlay: () => void;
  playLabel?: string;
}

export const MovieHero = ({
  subject,
  metadata,
  coverUrl,
  isTvSeries,
  seasons = [],
  onOpenDownload,
  onOpenPlay,
  playLabel = "Watch Now",
}: MovieHeroProps) => {
  const navigate = useNavigate();
  const genres =
    subject.genre
      ?.split(",")
      .map((g: string) => g.trim())
      .filter(Boolean) || [];
  const year = formatYear(subject.releaseDate);
  const duration = formatDuration(subject.duration);

  const addItem = useWatchlistStore((s) => s.addItem);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const isInWatchlist = useWatchlistStore((s) =>
    s.isInWatchlist(subject.subjectId || ""),
  );

  const toggleWatchlist = () => {
    const id = subject.subjectId || "";
    if (isInWatchlist) {
      removeItem(id);
      toast("Removed from Watchlist", { icon: "💔" });
    } else {
      addItem({
        subjectId: id,
        title: subject.title,
        coverUrl: coverUrl,
        subjectType: subject.subjectType,
        imdbRatingValue: subject.imdbRatingValue,
        releaseDate: subject.releaseDate,
      });
      toast.success("Added to Watchlist");
    }
  };

  return (
    <>
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-2 text-[var(--rf-text-muted)] hover:text-white transition-colors mb-8 cursor-pointer group"
        aria-label="Go Back"
      >
        <ChevronLeft
          size={18}
          className="group-hover:-translate-x-0.5 transition-transform"
        />
        <span className="text-sm font-medium">Back</span>
      </motion.button>

      {/* ============ MAIN LAYOUT ============ */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-12">
        {/* Poster */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="shrink-0 mx-auto md:mx-0 w-[200px] md:w-[280px]"
        >
          <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/60 relative group">
            <OptimizedImage
              src={coverUrl}
              alt={subject.title}
              className="w-full h-full"
              priority
            />

            {/* Watchlist Floating Overlay */}
            <button
              onClick={toggleWatchlist}
              className={`absolute top-4 right-4 z-10 w-9 h-9 rounded-xl glass-3 flex items-center justify-center transition-all duration-300 ${
                isInWatchlist
                  ? "text-[var(--rf-red)] bg-black/60 border border-[var(--rf-red)]/40 shadow-lg shadow-[var(--rf-red)]/20 scale-105"
                  : "text-white hover:scale-105 bg-black/40 border border-white/10 hover:bg-black/60"
              }`}
              title={
                isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"
              }
            >
              <Heart size={15} fill={isInWatchlist ? "currentColor" : "none"} />
            </button>

            {/* Poster Glow */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[var(--rf-red)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl" />
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 flex flex-col justify-center"
        >
          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="badge glass text-[10px] py-1 px-3">
              {isTvSeries ? "📺 TV Series" : "🎬 Movie"}
            </span>
            {year && (
              <span className="badge badge-quality py-1 px-3 text-[10px]">
                <Calendar size={9} />
                {year}
              </span>
            )}
            {subject.imdbRatingValue > 0 && (
              <span className="badge badge-rating py-1 px-3 text-[10px]">
                <Star size={9} className="fill-[var(--rf-gold)]" />
                {formatRating(subject.imdbRatingValue)}/10
              </span>
            )}
            {duration && (
              <span className="badge badge-type py-1 px-3 text-[10px]">
                <Clock size={9} />
                {duration}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 leading-[1.1] tracking-tight">
            {subject.title}
          </h1>

          {/* Genre Tags */}
          {genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {genres.map((genre: string, i: number) => (
                <span
                  key={`${genre}-${i}`}
                  className="px-3 py-1 rounded-lg text-[11px] font-medium glass-2 text-[var(--rf-text-muted)] hover:text-white transition-colors cursor-pointer"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--rf-text-dim)] mb-5">
            {subject.countryName && (
              <span className="flex items-center gap-1.5">
                <Globe size={13} />
                {subject.countryName}
              </span>
            )}
            {subject.imdbRatingCount > 0 && (
              <span className="flex items-center gap-1.5">
                <BarChart3 size={13} />
                {formatCount(subject.imdbRatingCount)} ratings
              </span>
            )}
            {isTvSeries && seasons.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Tv size={13} />
                {seasons.filter((s) => s.se > 0).length} Seasons
              </span>
            )}
          </div>

          {/* ============ IMDb RATING CARD ============ */}
          {subject.imdbRatingValue > 0 && (
            <div className="glass-2 rounded-xl p-4 mb-6 max-w-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[var(--rf-gold)]/10 flex items-center justify-center">
                  <span className="text-lg font-black text-[var(--rf-gold)]">
                    {formatRating(subject.imdbRatingValue)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        className={
                          i < Math.round(subject.imdbRatingValue / 2)
                            ? "fill-[var(--rf-gold)] text-[var(--rf-gold)]"
                            : "text-[var(--rf-text-dim)]"
                        }
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--rf-text-dim)]">
                    IMDb • {formatCount(subject.imdbRatingCount)} reviews
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description — Expandable */}
          <ExpandableDescription
            text={
              subject.description ||
              metadata?.description ||
              "No description available for this title."
            }
          />

          {/* ============ CTA BUTTONS ============ */}
          <CTAButtons
            subject={subject}
            coverUrl={coverUrl}
            isTvSeries={isTvSeries}
            onOpenDownload={onOpenDownload}
            onOpenPlay={onOpenPlay}
            playLabel={playLabel}
          />
        </motion.div>
      </div>
    </>
  );
};

/* Separated to keep the main component clean */
function CTAButtons({
  subject,
  coverUrl,
  isTvSeries,
  onOpenDownload,
  onOpenPlay,
  playLabel,
}: {
  subject: SubjectInfo;
  coverUrl?: string;
  isTvSeries: boolean;
  onOpenDownload: () => void;
  onOpenPlay: () => void;
  playLabel: string;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [trailerOpen, setTrailerOpen] = useState(false);

  const year = subject.releaseDate?.substring(0, 4);
  const { videoId, isLoading, isUnavailable, getTrailer } = useYouTubeTrailer(
    subject.title,
    year,
  );

  const handleWatchTrailer = async () => {
    // Only fetch when clicked for the first time [2]
    const id = videoId || (await getTrailer());
    if (id) {
      setTrailerOpen(true);
    }
  };

  // Close modal when pressing Escape [2]
  useEffect(() => {
    if (!trailerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTrailerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trailerOpen]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Play, Download & Trailer buttons grouped next to each other [2] */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onOpenPlay}
          aria-label="Stream Movie Now"
          className="btn-primary text-xs px-5 py-3 md:text-sm md:px-7 md:py-3.5 bg-gradient-to-r from-red-600 to-rose-600 border-none shadow-[0_0_20px_rgba(225,29,72,0.2)] hover:shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <Play size={15} className="fill-current" />
          <span>{playLabel}</span>
        </button>

        <button
          onClick={onOpenDownload}
          aria-label="Open Download Options"
          className="btn-glass text-xs px-5 py-3 md:text-sm md:px-6 md:py-3.5 hover:bg-white/10 font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <Download size={15} />
          <span>Download</span>
        </button>

        {/* Watch Trailer Button (Only rendered if trailer exists) [2] */}
        {!isUnavailable && (
          <button
            onClick={handleWatchTrailer}
            disabled={isLoading}
            className="btn-glass text-xs px-5 py-3 md:text-sm md:px-6 md:py-3.5 hover:bg-white/10 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 select-none transition-all"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : (
              <Play size={15} className="text-white fill-white" />
            )}
            <span>{isLoading ? "Fetching..." : "Trailer"}</span>
          </button>
        )}
      </div>

      {/* Share button (icon only) */}
      <button
        onClick={() => setShareOpen(true)}
        aria-label="Share Options"
        className="w-10 h-10 md:w-12 md:h-12 rounded-xl glass-2 flex items-center justify-center hover:bg-white/[0.08] transition-all duration-200 shrink-0 border border-white/[0.05] cursor-pointer"
        title="Share Content"
      >
        <Share2 size={16} />
      </button>

      <UnifiedShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={subject.title}
        coverUrl={coverUrl}
        rating={subject.imdbRatingValue}
        year={year}
        genre={subject.genre}
        description={subject.description}
        url={window.location.href}
      />

      {/* Centered Trailer Iframe Modal Overlay [2] */}
      <AnimatePresence>
        {trailerOpen && videoId && (
          <div
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 select-none bg-black/85 backdrop-blur-sm"
            onClick={() => setTrailerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl flex flex-col gap-3"
            >
              {/* Header with Title & Close button [2] */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider truncate max-w-[80%]">
                  {subject.title} — Official Trailer
                </h3>
                <button
                  onClick={() => setTrailerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/80 transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 16:9 Aspect Ratio Container [2] */}
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  className="absolute inset-0 w-full h-full border-none"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={`${subject.title} Trailer Video`}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============ EXPANDABLE DESCRIPTION ============ */
function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;

  return (
    <div className="mb-8 max-w-2xl">
      <p
        className={`text-sm md:text-base text-[var(--rf-text-muted)] leading-relaxed transition-all duration-300 ${!expanded && isLong ? "line-clamp-3" : ""}`}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-bold text-[var(--rf-red)] hover:text-[var(--rf-red)]/80 transition-colors flex items-center gap-1"
        >
          {expanded ? "Show Less ↑" : "Read More ↓"}
        </button>
      )}
    </div>
  );
}
