import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchHomepage } from '../api/client';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Flame, Clock, Trophy, Star, Film, Tv } from 'lucide-react';
import { MovieCardGrid } from '../components/MovieCard';
import { GridSkeleton } from '../components/ui/Skeleton';
import { useSEO } from '../hooks/useSEO';
import { cn } from '../utils/cn';
import { formatRating } from '../utils/format';
import { buildMoviePath } from '../utils/slug';
import { Link } from 'react-router-dom';
import { OptimizedImage } from '../components/ui/OptimizedImage';

const TIME_TABS = [
  { key: 'today',    label: 'Today',    icon: Flame,      emoji: '🔥' },
  { key: 'week',     label: 'This Week', icon: Clock,      emoji: '📅' },
  { key: 'alltime',  label: 'All Time',  icon: Trophy,     emoji: '🏆' },
] as const;

/* Deterministic rank-list "shuffle" per tab so each tab feels different */
function applyTabSort(movies: any[], tab: string) {
  const clone = [...movies];
  if (tab === 'today') {
    // Weighted random based on position — top of API list = most trending today
    return clone.slice(0, 30);
  }
  if (tab === 'week') {
    // Top rated subset
    return clone.sort((a, b) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0)).slice(0, 30);
  }
  // All time: sort by year then rating
  return clone
    .sort((a, b) => {
      const rDiff = (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0);
      return rDiff !== 0 ? rDiff : (b.releaseDate || '').localeCompare(a.releaseDate || '');
    })
    .slice(0, 30);
}

export default function Trending() {
  useSEO({
    title: 'Trending',
    description: "See what's trending today, this week, and all time on RUNFlix",
  });

  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'alltime'>('today');
  const [view, setView] = useState<'grid' | 'ranked'>('ranked');

  const { data: trending, isLoading: tl } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 5 * 60 * 1000,
  });

  const { data: hpData, isLoading: hl } = useQuery<any>({
    queryKey: ['homepage'],
    queryFn: fetchHomepage,
    staleTime: 10 * 60 * 1000,
  });

  /* Combine all sources */
  const allMovies = useMemo(() => {
    const movies: any[] = [];
    const seen = new Set<string>();
    const add = (m: any) => {
      if (m?.subjectId && !seen.has(m.subjectId)) { seen.add(m.subjectId); movies.push(m); }
    };
    trending?.forEach(add);
    if (hpData?.operatingList) {
      for (const s of hpData.operatingList) s.subjects?.forEach(add);
    }
    return movies;
  }, [trending, hpData]);

  const tabMovies = useMemo(() => applyTabSort(allMovies, activeTab), [allMovies, activeTab]);

  const isLoading = tl || hl;

  const activeTabMeta = TIME_TABS.find(t => t.key === activeTab)!;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">

      {/* ── HERO ── */}
      <div className="relative py-12 md:py-20 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/25 via-[var(--rf-black)] to-red-900/20" />
        <motion.div
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/8 blur-[130px] rounded-full"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/20">
              <TrendingUp size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl md:text-5xl font-black text-white">Trending</h1>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  LIVE
                </span>
              </div>
              <p className="text-sm text-[var(--rf-text-muted)]">What everyone's watching right now</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Film, label: `${allMovies.filter(m => m.subjectType === 1).length} Movies` },
              { icon: Tv,   label: `${allMovies.filter(m => m.subjectType === 2).length} Series` },
              { icon: Star, label: `${allMovies.filter(m => m.imdbRatingValue >= 7).length} Top Rated` },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="glass-2 px-4 py-2 rounded-xl flex items-center gap-2">
                <Icon size={13} className="text-orange-400" />
                <span className="text-xs font-semibold text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-12">

        {/* ── TAB BAR + VIEW TOGGLE ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Time tabs */}
          <div className="flex items-center gap-1 p-0.5 glass-2 rounded-xl">
            {TIME_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'relative px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5',
                    isActive ? 'text-white' : 'text-[var(--rf-text-muted)] hover:text-white'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="trend-tab"
                      className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span>{tab.emoji}</span>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 p-0.5 glass-2 rounded-xl ml-auto">
            {(['ranked', 'grid'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'relative px-3 py-2 rounded-lg text-xs font-bold transition-all capitalize',
                  view === v ? 'text-white' : 'text-[var(--rf-text-muted)] hover:text-white'
                )}
              >
                {view === v && (
                  <motion.div
                    layoutId="view-toggle"
                    className="absolute inset-0 bg-white/[0.08] rounded-lg border border-white/[0.1]"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{v === 'ranked' ? '🏅 Ranked' : '⊞ Grid'}</span>
              </button>
            ))}
          </div>

          <span className="text-xs text-[var(--rf-text-dim)]">{tabMovies.length} titles</span>
        </div>

        {/* ── CONTENT ── */}
        {isLoading ? (
          <GridSkeleton count={12} />
        ) : (
          <AnimatePresence mode="wait">
            {view === 'grid' ? (
              <motion.div
                key={`grid-${activeTab}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4"
              >
                {tabMovies.map((movie, idx) => (
                  <MovieCardGrid key={`${movie.subjectId}-${idx}`} movie={movie} index={idx} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key={`ranked-${activeTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {tabMovies.map((movie, idx) => (
                  <RankedRow key={`${movie.subjectId}-${idx}`} movie={movie} rank={idx + 1} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

/* ── Ranked row card ── */
function RankedRow({ movie, rank }: { movie: any; rank: number }) {
  const title = movie.title || movie.name || 'Untitled';
  const coverUrl = movie.cover?.url;
  const rating = movie.imdbRatingValue;
  const isSeries = movie.subjectType === 2;
  const year = movie.releaseDate?.substring(0, 4);

  const rankColor =
    rank === 1 ? 'text-[var(--rf-gold)]' :
    rank === 2 ? 'text-slate-300' :
    rank === 3 ? 'text-orange-400' :
    'text-[var(--rf-text-dim)]';

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5) }}
    >
      <Link
        to={buildMoviePath(title, movie.subjectId)}
        className="group flex items-center gap-4 p-3 rounded-2xl glass hover:glass-2 border border-transparent hover:border-[var(--rf-border-hover)] transition-all duration-300"
      >
        {/* Rank number */}
        <span className={cn('font-black text-xl md:text-2xl w-8 text-center shrink-0 tabular-nums', rankColor)}>
          {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
        </span>

        {/* Poster */}
        <div className="shrink-0 w-10 h-14 md:w-12 md:h-16 rounded-xl overflow-hidden">
          <OptimizedImage src={coverUrl} alt={title} className="w-full h-full" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm md:text-base text-white group-hover:text-[var(--rf-red)] transition-colors truncate">{title}</p>
          <p className="text-xs text-[var(--rf-text-dim)] flex items-center gap-2 mt-0.5">
            <span>{isSeries ? 'TV Series' : 'Movie'}</span>
            {year && <><span>·</span><span>{year}</span></>}
            {movie.genre && <><span>·</span><span className="truncate max-w-[120px]">{movie.genre.split(',')[0]?.trim()}</span></>}
          </p>
        </div>

        {/* Rating */}
        {rating > 0 && (
          <div className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg glass-2">
            <Star size={11} className="fill-[var(--rf-gold)] text-[var(--rf-gold)]" />
            <span className="text-xs font-bold text-white">{formatRating(rating)}</span>
          </div>
        )}

        {/* Type badge */}
        <span className="shrink-0 hidden md:inline text-[9px] font-bold px-2 py-1 rounded-full glass-2 text-[var(--rf-text-muted)]">
          {isSeries ? 'TV' : 'MOV'}
        </span>
      </Link>
    </motion.div>
  );
}
