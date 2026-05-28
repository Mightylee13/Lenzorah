import { useEffect } from "react";
import { useOfflineStore } from "../pages/MovieDetails/hooks/useOfflineStore";

/**
 * Drop this hook in your App.tsx (or root layout) once.
 * It silently removes expired offline videos on every app start.
 */
export function usePurgeExpiredOffline() {
  const purgeExpired = useOfflineStore((s) => s.purgeExpired);
  useEffect(() => {
    purgeExpired();
  }, []);
}
