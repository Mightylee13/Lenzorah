import { useState, useCallback } from "react";

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string;

const trailerCache: Record<string, string | null> = {};

export function useYouTubeTrailer(title: string, year?: string | number) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const getTrailer = useCallback(async () => {
    if (!title) return null;

    if (!YOUTUBE_API_KEY) {
      console.warn("VITE_YOUTUBE_API_KEY is not set in .env");
      return null;
    }

    const cacheKey = `${title.toLowerCase()}_${year || ""}`;

    if (cacheKey in trailerCache) {
      const cachedId = trailerCache[cacheKey];
      if (cachedId === null) {
        setIsUnavailable(true);
        return null;
      }
      setVideoId(cachedId);
      return cachedId;
    }

    setIsLoading(true);
    try {
      const query = `${title} ${year || ""} official trailer`;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query,
        )}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`,
      );

      if (!response.ok) {
        const errResponse = await response.json().catch(() => null);
        console.error("--- YOUTUBE API ERROR ---");
        console.error("Status Code:", response.status);
        console.error("Error Payload:", errResponse);
        console.error("------------------------");
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const id = data?.items?.[0]?.id?.videoId || null;

      trailerCache[cacheKey] = id;

      if (!id) {
        setIsUnavailable(true);
      } else {
        setVideoId(id);
      }
      return id;
    } catch (error) {
      console.warn(
        "YouTube API call failed. Falling back to search tab.",
        error,
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [title, year]);

  return { videoId, isLoading, isUnavailable, getTrailer };
}

export default useYouTubeTrailer;
