import { useSyncExternalStore } from "react";

const format = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const subscribe = (cb: () => void) => {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    // Wake exactly on the next minute boundary.
    timer = setTimeout(() => {
      cb();
      schedule();
    }, 60_000 - (Date.now() % 60_000) + 20);
  };
  schedule();
  return () => clearTimeout(timer);
};

/** Local "HH:MM", hydration-safe (server renders a placeholder). */
export function useClock() {
  return useSyncExternalStore(subscribe, format, () => "--:--");
}
