import { useSyncExternalStore } from "react";

/**
 * Tiny cross-island store. Astro islands are separate React roots, so shared
 * UI state (sound, menu, intro clock) lives in a module singleton that every
 * island subscribes to. Animation loops read it via `hiveStore.get()` without
 * re-rendering.
 */
export interface HiveState {
  sound: boolean;
  menuOpen: boolean;
  /** `performance.now()` at which the intro choreography started. */
  introAt: number | null;
  /** Whether the intro was preceded by the preloader (mascot arrives from above). */
  preloaded: boolean;
}

type Listener = () => void;

function createStore<T extends object>(initial: T) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(patch: Partial<T> | ((s: T) => Partial<T>)) {
      const next = typeof patch === "function" ? patch(state) : patch;
      if (Object.entries(next).every(([k, v]) => Object.is(state[k as keyof T], v))) return;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export const hiveStore = createStore<HiveState>({
  sound: true,
  menuOpen: false,
  introAt: null,
  preloaded: false,
});

export function useHive<S>(selector: (s: HiveState) => S): S {
  const read = () => selector(hiveStore.get());
  return useSyncExternalStore(hiveStore.subscribe, read, read);
}

export const hiveActions = {
  toggleSound: () => hiveStore.set((s) => ({ sound: !s.sound })),
  setMenuOpen: (menuOpen: boolean) => hiveStore.set({ menuOpen }),
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
