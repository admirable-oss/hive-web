/**
 * Mutable per-frame values shared between the mascot engine (writer) and the
 * honeycomb shader (reader). Plain object on purpose: no React re-renders.
 */
export interface HeroSignals {
  /** Hero clock in seconds (drives shader time + ripple ages). */
  t: number;
  /** Smoothed pointer, normalised 0..1, y up. */
  mx: number;
  my: number;
  /** Shockwave: x, y (0..1, y up) and start time; z < -5 means none. */
  ripple: [number, number, number];
  /** Hive "hum" pulse 0..1 when a worker leaves/enters. */
  pulse: number;
  /** Intro fade 0..1. */
  intro: number;
}

export const createHeroSignals = (): HeroSignals => ({
  t: 0,
  mx: 0.5,
  my: 0.5,
  ripple: [0, 0, -10],
  pulse: 0,
  intro: 0,
});
