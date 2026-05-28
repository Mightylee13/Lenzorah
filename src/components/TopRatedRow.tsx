import { useMemo } from "react";
import { Star } from "lucide-react";
import { MovieRow } from "./MovieRow";
import { MovieCard } from "./MovieCard";

interface TopRatedRowProps {
  movies: any[];
  onViewAll?: () => void;
}

export const TopRatedRow = ({ movies, onViewAll }: TopRatedRowProps) => {
  const top10 = useMemo(
    () =>
      [...movies]
        .filter((m) => Number(m.imdbRatingValue ?? 0) > 0)
        .sort(
          (a, b) =>
            Number(b.imdbRatingValue ?? 0) - Number(a.imdbRatingValue ?? 0),
        )
        .slice(0, 10),
    [movies],
  );

  return (
    <MovieRow
      title="Top 10 Today"
      subtitle="Highest rated titles on Lenzorah"
      onViewAll={onViewAll}
    >
      {top10.map((movie, index) => (
        <div
          key={movie.subjectId}
          className="relative shrink-0 snap-start pt-4 pl-2"
        >
          {/* Big rank number behind the card — Netflix style */}
          <span
            className="absolute -left-1 -top-1 z-10 text-[64px] font-black leading-none select-none pointer-events-none"
            style={{
              color: "transparent",
              WebkitTextStroke: "2px rgba(255,255,255,0.15)",
              fontFamily: "sans-serif",
            }}
          >
            {index + 1}
          </span>

          {/* Red rank badge */}
          <div className="absolute top-4 left-2 z-20 w-6 h-6 rounded-lg bg-[var(--rf-red)] flex items-center justify-center shadow-lg shadow-red-900/50">
            <span className="text-[10px] font-black text-white leading-none">
              {index + 1}
            </span>
          </div>

          {/* Gold rating pill */}
          <div className="absolute top-6 right-1 z-20 flex items-center gap-0.5 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-[var(--rf-gold)]/20">
            <Star
              size={8}
              className="fill-[var(--rf-gold)] text-[var(--rf-gold)]"
            />
            <span className="text-[9px] font-black text-[var(--rf-gold)]">
              {Number(movie.imdbRatingValue).toFixed(1)}
            </span>
          </div>

          <MovieCard movie={movie} index={index} size="md" />
        </div>
      ))}
    </MovieRow>
  );
};
