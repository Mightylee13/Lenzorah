import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchHomepage, fetchTrending, SearchItem } from "../api/client";
import { motion } from "motion/react";
import { Layers, ChevronRight } from "lucide-react";
import { MovieCard } from "../components/MovieCard";
import { MovieRow } from "../components/MovieRow";
import { MovieRowSkeleton } from "../components/ui/Skeleton";
import { useSEO } from "../hooks/useSEO";
import { Link } from "react-router-dom";
import { GENRE_LIST } from "./Genre";

// Use SearchItem directly — imdbRatingValue is string from the API ("0", "8.5" etc)
type CollectionMovie = SearchItem;

type HomepageSection = {
  subjects?: CollectionMovie[];
};

type HomepageData = {
  operatingList?: HomepageSection[];
};

type SpecialCollection = {
  key: string;
  title: string;
  subtitle: string;
  items: CollectionMovie[];
  link?: string;
};

const GENRE_EMOJIS: Record<string, string> = {
  action: "💥",
  comedy: "😂",
  drama: "🎭",
  horror: "👻",
  thriller: "🔪",
  romance: "💕",
  "sci-fi": "🚀",
  adventure: "🗺️",
  animation: "✨",
  crime: "🕵️",
  fantasy: "🧙",
  documentary: "📽️",
  mystery: "🔍",
  war: "⚔️",
  history: "📜",
  music: "🎵",
  family: "👨‍👩‍👧‍👦",
  western: "🤠",
  sport: "⚽",
};

const GENRE_GRADIENTS: Record<string, string> = {
  action: "from-orange-600/20 to-red-900/10",
  comedy: "from-yellow-500/20 to-amber-700/10",
  drama: "from-indigo-600/20 to-purple-900/10",
  horror: "from-gray-800/30 to-red-950/10",
  thriller: "from-slate-700/20 to-red-800/10",
  romance: "from-pink-500/20 to-rose-800/10",
  "sci-fi": "from-cyan-600/20 to-blue-900/10",
  adventure: "from-emerald-600/20 to-teal-800/10",
  animation: "from-violet-500/20 to-fuchsia-800/10",
  crime: "from-zinc-700/20 to-slate-900/10",
  fantasy: "from-purple-600/20 to-indigo-900/10",
  documentary: "from-stone-600/20 to-neutral-800/10",
};

// Parse imdbRatingValue safely — API returns it as a string e.g. "8.5" or "0"
function getImdbRating(movie: CollectionMovie): number {
  return parseFloat(String(movie.imdbRatingValue ?? "0")) || 0;
}

export default function Collections() {
  useSEO({
    title: "Collections",
    description:
      "Browse curated movie and TV collections by genre, mood, and more on RUNFlix",
  });

  const { data: trending, isLoading: tl } = useQuery<CollectionMovie[]>({
    queryKey: ["trending"],
    queryFn: fetchTrending as () => Promise<CollectionMovie[]>,
    staleTime: 10 * 60 * 1000,
  });

  const { data: hpData, isLoading: hl } = useQuery<HomepageData>({
    queryKey: ["homepage"],
    queryFn: fetchHomepage as () => Promise<HomepageData>,
    staleTime: 10 * 60 * 1000,
  });

  /* Deduplicated pool */
  const allMovies = useMemo(() => {
    const movies: CollectionMovie[] = [];
    const seen = new Set<string>();

    const add = (movie: CollectionMovie) => {
      if (movie?.subjectId && !seen.has(movie.subjectId)) {
        seen.add(movie.subjectId);
        movies.push(movie);
      }
    };

    if (hpData?.operatingList) {
      for (const section of hpData.operatingList) {
        (section.subjects ?? []).forEach(add);
      }
    }

    (trending ?? []).forEach(add);
    return movies;
  }, [hpData, trending]);

  /* Build genre collections (min 4 items) */
  const genreCollections = useMemo(() => {
    return GENRE_LIST.map((genre) => {
      const items = allMovies.filter((movie) =>
        (movie.genre || "").toLowerCase().includes(genre),
      );
      return { genre, items };
    }).filter((collection) => collection.items.length >= 4);
  }, [allMovies]);

  /* Curated special collections */
  const specialCollections = useMemo<SpecialCollection[]>(
    () =>
      [
        {
          key: "top-rated",
          title: "⭐ Top Rated",
          subtitle: "IMDb 8.0+",
          items: [...allMovies]
            .filter((movie) => getImdbRating(movie) >= 8)
            .sort((a, b) => getImdbRating(b) - getImdbRating(a))
            .slice(0, 15),
        },
        {
          key: "new-releases",
          title: "🆕 New Releases",
          subtitle: "Recently added",
          items: [...allMovies]
            .sort((a, b) =>
              (b.releaseDate || "").localeCompare(a.releaseDate || ""),
            )
            .slice(0, 15),
        },
        {
          key: "movies-only",
          title: "🎬 Movies Only",
          subtitle: "Feature films",
          items: allMovies
            .filter((movie) => movie.subjectType === 1)
            .slice(0, 15),
        },
        {
          key: "series-only",
          title: "📺 TV Series",
          subtitle: "Binge-worthy shows",
          items: allMovies
            .filter((movie) => movie.subjectType === 2)
            .slice(0, 15),
        },
        {
          key: "anime",
          title: "🎌 Anime",
          subtitle: "Japanese animation",
          items: allMovies
            .filter(
              (movie) =>
                (movie.genre || "").toLowerCase().includes("anime") ||
                (movie.countryName || "").toLowerCase().includes("japan"),
            )
            .slice(0, 15),
          link: "/anime",
        },
      ].filter((collection) => collection.items.length >= 3),
    [allMovies],
  );

  const isLoading = tl || hl;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen"
    >
      {/* ── HERO ── */}
      <div className="relative py-12 md:py-20 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-violet-900/25 via-(--rf-black) to-blue-900/15" />
        <div className="absolute top-0 right-0 w-125 h-100 bg-violet-600/8 blur-[130px] rounded-full" />
        <div className="relative z-10 max-w-400 mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-xl shadow-violet-500/20">
              <Layers size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white">
                Collections
              </h1>
              <p className="text-sm text-(--rf-text-muted) mt-1">
                Curated lists for every mood
              </p>
            </div>
          </div>
          {!isLoading && (
            <p className="text-sm text-(--rf-text-dim)">
              {specialCollections.length + genreCollections.length} collections
              · {allMovies.length} total titles
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4 px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28">
          {[1, 2, 3].map((i) => (
            <MovieRowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-2 pb-12">
          {/* Special curated rows */}
          {specialCollections.map((collection) => (
            <MovieRow
              key={collection.key}
              title={collection.title}
              subtitle={collection.subtitle}
              onViewAll={
                collection.link
                  ? () => {
                      window.location.href = collection.link!;
                    }
                  : undefined
              }
            >
              {collection.items.map((movie, idx) => (
                <div
                  key={`${collection.key}-${movie.subjectId ?? idx}`}
                  className="snap-start"
                >
                  <MovieCard movie={movie} index={idx} size="md" />
                </div>
              ))}
            </MovieRow>
          ))}

          {/* Genre grid navigator */}
          <div className="max-w-400 mx-auto px-6 sm:px-10 md:px-16 lg:px-20 xl:px-28 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Browse by Genre</h2>
              <Link
                to="/explore"
                className="text-xs text-(--rf-red) flex items-center gap-0.5 hover:gap-1 transition-all"
              >
                See All <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {genreCollections.map(({ genre, items }) => (
                <Link
                  key={genre}
                  to={`/genre/${genre}`}
                  className={`group relative h-20 md:h-24 rounded-2xl overflow-hidden bg-linear-to-br ${GENRE_GRADIENTS[genre] || "from-(--rf-surface-2) to-(--rf-surface-3)"} border border-white/5 hover:border-white/10 transition-all duration-300`}
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                      {GENRE_EMOJIS[genre] || "🎬"}
                    </span>
                    <span className="text-white font-bold text-xs capitalize">
                      {genre}
                    </span>
                    <span className="text-(--rf-text-dim) text-[9px]">
                      {items.length} titles
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Genre rows */}
          {genreCollections.slice(0, 8).map(({ genre, items }) => (
            <MovieRow
              key={genre}
              title={`${GENRE_EMOJIS[genre] || "🎬"} ${genre.charAt(0).toUpperCase() + genre.slice(1)}`}
              onViewAll={() => {
                window.location.href = `/genre/${genre}`;
              }}
            >
              {items.slice(0, 15).map((movie, idx) => (
                <div
                  key={`genre-${genre}-${movie.subjectId ?? idx}`}
                  className="snap-start"
                >
                  <MovieCard movie={movie} index={idx} size="md" />
                </div>
              ))}
            </MovieRow>
          ))}
        </div>
      )}
    </motion.div>
  );
}
