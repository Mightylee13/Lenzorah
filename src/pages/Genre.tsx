import { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchHomepage } from '../api/client';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Film, Tv, Clapperboard, SlidersHorizontal, Star, Calendar } from 'lucide-react';
import { MovieCardGrid } from '../components/MovieCard';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import { cn } from '../utils/cn';

/* Genre metadata for rich visuals */
const GENRE_META: Record<string, { emoji: string; gradient: string; description: string }> = {
  action:      { emoji: '💥', gradient: 'from-orange-600/30 to-red-900/30',    description: 'Explosive action and thrilling stunts' },
  comedy:      { emoji: '😂', gradient: 'from-yellow-500/30 to-amber-700/30',  description: 'Laugh-out-loud movies and shows' },
  drama:       { emoji: '🎭', gradient: 'from-indigo-600/30 to-purple-900/30', description: 'Compelling stories and powerful performances' },
  horror:      { emoji: '👻', gradient: 'from-gray-800/50 to-red-950/30',      description: 'Terrifying horror and supernatural thrills' },
  thriller:    { emoji: '🔪', gradient: 'from-slate-700/30 to-red-800/30',     description: 'Edge-of-your-seat suspense' },
  romance:     { emoji: '💕', gradient: 'from-pink-500/30 to-rose-800/30',     description: 'Love stories and romantic adventures' },
  'sci-fi':    { emoji: '🚀', gradient: 'from-cyan-600/30 to-blue-900/30',     description: 'Futuristic worlds and space exploration' },
  adventure:   { emoji: '🗺️', gradient: 'from-emerald-600/30 to-teal-800/30',  description: 'Epic journeys and daring quests' },
  animation:   { emoji: '✨', gradient: 'from-violet-500/30 to-fuchsia-800/30', description: 'Animated features and stunning visuals' },
  crime:       { emoji: '🕵️', gradient: 'from-zinc-700/30 to-slate-900/30',    description: 'Crime stories and detective mysteries' },
  fantasy:     { emoji: '🧙', gradient: 'from-purple-600/30 to-indigo-900/30', description: 'Magical realms and mythical creatures' },
  documentary: { emoji: '📽️', gradient: 'from-stone-600/30 to-neutral-800/30', description: 'Real stories and factual storytelling' },
  mystery:     { emoji: '🔍', gradient: 'from-amber-700/30 to-stone-800/30',   description: 'Puzzling mysteries and whodunits' },
  war:         { emoji: '⚔️', gradient: 'from-stone-700/30 to-green-900/30',   description: 'War epics and military stories' },
  history:     { emoji: '📜', gradient: 'from-amber-800/30 to-yellow-900/30',  description: 'Historical events and period pieces' },
  music:       { emoji: '🎵', gradient: 'from-fuchsia-600/30 to-pink-900/30',  description: 'Musical films and concert specials' },
  family:      { emoji: '👨‍👩‍👧‍👦', gradient: 'from-sky-500/30 to-blue-700/30',      description: 'Family-friendly entertainment' },
  western:     { emoji: '🤠', gradient: 'from-amber-600/30 to-orange-800/30',  description: 'Wild West adventures and frontier tales' },
  sport:       { emoji: '⚽', gradient: 'from-green-600/30 to-emerald-800/30', description: 'Sports movies and athletic drama' },
};

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
] as const;

const TYPE_FILTERS = [
  { key: 'all', label: 'All', icon: Clapperboard },
  { key: 'movies', label: 'Movies', icon: Film },
  { key: 'series', label: 'Series', icon: Tv },
] as const;

export default function GenrePage() {
  const { name } = useParams<{ name: string }>();
  const genreSlug = (name || '').toLowerCase();
  const genreTitle = genreSlug.charAt(0).toUpperCase() + genreSlug.slice(1);
  const meta = GENRE_META[genreSlug] || { emoji: '🎬', gradient: 'from-[var(--rf-red)]/20 to-transparent', description: `Browse ${genreTitle} movies and shows` };

  useSEO({ title: `${genreTitle} Movies & Shows`, description: meta.description });

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [visibleCount, setVisibleCount] = useState<number>(18);

  // Reset page limit on genre/filter change
  useEffect(() => {
    setVisibleCount(18);
  }, [typeFilter, sortBy, genreSlug]);

  const { data: trending, isLoading: tl } = useQuery({ queryKey: ['trending'], queryFn: fetchTrending, staleTime: 10 * 60 * 1000 });
  const { data: hpData, isLoading: hl } = useQuery<any>({ queryKey: ['homepage'], queryFn: fetchHomepage, staleTime: 10 * 60 * 1000 });

  const allMovies = useMemo(() => {
    const movies: any[] = [];
    const seen = new Set<string>();
    if (hpData?.operatingList) {
      for (const section of hpData.operatingList) {
        if (section.subjects) {
          for (const m of section.subjects) {
            if (m.subjectId && !seen.has(m.subjectId)) { seen.add(m.subjectId); movies.push(m); }
          }
        }
      }
    }
    if (trending) {
      for (const m of trending) {
        if (m.subjectId && !seen.has(m.subjectId)) { seen.add(m.subjectId); movies.push(m); }
      }
    }
    return movies;
  }, [hpData, trending]);

  const genreMovies = useMemo(() => {
    let filtered = allMovies.filter((m: any) => {
      const genres = (m.genre || '').toLowerCase();
      return genres.includes(genreSlug);
    });

    // Type filter
    if (typeFilter === 'movies') filtered = filtered.filter((m) => m.subjectType === 1);
    if (typeFilter === 'series') filtered = filtered.filter((m) => m.subjectType === 2);

    // Sort
    if (sortBy === 'rating') filtered = [...filtered].sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0));
    if (sortBy === 'newest') filtered = [...filtered].sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
    if (sortBy === 'oldest') filtered = [...filtered].sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''));

    return filtered;
  }, [allMovies, genreSlug, typeFilter, sortBy]);

  const isLoading = tl || hl;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
      {/* ============ GENRE HERO ============ */}
      <div className={cn('relative py-12 md:py-16 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 bg-gradient-to-br', meta.gradient)}>
        <div className="absolute inset-0 bg-[var(--rf-black)]/60" />
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <Link to="/explore" className="inline-flex items-center gap-1.5 text-xs text-[var(--rf-text-dim)] hover:text-white mb-4 transition-colors">
            <ChevronLeft size={14} /> Back to Explore
          </Link>
          <div className="flex items-center gap-3 md:gap-4 mb-3">
            <span className="text-4xl md:text-5xl">{meta.emoji}</span>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white">{genreTitle}</h1>
              <p className="text-sm text-[var(--rf-text-dim)] mt-1">{meta.description}</p>
            </div>
          </div>
          <p className="text-sm text-[var(--rf-text-muted)]">{genreMovies.length} titles available</p>
        </div>
      </div>

      {/* ============ FILTERS ============ */}
      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Type pills */}
          <div className="flex items-center gap-1 p-0.5 glass-2 rounded-xl">
            {TYPE_FILTERS.map((tab) => {
              const isActive = typeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setTypeFilter(tab.key)}
                  className={cn(
                    'relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                    isActive ? 'text-white' : 'text-[var(--rf-text-muted)] hover:text-white'
                  )}
                >
                  {isActive && (
                    <motion.div layoutId="genre-type" className="absolute inset-0 bg-[var(--rf-red)] rounded-lg" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <tab.icon size={12} /> {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <SlidersHorizontal size={13} className="text-[var(--rf-text-dim)]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent glass-2 px-3 py-2 rounded-lg text-xs text-[var(--rf-text-muted)] border-none outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key} className="bg-[var(--rf-black)]">{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ============ GRID ============ */}
        {isLoading ? (
          <GridSkeleton count={12} />
        ) : genreMovies.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${typeFilter}-${sortBy}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
            >
              {genreMovies.slice(0, visibleCount).map((movie: any, idx: number) => (
                <MovieCardGrid key={`${movie.subjectId}-${idx}`} movie={movie} index={idx} />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">{meta.emoji}</div>
            <h3 className="text-lg font-bold text-white mb-2">No {genreTitle} titles found</h3>
            <p className="text-sm text-[var(--rf-text-dim)] mb-6">Try a different genre or check back later.</p>
            <Link to="/explore" className="btn-primary px-6 py-3 text-sm inline-flex">
              Browse All
            </Link>
          </div>
        )}

        {/* See More Button */}
        {genreMovies.length > visibleCount && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setVisibleCount((prev) => prev + 18)}
              className="btn-glass px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 hover:bg-white/10 active:scale-95 text-white border border-white/[0.08]"
            >
              See More Titles
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ============ EXPORT: All genres for linking ============ */
export const GENRE_LIST = Object.keys(GENRE_META);
