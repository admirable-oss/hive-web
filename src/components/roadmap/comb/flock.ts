import { gsap } from "@/lib/gsap";
import type { CombCell } from "./layout";

export interface Bee {
  sha: string;
  short: string;
  msg: string;
  home: CombCell;
  /** Flight from `a` to `b`, progress `p` (GSAP-driven). */
  a: CombCell | Waypoint;
  b: CombCell | Waypoint;
  p: number;
  phase: number;
  ox: number;
  oz: number;
  tl?: gsap.core.Timeline;
}

interface Waypoint {
  x: number;
  z: number;
  h: number;
}

export interface FlockCommit {
  sha: string;
  msg: string;
  dest: string;
}

/** Cell top height including any selection lift (waypoints have none). */
export const topOf = (c: CombCell | Waypoint) => c.h + ((c as CombCell).lift ?? 0);

/** Hover point above a cell, offset per bee so they don't stack. */
export const hoverPoint = (c: CombCell | Waypoint, b: Bee) => ({ x: c.x + b.ox, y: topOf(c) + 1.25, z: c.z + b.oz });

/**
 * One bee per recent commit on main. Each lives at the milestone its commit
 * belongs to, and every so often makes a round trip to the cell being built
 * (shipped work feeding the current milestone). New commits fly in from the
 * edge; the very first load arrives as a staggered swarm.
 */
export class Flock {
  bees: Bee[] = [];
  /** Pulses when a bee lands on the current cell; read by the floor and comb shaders. */
  flash = { v: 0 };
  private ready = false;

  constructor(
    private ms: CombCell[],
    private current: CombCell,
    private still: boolean,
    private radius: number,
    private onArrive?: (b: Bee) => void,
  ) {}

  sync(commits: FlockCommit[], rebuild = false) {
    const keep = new Set(commits.map((c) => c.sha));
    this.bees = this.bees.filter((b) => {
      if (!rebuild && keep.has(b.sha)) return true;
      b.tl?.kill();
      gsap.killTweensOf(b);
      return false;
    });
    const have = new Set(this.bees.map((b) => b.sha));
    const mode = rebuild && this.ready ? "quiet" : this.ready ? "fresh" : "intro";

    commits.forEach((c, i) => {
      if (have.has(c.sha)) return;
      const home = this.ms.find((m) => m.id === c.dest) ?? this.current;
      const phase = (parseInt(c.sha.slice(0, 6), 16) % 628) / 100;
      const b: Bee = { sha: c.sha, short: c.sha.slice(0, 7), msg: c.msg, home, a: home, b: home, p: 1, phase, ox: Math.cos(phase) * 0.5, oz: Math.sin(phase) * 0.5 };
      if (!this.still && mode !== "quiet") {
        const ang = mode === "intro" ? -2.4 + i * 0.22 : Math.random() * Math.PI * 2;
        b.a = { x: Math.cos(ang) * this.radius * 1.6, z: Math.sin(ang) * this.radius * 1.6, h: 4.5 };
        b.p = 0;
        gsap.to(b, {
          p: 1,
          duration: mode === "intro" ? 2.8 : 3.4,
          delay: mode === "intro" ? 1.4 + i * 0.3 : 0,
          ease: "power2.inOut",
          onComplete: () => void (b.a = b.home),
        });
        if (mode === "fresh") this.onArrive?.(b);
      }
      this.schedule(b, mode === "intro" ? 6 + i * 0.3 : 4);
      this.bees.push(b);
    });
    this.bees.sort((x, y) => commits.findIndex((c) => c.sha === x.sha) - commits.findIndex((c) => c.sha === y.sha));
    if (commits.length) this.ready = true;
  }

  private schedule(b: Bee, base: number) {
    if (this.still) return;
    const target = () => {
      if (b.home !== this.current) return this.current;
      const i = this.ms.indexOf(this.current);
      return this.ms[Math.min(this.ms.length - 1, i + 1)] ?? this.current;
    };
    b.tl = gsap
      .timeline({ repeat: -1, delay: base + Math.random() * 7, repeatDelay: 5 + Math.random() * 9 })
      .call(() => {
        b.a = b.home;
        b.b = target();
      })
      .fromTo(b, { p: 0 }, { p: 1, duration: 2.6, ease: "sine.inOut", immediateRender: false })
      .call(() => {
        if (b.b === this.current) gsap.fromTo(this.flash, { v: 1 }, { v: 0, duration: 1.6, ease: "power2.out" });
      })
      .to({}, { duration: 1.8 })
      .call(() => {
        b.a = b.b;
        b.b = b.home;
      })
      .fromTo(b, { p: 0 }, { p: 1, duration: 2.6, ease: "sine.inOut", immediateRender: false });
  }

  dispose() {
    for (const b of this.bees) {
      b.tl?.kill();
      gsap.killTweensOf(b);
    }
    gsap.killTweensOf(this.flash);
    this.bees = [];
  }
}
