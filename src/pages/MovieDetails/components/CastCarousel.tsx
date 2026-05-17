import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Star } from '../types';
import { Users } from 'lucide-react';
import { motion } from 'motion/react';

interface CastCarouselProps {
  stars: Star[];
}

export const CastCarousel = memo(({ stars }: CastCarouselProps) => {
  if (!stars || stars.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-10 md:mt-14"
    >
      <h3 className="text-xs font-bold text-[var(--rf-text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2 px-1">
        <Users size={13} />
        Cast & Crew
        <span className="text-[10px] font-normal text-[var(--rf-text-dim)] normal-case ml-2 opacity-70">(Click to view details)</span>
      </h3>

      <div
        className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide"
      >
        {stars.slice(0, 15).map((star: Star, idx: number) => (
          <Link
            key={`${star.staffId}-${idx}`}
            to={`/actor/${encodeURIComponent(star.name)}`}
            state={{ avatarUrl: star.avatarUrl }}
            className="shrink-0 w-[80px] md:w-[90px]"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(0.35 + idx * 0.04, 0.8) }}
              className="w-full flex flex-col items-center gap-2 group cursor-pointer"
            >
              {/* Avatar */}
              <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden glass-2 ring-2 ring-transparent group-hover:ring-[var(--rf-red)]/50 transition-all duration-300">
                {star.avatarUrl ? (
                  <img
                    src={star.avatarUrl}
                    alt={star.name}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(star.name)}&background=1a1a2e&color=e8e8ed&size=64&font-size=0.35&bold=true`;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--rf-text-dim)] text-sm font-bold bg-[var(--rf-surface-2)]">
                    {star.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
                  <span className="text-[9px] md:text-[10px] font-bold text-white text-center leading-tight tracking-wide">View<br/>Profile</span>
                </div>
              </div>

              {/* Name */}
              <div className="text-center w-full">
                <p className="text-[10px] md:text-[11px] text-[var(--rf-text)] font-medium truncate group-hover:text-[var(--rf-red)] transition-colors" title={star.name}>
                  {star.name}
                </p>
                {star.character && (
                  <p className="text-[9px] text-[var(--rf-text-dim)] truncate" title={star.character}>
                    {star.character}
                  </p>
                )}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
});

CastCarousel.displayName = 'CastCarousel';
