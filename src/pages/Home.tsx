import { useQuery } from '@tanstack/react-query';
import { fetchTrending, fetchHomepage } from '../api/client';
import { Download, Star, Play, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MovieCard } from '../components/MovieCard';
import { MovieRow } from '../components/MovieRow';
import { HeroSkeleton, MovieRowSkeleton } from '../components/ui/Skeleton';
import { buildMoviePath } from '../utils/slug';
import { formatRating } from '../utils/format';
import { useRecentlyViewedStore } from '../stores/useRecentlyViewedStore';
import { useWatchlistStore } from '../stores/useWatchlistStore';
import { useSEO } from '../hooks/useSEO';

export default function Home() {
  const navigate = useNavigate();

  useSEO({ title: 'Home', description: 'Discover trending movies and TV series with fast downloads' });

  const { data: trending, isLoading: trendingLoading, error: trendingError } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
  });

  const { data: hpData, isLoading: hpLoading, error: hpError } = useQuery<any>({
    queryKey: ['homepage'],
    queryFn: fetchHomepage,
  });

  const isLoading = trendingLoading || hpLoading;

  // Extract banner items
  const bannerItems = useMemo(() => {
    if (!hpData?.operatingList) return [];
    const bannerSection = hpData.operatingList.find((op: any) => op.type === 'BANNER');
    return bannerSection?.banner?.items || [];
  }, [hpData]);

  // Extract movie rows
  const movieRows = useMemo(() => {
    if (!hpData?.operatingList) return [];
    return hpData.operatingList.filter(
      (op: any) => op.type === 'SUBJECTS_MOVIE' && op.subjects?.length > 0
    );
  }, [hpData]);

  // Hero banner rotation
  const [heroIndex, setHeroIndex] = useState(0);
  const heroItems = bannerItems.length > 0 ? bannerItems : trending?.slice(0, 6) || [];
  const heroItem = heroItems[heroIndex];
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoRotate = useCallback(() => {
    if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    autoRotateRef.current = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % Math.max(heroItems.length, 1));
    }, 7000);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length <= 1) return;
    startAutoRotate();
    return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
  }, [heroItems.length, startAutoRotate]);

  const goToHero = useCallback((index: number) => {
    setHeroIndex(index);
    startAutoRotate();
  }, [startAutoRotate]);

  // Error state
  if (trendingError || hpError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl glass-2 flex items-center justify-center mx-auto mb-6">
            <div className="w-10 h-10 rounded-full bg-[var(--rf-red)]/20 flex items-center justify-center text-[var(--rf-red)]">
              <Info size={24} />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-[var(--rf-text-muted)] mb-6 text-sm">
            {String((trendingError || hpError)?.message || 'Unable to load content. Please check your connection.')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-8 py-3.5 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="-mt-[72px]">
        <HeroSkeleton />
        <div className="space-y-4 mt-4">
          <MovieRowSkeleton />
          <MovieRowSkeleton />
          <MovieRowSkeleton />
        </div>
      </div>
    );
  }

  // Resolve hero data
  const getHeroData = () => {
    if (!heroItem) return null;
    const subject = heroItem.subject || heroItem;
    return {
      id: subject.subjectId,
      title: subject.title || heroItem.title,
      description: subject.description,
      coverUrl: heroItem.image?.url || subject.stills?.url || subject.cover?.url,
      subjectType: subject.subjectType,
      rating: subject.imdbRatingValue,
      genre: subject.genre,
    };
  };

  const hero = getHeroData();

  return (
    <div className="flex-1 min-h-screen -mt-[72px]">
      {/* ============ CINEMATIC HERO BANNER ============ */}
      {hero && (
        <section className="relative w-full h-[65vh] md:h-[85vh] overflow-hidden" aria-label="Featured content">
          {/* Background Image with Crossfade */}
          <AnimatePresence mode="sync">
            <motion.div
              key={`hero-bg-${heroIndex}`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              <img
                src={hero.coverUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                aria-hidden="true"
              />
            </motion.div>
          </AnimatePresence>

          {/* Multi-layer Gradients */}
          <div className="absolute inset-0 gradient-hero" />
          <div className="absolute inset-0 gradient-hero-side hidden md:block" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--rf-black)]/80 via-transparent to-transparent md:block hidden" />

          {/* Cinematic Vignette */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, var(--rf-black) 100%)' }} />

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col justify-end h-full px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 pb-14 md:pb-20 max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={`hero-content-${heroIndex}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Meta Badges */}
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="badge glass text-[10px] py-1 px-3 backdrop-blur-xl">
                    {hero.subjectType === 2 ? '📺 TV Series' : '🎬 Movie'}
                  </span>
                  {hero.rating && (
                    <span className="badge badge-rating py-1 px-3 text-[11px]">
                      <Star size={10} className="fill-[var(--rf-gold)]" />
                      {formatRating(hero.rating)} IMDb
                    </span>
                  )}
                  {hero.genre && (
                    <span className="hidden md:inline text-xs text-[var(--rf-text-muted)]">
                      {hero.genre.split(',').slice(0, 3).join(' • ')}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 leading-[1.1] tracking-tight max-w-2xl">
                  {hero.title}
                </h1>

                {/* Description */}
                <p className="text-sm md:text-base text-[var(--rf-text-muted)] line-clamp-2 md:line-clamp-3 mb-6 max-w-xl leading-relaxed">
                  {hero.description || 'Discover this incredible title. Download now to experience it in stunning quality.'}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to={buildMoviePath(hero.title, hero.id)}
                    className="btn-primary text-sm px-7 py-3.5"
                  >
                    <Download size={18} />
                    <span>Download Now</span>
                  </Link>
                  <Link
                    to={buildMoviePath(hero.title, hero.id)}
                    className="btn-glass text-sm px-7 py-3.5"
                  >
                    <Info size={18} />
                    <span>More Info</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Hero Navigation Dots */}
            {heroItems.length > 1 && (
              <div className="flex items-center gap-2 mt-8">
                {heroItems.slice(0, 8).map((_: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => goToHero(i)}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === heroIndex
                        ? 'bg-[var(--rf-red)] w-8 glow-red'
                        : 'bg-white/15 w-3 hover:bg-white/30'
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === heroIndex}
                  />
                ))}
                <span className="text-[10px] text-[var(--rf-text-dim)] ml-3 font-medium">
                  {heroIndex + 1}/{Math.min(heroItems.length, 8)}
                </span>
              </div>
            )}
          </div>

          {/* Hero Arrow Navigation */}
          {heroItems.length > 1 && (
            <>
              <button
                onClick={() => goToHero((heroIndex - 1 + heroItems.length) % heroItems.length)}
                className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass-2 items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Previous slide"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => goToHero((heroIndex + 1) % heroItems.length)}
                className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full glass-2 items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Next slide"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </section>
      )}

      {/* ============ CONTENT SECTIONS ============ */}
      <div className="relative z-10 space-y-2 pt-6 md:pt-10">
        {/* Continue Browsing (Recently Viewed) */}
        <ContinueBrowsing />

        {/* My Watchlist Preview */}
        <WatchlistPreview />

        {/* Trending Now */}
        {trending && trending.length > 0 && (
          <MovieRow title="🔥 Trending Now" subtitle="Most popular this week" onViewAll={() => navigate('/trending')}>
            {trending.map((movie: any, idx: number) => (
              <div key={`${movie.subjectId}-trend-${idx}`} className="snap-start">
                <MovieCard movie={movie} index={idx} size="md" />
              </div>
            ))}
          </MovieRow>
        )}

        {/* Smart Recommendations */}
        <SmartRecommendations allMovies={trending || []} />

        {/* Homepage Sections */}
        {movieRows.map((row: any, rowIdx: number) => (
          <MovieRow key={row.opId || rowIdx} title={row.title}>
            {row.subjects.map((movie: any, idx: number) => (
              <div key={`${movie.subjectId}-${row.opId}-${idx}`} className="snap-start">
                <MovieCard movie={movie} index={idx} size="md" />
              </div>
            ))}
          </MovieRow>
        ))}

        {/* Top Rated Section */}
        {trending && trending.length > 5 && (
          <MovieRow title="⭐ Top Rated" subtitle="Highest rated content" onViewAll={() => navigate('/collections')}>
            {[...trending]
              .sort((a: any, b: any) => (b.imdbRatingValue || 0) - (a.imdbRatingValue || 0))
              .slice(0, 15)
              .map((movie: any, idx: number) => (
                <div key={`${movie.subjectId}-top-${idx}`} className="snap-start">
                  <MovieCard movie={movie} index={idx} size="md" />
                </div>
              ))}
          </MovieRow>
        )}
      </div>
    </div>
  );
}

/* ============ CONTINUE BROWSING ============ */
function ContinueBrowsing() {
  const items = useRecentlyViewedStore((s) => s.items);

  if (items.length === 0) return null;

  // Convert recently viewed items to movie-card-compatible objects
  const movies = items.slice(0, 15).map((item) => ({
    subjectId: item.subjectId,
    title: item.title,
    cover: item.coverUrl ? { url: item.coverUrl } : undefined,
    subjectType: item.subjectType,
    imdbRatingValue: item.imdbRatingValue,
    releaseDate: item.releaseDate,
  }));

  return (
    <MovieRow title="📺 Continue Browsing" subtitle="Pick up where you left off">
      {movies.map((movie: any, idx: number) => (
        <div key={`recent-${movie.subjectId}-${idx}`} className="snap-start">
          <MovieCard movie={movie} index={idx} size="md" />
        </div>
      ))}
    </MovieRow>
  );
}

/* ============ WATCHLIST PREVIEW ============ */
function WatchlistPreview() {
  const items = useWatchlistStore((s) => s.items);

  if (items.length === 0) return null;

  const movies = items.slice(0, 15).map((item) => ({
    subjectId: item.subjectId,
    title: item.title,
    cover: item.coverUrl ? { url: item.coverUrl } : undefined,
    subjectType: item.subjectType,
    imdbRatingValue: item.imdbRatingValue,
    releaseDate: item.releaseDate,
  }));

  return (
    <MovieRow title="❤️ My Watchlist" subtitle="Your saved titles">
      {movies.map((movie: any, idx: number) => (
        <div key={`wl-${movie.subjectId}-${idx}`} className="snap-start">
          <MovieCard movie={movie} index={idx} size="md" />
        </div>
      ))}
    </MovieRow>
  );
}

/* ============ SMART RECOMMENDATIONS (AI Pick) ============ */
function SmartRecommendations({ allMovies }: { allMovies: any[] }) {
  const items = useRecentlyViewedStore((s) => s.items);
  
  if (items.length === 0 || allMovies.length === 0) return null;

  // Extremely basic "AI" recommendation logic: 
  // Suggest high rated items from similar release years or type
  const recommended = useMemo(() => {
    const recentTypes = new Set(items.slice(0, 5).map(i => i.subjectType));
    const isAnimeUser = items.some(i => i.title.toLowerCase().includes('anime'));
    
    let pool = allMovies.filter(m => !items.some(i => i.subjectId === m.subjectId));
    
    // Boost items matching their type preference
    pool = pool.sort((a, b) => {
      let scoreA = a.imdbRatingValue || 0;
      let scoreB = b.imdbRatingValue || 0;
      
      if (recentTypes.has(a.subjectType)) scoreA += 1;
      if (recentTypes.has(b.subjectType)) scoreB += 1;
      
      if (isAnimeUser && a.genre?.toLowerCase().includes('animation')) scoreA += 2;
      if (isAnimeUser && b.genre?.toLowerCase().includes('animation')) scoreB += 2;
      
      return scoreB - scoreA;
    });

    return pool.slice(0, 15);
  }, [items, allMovies]);

  if (recommended.length === 0) return null;

  return (
    <MovieRow title="✨ Top Picks For You" subtitle="Smart recommendations based on your history">
      {recommended.map((movie: any, idx: number) => (
        <div key={`rec-${movie.subjectId}-${idx}`} className="snap-start relative group">
          <MovieCard movie={movie} index={idx} size="md" />
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg z-10 hidden group-hover:block animate-bounce">
            AI PICK
          </div>
        </div>
      ))}
    </MovieRow>
  );
}
