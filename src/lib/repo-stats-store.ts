import { create } from "zustand";
import type { RepoStats } from "@/lib/github";

interface RepoStatsState {
  stats: RepoStats | null;
  hydrated: boolean;
  setStats: (stats: RepoStats | null) => void;
  hydrate: (stats: RepoStats | null) => void;
}

export const useRepoStatsStore = create<RepoStatsState>((set, get) => ({
  stats: null,
  hydrated: false,
  setStats: (stats) => set({ stats }),
  hydrate: (stats) => {
    if (get().hydrated) return;
    set({ stats, hydrated: true });
  },
}));
