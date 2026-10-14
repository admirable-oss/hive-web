import { create } from "zustand";

/**
 * Cross-island UI state. Astro islands are separate React roots; zustand keeps
 * sound, menu, intro timing, and demo mode in one module singleton.
 */
export interface HiveState {
  sound: boolean;
  menuOpen: boolean;
  /** `performance.now()` when the intro choreography started. */
  introAt: number | null;
  /** Intro was preceded by the preloader (mascot from above). */
  preloaded: boolean;
  /** Full-screen TUI demo is active. */
  demoOpen: boolean;
}

export const useHiveStore = create<HiveState>()(() => ({
  sound: true,
  menuOpen: false,
  introAt: null,
  preloaded: false,
  demoOpen: false,
}));

/** Imperative reads (animation loops, audio) without subscribing. */
export const hiveStore = {
  get: () => useHiveStore.getState(),
  set: (partial: Partial<HiveState> | ((s: HiveState) => Partial<HiveState>)) => {
    useHiveStore.setState(typeof partial === "function" ? partial(useHiveStore.getState()) : partial);
  },
  subscribe: (listener: () => void) => useHiveStore.subscribe(listener),
};

export function useHive<S>(selector: (s: HiveState) => S): S {
  return useHiveStore(selector);
}

export const hiveActions = {
  toggleSound: () => hiveStore.set((s) => ({ sound: !s.sound })),
  setMenuOpen: (menuOpen: boolean) => hiveStore.set({ menuOpen }),
  setDemoOpen: (demoOpen: boolean) => hiveStore.set({ demoOpen }),
  /** Idempotent — the first caller wins. */
  beginIntro(preloaded: boolean) {
    if (hiveStore.get().introAt !== null) return;
    hiveStore.set({ introAt: performance.now(), preloaded });
  },
};

/** Seconds since the intro started, or -1 before it has. */
export const introElapsed = () => {
  const at = hiveStore.get().introAt;
  return at === null ? -1 : (performance.now() - at) / 1000;
};
