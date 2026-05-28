import { useState, useEffect, useRef } from "react";
import { Play, Loader2, X, ExternalLink } from "lucide-react";
import { useYouTubeTrailer } from "../hooks/useYouTubeTrailer";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  title: string;
  year?: string | number;
}

export default function TrailerButtonAndModal({ title, year }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const trailerSectionRef = useRef<HTMLDivElement>(null);
  const { videoId, isLoading, isUnavailable, getTrailer } = useYouTubeTrailer(
    title,
    year,
  );

  const handleWatchClick = async () => {
    // If already open, just scroll back to it
    if (isOpen && videoId) {
      trailerSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    const id = videoId || (await getTrailer());

    if (id) {
      // Open the inline section, then scroll to it
      setIsOpen(true);
    } else {
      // Fallback: no trailer found — open YouTube search in a new tab
      const queryStr = `${title} ${year || ""} official trailer`;
      window.open(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(queryStr)}`,
        "_blank",
      );
    }
  };

  // Once the section opens, scroll to it
  useEffect(() => {
    if (isOpen && trailerSectionRef.current) {
      // Small delay so the element has rendered and AnimatePresence mounted it
      const timer = setTimeout(() => {
        trailerSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleOpenYouTube = () => {
    if (videoId) {
      // Opens the exact video on YouTube
      window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
    } else {
      // Fallback to search
      const queryStr = `${title} ${year || ""} official trailer`;
      window.open(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(queryStr)}`,
        "_blank",
      );
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (isUnavailable) return null;

  return (
    <div className="flex flex-col w-full">
      {/* ── Watch Trailer Button ── */}
      <button
        onClick={handleWatchClick}
        disabled={isLoading}
        className="btn-glass text-sm px-7 py-3.5 flex items-center gap-2 select-none active:scale-95 transition-all cursor-pointer self-start"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin text-white" />
        ) : (
          <Play size={18} className="text-white fill-white" />
        )}
        <span>{isLoading ? "Fetching..." : "Watch Trailer"}</span>
      </button>

      {/* ── Inline Trailer Section (renders below button) ── */}
      <AnimatePresence>
        {isOpen && videoId && (
          <motion.div
            ref={trailerSectionRef}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: "1.5rem" }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden w-full"
          >
            <div className="flex flex-col gap-3 w-full">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider truncate max-w-[80%]">
                  {title} — Official Trailer
                </h3>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white/80 transition-colors cursor-pointer"
                  aria-label="Close trailer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 
                Clickable thumbnail that opens YouTube.
                We use the YouTube thumbnail as a preview image — clicking it
                opens the real video on youtube.com in a new tab.
              */}
              <button
                onClick={handleOpenYouTube}
                className="group relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                aria-label={`Watch ${title} trailer on YouTube`}
              >
                {/* YouTube max-res thumbnail */}
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  alt={`${title} trailer thumbnail`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    // Fall back to hqdefault if maxresdefault doesn't exist
                    (e.currentTarget as HTMLImageElement).src =
                      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }}
                />

                {/* Dark overlay on hover */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Play button */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                    <Play size={28} className="text-white fill-white ml-1" />
                  </div>
                  <span className="flex items-center gap-1.5 text-white/90 text-xs font-semibold tracking-wide uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <ExternalLink size={12} />
                    Watch on YouTube
                  </span>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
