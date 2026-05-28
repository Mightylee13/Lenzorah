import { motion, AnimatePresence } from "motion/react";
import { X, Star, Tv, Film, GitCompare } from "lucide-react";
import { formatYear, formatRating } from "../utils/format";
import { buildMoviePath } from "../utils/slug";
import { Link } from "react-router-dom";

interface CompareItem {
  subjectId: string;
  title: string;
  coverUrl?: string;
  cover?: { url: string };
  subjectType: number;
  imdbRatingValue?: string | number;
  releaseDate?: string;
  description?: string;
  genre?: string;
}

interface Props {
  selectedItems: CompareItem[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function CompareDrawer({ selectedItems, onRemove, onClear }: Props) {
  if (selectedItems.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 select-none">
      {/* Drawer Container */}
      <div
        className="max-w-4xl mx-auto rounded-t-3xl border border-white/[0.08] p-5 backdrop-blur-xl shadow-2xl relative"
        style={{
          background: "rgba(10,10,14,0.96)",
          boxShadow: "0 -15px 40px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <GitCompare size={14} className="text-[#4490ff]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Comparison Grid ({selectedItems.length} of 3)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClear}
              className="text-[9px] font-black uppercase tracking-wider text-white/30 hover:text-[#e50914] transition-colors"
            >
              Clear All
            </button>
            <span className="text-white/10">|</span>
            <span className="text-[9px] font-medium text-white/30 italic">
              Add up to 3 titles to compare side-by-side
            </span>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-3 gap-4">
          {selectedItems.map((item) => {
            const isSeries = item.subjectType === 2;
            const year = formatYear(item.releaseDate);
            const cover = item.cover?.url || item.coverUrl;

            return (
              <div
                key={item.subjectId}
                className="relative rounded-xl p-3 bg-white/[0.01] border border-white/[0.04] flex flex-col justify-between"
              >
                {/* Remove Button */}
                <button
                  onClick={() => onRemove(item.subjectId)}
                  className="absolute top-2 right-2 z-20 w-5 h-5 rounded-md bg-black/40 border border-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors"
                >
                  <X size={10} />
                </button>

                {/* Content */}
                <div className="space-y-2.5">
                  <div className="aspect-[14/9] rounded-lg overflow-hidden relative bg-white/[0.02]">
                    <img
                      src={cover}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute bottom-1.5 left-2 z-10 text-[8px] font-bold uppercase text-white/70 flex items-center gap-1">
                      {isSeries ? <Tv size={8} /> : <Film size={8} />}
                      {isSeries ? "TV" : "Movie"}
                    </span>
                  </div>

                  <Link
                    to={buildMoviePath(item.title, item.subjectId)}
                    className="text-xs font-black text-white hover:text-[#4490ff] transition-colors line-clamp-1 block"
                  >
                    {item.title}
                  </Link>

                  {/* Comparisons Row */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.03]">
                      <span className="text-[8px] text-white/30 block uppercase font-bold">
                        Rating
                      </span>
                      <span className="font-black text-white flex items-center gap-1 mt-0.5">
                        <Star
                          size={8}
                          className="fill-[var(--rf-gold)] text-[var(--rf-gold)]"
                        />
                        {item.imdbRatingValue
                          ? formatRating(item.imdbRatingValue)
                          : "N/A"}
                      </span>
                    </div>
                    <div className="bg-white/[0.02] p-1.5 rounded-lg border border-white/[0.03]">
                      <span className="text-[8px] text-white/30 block uppercase font-bold">
                        Release
                      </span>
                      <span className="font-black text-white block mt-0.5">
                        {year || "N/A"}
                      </span>
                    </div>
                  </div>

                  {item.genre && (
                    <p className="text-[9px] text-white/40 leading-normal line-clamp-1">
                      {item.genre.split(",").slice(0, 2).join(" · ")}
                    </p>
                  )}

                  {item.description && (
                    <p className="text-[9px] text-white/30 leading-relaxed line-clamp-2 italic">
                      "{item.description}"
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Placeholder Slots */}
          {Array.from({ length: 3 - selectedItems.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="rounded-xl border border-dashed border-white/[0.05] flex flex-col items-center justify-center p-6 text-center min-h-[160px]"
            >
              <div className="w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 mb-2">
                <GitCompare size={12} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/20">
                Slot Empty
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
