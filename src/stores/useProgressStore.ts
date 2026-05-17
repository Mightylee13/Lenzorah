import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProgressData {
  lastEpisode: number;
  lastSeason: number;
  lastTime?: number;
  duration?: number;
  updatedAt: number;
  completedEpisodes: number[];
}

interface ProgressStore {
  progress: Record<string, ProgressData>;
  markEpisodeComplete: (subjectId: string, season: number, episode: number) => void;
  saveProgress: (
    subjectId: string,
    season: number,
    episode: number,
    lastTime: number,
    duration: number
  ) => void;
  getProgress: (subjectId: string) => ProgressData | null;
  isEpisodeComplete: (subjectId: string, episode: number) => boolean;
  removeProgress: (subjectId: string) => void;
  clearProgress: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: {},

      markEpisodeComplete: (subjectId, season, episode) =>
        set((state) => {
          const current = state.progress[subjectId] || {
            lastEpisode: 0,
            lastSeason: 1,
            updatedAt: 0,
            completedEpisodes: [],
          };

          const newCompleted = [...new Set([...current.completedEpisodes, episode])];

          return {
            progress: {
              ...state.progress,
              [subjectId]: {
                ...current,
                lastSeason: season,
                lastEpisode: Math.max(current.lastEpisode, episode),
                updatedAt: Date.now(),
                completedEpisodes: newCompleted,
              },
            },
          };
        }),

      saveProgress: (subjectId, season, episode, lastTime, duration) =>
        set((state) => {
          const current = state.progress[subjectId] || {
            lastEpisode: 1,
            lastSeason: 1,
            updatedAt: 0,
            completedEpisodes: [],
          };

          return {
            progress: {
              ...state.progress,
              [subjectId]: {
                ...current,
                lastSeason: season,
                lastEpisode: episode,
                lastTime,
                duration,
                updatedAt: Date.now(),
              },
            },
          };
        }),

      getProgress: (subjectId) => {
        return get().progress[subjectId] || null;
      },

      isEpisodeComplete: (subjectId, episode) => {
        const prog = get().progress[subjectId];
        if (!prog) return false;
        return prog.completedEpisodes.includes(episode);
      },

      removeProgress: (subjectId) =>
        set((state) => {
          const newProgress = { ...state.progress };
          delete newProgress[subjectId];
          return { progress: newProgress };
        }),

      clearProgress: () => set({ progress: {} }),
    }),
    {
      name: 'runflix-progress-storage',
    }
  )
);
