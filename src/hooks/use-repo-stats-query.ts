import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { actions } from "astro:actions";
import type { RepoStats } from "@/lib/github";
import { useRepoStatsStore } from "@/lib/repo-stats-store";

const REFRESH_EVERY = 5 * 60_000;

export function useRepoStatsQuery(initial: RepoStats | null) {
  const stats = useRepoStatsStore((s) => s.stats);
  const hydrate = useRepoStatsStore((s) => s.hydrate);
  const setStats = useRepoStatsStore((s) => s.setStats);

  useEffect(() => {
    hydrate(initial);
  }, [hydrate, initial]);

  useQuery({
    queryKey: ["repoStats"],
    queryFn: async () => {
      const { data, error } = await actions.repoStats();
      if (error || !data) throw error ?? new Error("repo stats unavailable");
      setStats(data);
      return data;
    },
    initialData: initial ?? undefined,
    staleTime: REFRESH_EVERY,
    refetchInterval: REFRESH_EVERY,
    refetchIntervalInBackground: false,
  });

  return stats ?? initial;
}
