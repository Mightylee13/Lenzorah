import { Star, Download, ChevronLeft, Clock, Globe, BarChart3, Calendar, Tv, Heart, Share2, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { SubjectInfo, MovieMetadata, Season } from '../types';
import { OptimizedImage } from '../../../components/ui/OptimizedImage';
import { formatDuration, formatRating, formatCount, formatYear } from '../../../utils/format';
import { useWatchlistStore } from '../../../stores/useWatchlistStore';
import toast from 'react-hot-toast';

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
  playLabel = 'Watch Now',
}: MovieHeroProps) => {
  const navigate = useNavigate();
  const genres = subject.genre?.split(',').map((g: string) => g.trim()).filter(Boolean) || [];
  const year = formatYear(subject.releaseDate);
  const duration = formatDuration(subject.duration);

  return (
    <>
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-[var(--rf-text-muted)] hover:text-white transition-colors mb-8 cursor-pointer group"
        aria-label="Go Back"
      >
        <ChevronLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
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
              {isTvSeries ? '📺 TV Series' : '🎬 Movie'}
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
                        className={i < Math.round(subject.imdbRatingValue / 2) ? 'fill-[var(--rf-gold)] text-[var(--rf-gold)]' : 'text-[var(--rf-text-dim)]'}
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

          {/* Description */}
          <p className="text-sm md:text-base text-[var(--rf-text-muted)] leading-relaxed mb-8 max-w-2xl">
            {subject.description || metadata?.description || 'No description available for this title.'}
          </p>

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
function CTAButtons({ subject, coverUrl, isTvSeries, onOpenDownload, onOpenPlay, playLabel }: {
  subject: SubjectInfo;
  coverUrl?: string;
  isTvSeries: boolean;
  onOpenDownload: () => void;
  onOpenPlay: () => void;
  playLabel: string;
}) {
  const addItem = useWatchlistStore((s) => s.addItem);
  const removeItem = useWatchlistStore((s) => s.removeItem);
  const isInWatchlist = useWatchlistStore((s) => s.isInWatchlist(subject.subjectId || ''));

  const toggleWatchlist = () => {
    const id = subject.subjectId || '';
    if (isInWatchlist) {
      removeItem(id);
      toast('Removed from Watchlist', { icon: '💔' });
    } else {
      addItem({
        subjectId: id,
        title: subject.title,
        coverUrl: coverUrl,
        subjectType: subject.subjectType,
        imdbRatingValue: subject.imdbRatingValue,
        releaseDate: subject.releaseDate,
      });
      toast.success('Added to Watchlist');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: subject.title, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onOpenPlay}
        aria-label="Stream Movie Now"
        className="btn-primary text-sm px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 border-none shadow-[0_0_30px_rgba(225,29,72,0.3)] hover:shadow-[0_0_40px_rgba(225,29,72,0.5)] transition-all"
      >
        <Play size={18} className="fill-current" />
        <span>{playLabel}</span>
      </button>

      <button
        onClick={onOpenDownload}
        aria-label="Open Download Options"
        className="btn-glass text-sm px-6 py-4 hover:bg-white/10"
      >
        <Download size={18} />
        <span>Download</span>
      </button>

      <a
        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(subject.title + ' trailer')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-glass text-sm px-5 py-4 hover:bg-white/10"
      >
        <Play size={18} className="fill-current" />
        <span>Trailer</span>
      </a>

      <button
        onClick={toggleWatchlist}
        aria-label={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        className={`btn-glass text-sm px-5 py-4 ${
          isInWatchlist ? 'text-[var(--rf-red)] border-[var(--rf-red)]/30' : ''
        }`}
      >
        <Heart size={18} fill={isInWatchlist ? 'currentColor' : 'none'} />
        <span>{isInWatchlist ? 'Saved' : 'Watchlist'}</span>
      </button>

      <button
        onClick={handleShare}
        aria-label="Share"
        className="w-12 h-12 rounded-xl glass-2 flex items-center justify-center hover:bg-white/[0.08] transition-colors"
      >
        <Share2 size={18} />
      </button>
    </div>
  );
}
