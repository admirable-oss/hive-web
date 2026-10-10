import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { actions } from "astro:actions";
import { parseRoadmap } from "@/lib/roadmap/parse";
import type { RoadmapPayload } from "@/lib/roadmap/server";

export type RoadmapInitial = RoadmapPayload & { renderedAt: number };

/** "stale": the last refresh failed; we keep showing what we have. */
export type SyncState = RoadmapPayload["source"] | "stale" | "partial";

/**
 * The page's data, refreshed from the `roadmap` Astro Action (GitHub is only
 * ever called server-side, with the token and a shared cache). The action is
 * cheap to call: the server decides how fresh each resource needs to be.
 */
const REFRESH_EVERY = 5 * 60_000;

export function useRoadmapLive(initial: RoadmapInitial) {
  const [data, setData] = useState<RoadmapPayload>(initial);
  const [sync, setSync] = useState<SyncState>(initial.source);
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(initial.renderedAt);
  const [toast, setToast] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const rm = useMemo(() => parseRoadmap(data.md), [data.md]);

  const latest = useRef(data);
  const toastTimer = useRef(0);

  const notify = useCallback((t: string) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 3800);
  }, []);

  const refresh = useCallback(async (force = false) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const { data: next, error } = await actions.roadmap({ force });
      if (error || !next) {
        setSync("stale");
        setSyncError("The sync request failed. Your last loaded roadmap is still shown; try again shortly.");
        return;
      }
      if (latest.current.source === "live" && next.md !== latest.current.md) notify("ROADMAP.md changed on main. The comb has been redrawn.");
      latest.current = next;
      setData(next);
      setSync(next.source);
      const failed = Object.values(next.errors).length > 0 || next.actState !== "ok" || next.source !== "live";
      if (failed) {
        setSync("partial");
        const reasons = [
          ...Object.values(next.errors).map((reason) =>
            reason === "auth" ? "GitHub rejected the token (401)" :
              reason === "forbidden" ? "GitHub denied access; check the token’s repository permissions" :
                reason === "rate" ? "GitHub rate limit reached" : "GitHub rejected a data request",
          ),
          ...(next.actState === "computing" ? ["GitHub is still calculating activity"] : next.actState === "rate" ? ["GitHub rate limit reached"] : next.actState === "auth" ? ["GitHub rejected the token (401)"] : next.actState === "forbidden" ? ["GitHub denied access; check the token’s repository permissions"] : next.actState === "http" ? ["GitHub activity request failed"] : []),
          ...(next.source !== "live" ? ["ROADMAP.md could not be refreshed"] : []),
        ];
        setSyncError(`${[...new Set(reasons)].join(". ")}. Some data may be showing its last successful version.`);
      }
    } catch {
      setSync("stale");
      setSyncError("The sync request could not reach the server. Check your connection and try again.");
    } finally {
      setSyncing(false);
    }
  }, [notify]);

  useEffect(() => {
    setNow(Date.now());
    void refresh();
    // Background tabs don't poll.
    const poll = setInterval(() => !document.hidden && refresh(), REFRESH_EVERY);
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      clearTimeout(toastTimer.current);
    };
  }, [refresh]);

  return { ...data, rm, sync, syncing, syncError, now, toast, notify, refresh };
}

export type RoadmapLive = ReturnType<typeof useRoadmapLive>;
