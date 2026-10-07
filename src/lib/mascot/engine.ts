import type { SfxKind } from "../audio/hive-audio";
import type { HeroSignals } from "../hero-signals";
import { clamp, rnd } from "../math";
import { BEE_COLORS, drawBee, drawThought, type BeePose } from "../sprite/bee";

/* ------------------------------------------------------------------ types */

export type MascotTarget = "install" | "clone" | "docs" | "word:hive";

interface Word {
  key: string;
  el: HTMLElement;
  base: string;
  weight: number;
  fontSize: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  s: number;
  floor: number;
  rest: boolean;
  life: number;
  paint?: Word;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  life: number;
  s: number;
}

type TaskName =
  | "emerge" | "arrive" | "patrol" | "inspect" | "land" | "sprinkle"
  | "dash" | "recover" | "knock" | "rest" | "evade";

interface Task {
  name: TaskName;
  t: number;
  phase: number;
  tx?: number;
  ty?: number;
  pts?: { x: number; y: number; z: number }[];
  i?: number;
  target?: MascotTarget;
  word?: Word;
  side?: number;
  kx?: number;
  ky?: number;
  hold?: number;
  hops?: number;
  knocks?: number;
  t2?: number;
  far?: number;
}

export interface MascotOptions {
  section: HTMLElement;
  /** Behind the copy (small/far bee). */
  back: HTMLCanvasElement;
  /** In front of the copy (close bee, particles). */
  front: HTMLCanvasElement;
  signals: HeroSignals;
  sfx: (kind: SfxKind, v?: number) => void;
  /** Resolve an element the bee can inspect/land on. */
  findTarget: (key: MascotTarget) => HTMLElement | null;
  /** Elements with `data-mascot-word` that can be painted with honey. */
  findWords: () => HTMLElement[];
  /** Seconds since the page intro started (-1 before). */
  introElapsed: () => number;
  preloaded: () => boolean;
  motion: boolean;
}

/* -------------------------------------------------------------- constants */

const { honey: AM, ink: INK } = BEE_COLORS;
const DEBRIS = [AM, AM, AM, AM, AM, INK, INK, "#E8E6E0", "#9B9BA1"];

const TASKS: Partial<Record<TaskName, { w: number; cd?: number }>> = {
  patrol: { w: 3 },
  inspect: { w: 2.2, cd: 6 },
  land: { w: 1.5, cd: 14 },
  sprinkle: { w: 2, cd: 9 },
  dash: { w: 1.1, cd: 14 },
  knock: { w: 0.9, cd: 26 },
  rest: { w: 0.7, cd: 32 },
};
const INSPECT_TARGETS: MascotTarget[] = ["install", "clone", "docs", "word:hive"];

const svgWave = (fill: string, d: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='16' viewBox='0 0 120 16'><path d='${d}' fill='${fill}'/></svg>`)}")`;
const WAVE_A = svgWave("#F5B942", "M0 9 Q15 3 30 9 T60 9 T90 9 T120 9 V16 H0Z");
const WAVE_B = svgWave("#FFD58A", "M0 7 Q15 13 30 7 T60 7 T90 7 T120 7 V16 H0Z");

/* ----------------------------------------------------------------- engine */

/**
 * The hero's resident worker bee: a small steering-behaviour "brain" that
 * picks weighted tasks (patrol, inspect a CTA, land and bounce on the docs
 * button, paint a headline word with honey, dash into a wall, knock on the
 * screen…), flees the cursor, and renders pixel art to two 2D canvases
 * sandwiching the copy. Framework-free; driven by `frame(now)`.
 */
export class MascotEngine {
  private o: MascotOptions;
  private bctx: CanvasRenderingContext2D;
  private fctx: CanvasRenderingContext2D;
  private ro: ResizeObserver;

  private w = 0;
  private h = 0;
  private k = 1;
  private S0 = 12;
  private t = 0;
  private last = performance.now();
  private started = false;
  private parts: Particle[] = [];
  private rings: Ring[] = [];
  private mouse: { x: number; y: number } | null = null;
  private mx = 0;
  private my = 0;
  private task: Task = { name: "patrol", t: 0, phase: 0 };
  private lastName: TaskName | "" = "";
  private cool: Partial<Record<TaskName, number>> = {};
  private paint: Record<string, number> = {};
  private hold: Record<string, number> = {};
  private level: Record<string, number> = {};
  private emit = 0;
  private still = 0;
  private corner = 0;
  private words: Word[] = [];
  private rectCache = new Map<Element, { l: number; t: number; w: number; h: number }>();
  private sectionRect: DOMRect | null = null;
  private sitTarget: HTMLElement | null = null;

  private bee = {
    x: 0, y: 0, z: 0.05, zT: 0.6, vx: 0, vy: 0,
    daze: 0, scare: 0, flapT: 0, wing: 0,
    think: false, sit: false, hop: false, hidden: true,
    look: null as { x: number; y: number } | null,
  };

  paused = false;

  constructor(options: MascotOptions) {
    this.o = options;
    const b = options.back.getContext("2d");
    const f = options.front.getContext("2d");
    if (!b || !f) throw new Error("2D canvas unavailable");
    this.bctx = b;
    this.fctx = f;

    const s = options.section;
    s.addEventListener("pointermove", this.onMove, { passive: true });
    s.addEventListener("pointerleave", this.onLeave);
    s.addEventListener("pointerdown", this.onDown);
    s.addEventListener("pointerup", this.onUp);
    s.addEventListener("pointercancel", this.onUp);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(s);
    this.resize();
  }

  dispose() {
    const s = this.o.section;
    s.removeEventListener("pointermove", this.onMove);
    s.removeEventListener("pointerleave", this.onLeave);
    s.removeEventListener("pointerdown", this.onDown);
    s.removeEventListener("pointerup", this.onUp);
    s.removeEventListener("pointercancel", this.onUp);
    this.ro.disconnect();
    this.releaseSeat();
    for (const wd of this.words) this.clearPaint(wd.el);
  }

  /* ---------------------------------------------------------- layout */

  private resize = () => {
    const { section, back, front } = this.o;
    const w = section.clientWidth;
    const h = section.clientHeight;
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    back.width = front.width = w;
    back.height = front.height = h;
    this.k = clamp(w / 1440, 0.5, 1.15);
    this.S0 = w < 640 ? clamp(w / 34, 8.5, 13) : clamp(Math.min(w, h * 1.5) / 92, 5, 17);
    this.words = this.o.findWords().map((el) => ({
      key: el.dataset.mascotWord ?? "",
      el,
      base: el.dataset.mascotBase ?? "#8F8B82",
      weight: Number(el.dataset.mascotWeight ?? 1),
      fontSize: 0,
    }));
    if (!this.mx) {
      this.mx = w / 2;
      this.my = h / 2;
    }
    // Reduced motion has no loop: repaint the still frame on resize.
    if (!this.o.motion) this.frame(performance.now());
  };

  private core = () => ({ x: this.w * 0.5, y: this.h * 0.23 });

  /** Sprite pixel size for depth `z` (0 = deep in the hive, >1 = against the glass). */
  private sizeAt(z: number) {
    const base = this.S0;
    if (z <= 1) return base * (0.35 + 0.85 * z);
    const s1 = base * 1.2;
    const smax = this.w < 640 ? Math.max(s1 * 2, (this.w * 1.05) / 16) : Math.max(s1, (this.w * 0.44) / 16);
    return s1 + (smax - s1) * clamp((z - 1) / 1.5, 0, 1);
  }

  private bounds(S: number) {
    const hw = 8 * S;
    const hh = 6.5 * S;
    const pad = this.w < 640 ? 6 : 20;
    let x0 = hw + pad;
    let x1 = this.w - hw - pad;
    let y0 = (this.w < 640 ? 70 : 84) + hh;
    let y1 = this.h - 24 - hh;
    if (x0 > x1) x0 = x1 = this.w / 2;
    if (y0 > y1) y0 = y1 = this.h / 2;
    return { x0, x1, y0, y1, hw, hh };
  }

  /** Element rect relative to the hero section, cached per frame. */
  private rel(el: Element | null | undefined) {
    if (!el) return null;
    let r = this.rectCache.get(el);
    if (!r) {
      const s = (this.sectionRect ??= this.o.section.getBoundingClientRect());
      const b = el.getBoundingClientRect();
      r = { l: b.left - s.left, t: b.top - s.top, w: b.width, h: b.height };
      this.rectCache.set(el, r);
    }
    return r;
  }

  private floorY = () => this.h - 14 - Math.random() * 46;

  private burst(x: number, y: number, nx: number, ny: number, speed: number, S: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(ny, nx) + rnd(-1.25, 1.25);
      const v = rnd(120, 160 + speed * 0.9);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 120,
        c: DEBRIS[(Math.random() * DEBRIS.length) | 0],
        s: Math.max(3, Math.round(S * (Math.random() < 0.65 ? 1 : 0.5))),
        floor: this.floorY(),
        rest: false,
        life: 0,
      });
    }
  }

  private setSeat(el: HTMLElement | null, y: number) {
    if (el) el.style.transform = `translateY(${y}px)`;
  }

  private releaseSeat() {
    if (this.sitTarget) this.sitTarget.style.transform = "";
    this.sitTarget = null;
  }

  /* ----------------------------------------------------------- brain */

  private pick(): TaskName {
    const opts = (Object.keys(TASKS) as TaskName[]).filter(
      (n) => n !== this.lastName && !((this.cool[n] ?? 0) > this.t),
    );
    const total = opts.reduce((a, n) => a + TASKS[n]!.w, 0);
    let r = Math.random() * total;
    return opts.find((n) => (r -= TASKS[n]!.w) < 0) ?? "patrol";
  }

  private start(name: TaskName): void {
    const b = this.bee;
    if (b.sit) {
      b.sit = false;
      this.releaseSeat();
    }
    b.think = false;
    b.look = null;
    b.hop = false;
    const def = TASKS[name];
    if (def) {
      this.lastName = name;
      if (def.cd) this.cool[name] = this.t + def.cd;
    }
    const tk: Task = { name, t: 0, phase: 0 };
    const c = this.core();
    const { w, h } = this;

    switch (name) {
      case "emerge":
        Object.assign(b, { hidden: false, x: c.x, y: c.y, z: 0.04, zT: 0.62, vx: rnd(-60, 60), vy: -60 });
        tk.tx = w * (Math.random() < 0.5 ? 0.27 : 0.73);
        tk.ty = h * 0.3;
        this.o.signals.pulse = 1;
        this.o.sfx("hum");
        break;
      case "arrive":
        Object.assign(b, { hidden: false, z: 0.75, zT: 0.62, x: w * 0.5, y: -8 * this.sizeAt(0.75), vx: 0, vy: 380 * this.k });
        tk.tx = w * 0.5;
        tk.ty = h * (w < 640 ? 0.3 : 0.34);
        break;
      case "patrol": {
        const cy = h * 0.46;
        const a0 = Math.atan2(b.y - cy, (b.x - w * 0.5) / 1.6);
        const dir = Math.random() < 0.5 ? 1 : -1;
        tk.pts = [1, 2, 3].map((i) => {
          const a = a0 + dir * i * rnd(0.9, 1.4);
          return { x: w * 0.5 + Math.cos(a) * w * 0.34, y: cy + Math.sin(a) * h * 0.25, z: rnd(0.3, 0.85) };
        });
        tk.i = 0;
        break;
      }
      case "inspect":
        tk.target = INSPECT_TARGETS[(Math.random() * INSPECT_TARGETS.length) | 0];
        break;
      case "sprinkle": {
        if (!this.words.length) return this.start("patrol");
        const total = this.words.reduce((a, wd) => a + wd.weight, 0);
        let r = Math.random() * total;
        tk.word = this.words.find((wd) => (r -= wd.weight) < 0) ?? this.words[0];
        break;
      }
      case "dash":
        tk.side = b.x < w / 2 ? 1 : -1;
        if (Math.random() < 0.3) tk.side *= -1;
        tk.ty = clamp(b.y, h * 0.32, h * 0.6);
        break;
      case "recover":
        tk.tx = w * rnd(0.4, 0.6);
        tk.ty = h * rnd(0.34, 0.46);
        break;
      case "knock":
        tk.kx = w * rnd(0.38, 0.62);
        tk.ky = h * rnd(0.4, 0.5);
        break;
    }
    this.task = tk;
    this.still = 0;
    this.corner = 0;
  }

  /* ----------------------------------------------------------- input */

  private onMove = (e: PointerEvent) => {
    const r = this.o.section.getBoundingClientRect();
    this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  private onLeave = () => {
    this.mouse = null;
  };
  private onUp = (e: PointerEvent) => {
    // Touch has no hover: forget the finger once it lifts.
    if (e.pointerType && e.pointerType !== "mouse") this.mouse = null;
  };
  private onDown = (e: PointerEvent) => {
    const b = this.bee;
    if (b.hidden) return;
    const r = this.o.section.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const S = this.sizeAt(b.z);
    if (Math.abs(mx - b.x) < 9 * S && Math.abs(my - b.y) < 8 * S) {
      const dx = b.x - mx || 1;
      const dy = b.y - my || -1;
      const d = Math.hypot(dx, dy);
      this.start("evade");
      b.vx = (dx / d) * 1000 * this.k;
      b.vy = (dy / d) * 1000 * this.k;
      b.scare = 1.4;
      this.burst(b.x, b.y, dx / d, dy / d, 300, S, 22);
      this.o.sfx("tik");
    }
  };

  /* ---------------------------------------------------------- render */

  private drawBee(ctx: CanvasRenderingContext2D, cx: number, cy: number, S: number, alpha: number) {
    const b = this.bee;
    const step = b.daze > 0 || b.sit ? 0 : ((b.flapT * 10) | 0) % 2;
    let ex = 0;
    let ey = 0;
    if (b.look) {
      ex = Math.abs(b.look.x - cx) > 24 ? Math.sign(b.look.x - cx) : 0;
      ey = b.look.y < cy - 60 ? -1 : 0;
    } else if (this.task.name !== "knock" && !b.sit) {
      ex = Math.abs(b.vx) > 60 ? Math.sign(b.vx) : 0;
      ey = b.vy < -140 ? -1 : 0;
    }
    if (b.think) ey = -1;
    const blink = this.t % 3.4 < 0.12;
    const pose: BeePose = {
      wingDown: !!b.wing,
      tip: b.think ? BEE_COLORS.violet : undefined,
      leg: step,
      arm: b.daze > 0 ? 1 : b.sit ? 0 : -step,
      ex,
      ey,
      eyes: b.daze > 0 || blink ? "shut" : b.scare > 0.25 ? "wide" : "open",
    };
    ctx.globalAlpha = alpha;
    drawBee(ctx, cx, cy, S, pose);
    if (b.think) drawThought(ctx, cx, cy, S, Math.floor(this.task.t * 3) % 4);
    ctx.globalAlpha = 1;
  }

  private clearPaint(el: HTMLElement) {
    if (!el.style.backgroundImage) return;
    el.style.backgroundImage = "";
    el.style.color = "";
    el.style.backgroundClip = "";
    el.style.webkitBackgroundClip = "";
  }

  /** Honey "fill level" rendered as a wavy background-clip:text gradient. */
  private applyPaint(dt: number) {
    for (const wd of this.words) {
      let p = this.paint[wd.key] ?? 0;
      if ((this.hold[wd.key] ?? 0) > 0) this.hold[wd.key] -= dt;
      else p = Math.max(0, p - dt * 0.07);
      this.paint[wd.key] = p;
      const v0 = this.level[wd.key] ?? 0;
      const v = v0 + (p - v0) * Math.min(1, dt * 2.6);
      this.level[wd.key] = v;
      const el = wd.el;
      if (v < 0.004) {
        this.clearPaint(el);
        continue;
      }
      if (!wd.fontSize) wd.fontSize = parseFloat(getComputedStyle(el).fontSize) || 100;
      const H = el.offsetHeight || wd.fontSize;
      const lvl = Math.min(1.1, v * 1.1);
      const surf = H * (1 - lvl);
      const wh = Math.max(8, wd.fontSize * 0.12);
      const ww = wh * 7.5;
      const ph = this.t * 46;
      const pc = (lvl * 100).toFixed(2);
      el.style.backgroundImage = `${WAVE_A}, ${WAVE_B}, linear-gradient(0deg, #DE9C30 0%, #F5B942 ${pc}%, ${wd.base} ${pc}%)`;
      el.style.backgroundSize = `${ww}px ${wh}px, ${ww * 1.3}px ${wh}px, 100% 100%`;
      el.style.backgroundPosition = `${ph}px ${surf - wh + 1}px, ${-ph * 0.7}px ${surf - wh + 2}px, 0 0`;
      el.style.backgroundRepeat = "repeat-x, repeat-x, no-repeat";
      el.style.webkitBackgroundClip = "text";
      el.style.backgroundClip = "text";
      el.style.color = "transparent";
    }
  }

  /* ------------------------------------------------------------ loop */

  frame(now: number) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const { w, h, bee: b, bctx: bc, fctx: fc, o } = this;
    const sig = o.signals;
    if (!w || this.paused) return;

    this.rectCache.clear();
    this.sectionRect = null;
    bc.clearRect(0, 0, w, h);
    fc.clearRect(0, 0, w, h);

    if (this.mouse) {
      this.mx += (this.mouse.x - this.mx) * Math.min(1, dt * 3);
      this.my += (this.mouse.y - this.my) * Math.min(1, dt * 3);
    }
    sig.mx = this.mx / w;
    sig.my = 1 - this.my / h;

    if (!o.motion) {
      // Reduced motion: a single still bee and a static terrain.
      sig.t = 4;
      sig.intro = 1;
      b.hidden = false;
      b.z = 0.6;
      this.drawBee(bc, w * 0.2, h * 0.3, this.sizeAt(0.6), 1);
      return;
    }

    this.t += dt;
    sig.t = this.t;
    sig.pulse = Math.max(0, sig.pulse - dt * 0.7);
    const ia = o.introElapsed();
    sig.intro = clamp(ia / 2.4, 0, 1);

    if (!this.started) {
      const pre = o.preloaded();
      if (ia > (pre ? 1.05 : 1.3)) {
        this.started = true;
        this.start(pre ? "arrive" : "emerge");
      } else return;
    }

    const tk = this.task;
    tk.t += dt;
    let S = this.sizeAt(b.z);
    let B = this.bounds(S);
    let tx = b.x;
    let ty = b.y;
    let maxV = 260 * this.k;
    let slow = 160 * this.k;
    let avoid = true;
    let seekOn = true;
    let gain = 4;
    const k = this.k;

    switch (tk.name) {
      case "emerge":
        tx = tk.tx!;
        ty = tk.ty!;
        maxV = 240 * k;
        avoid = b.z > 0.4;
        if ((tk.t > 0.6 && Math.hypot(tx - b.x, ty - b.y) < 90) || tk.t > 5) this.start("patrol");
        break;

      case "arrive":
        tx = tk.tx!;
        ty = tk.ty!;
        maxV = 560 * k;
        slow = 280 * k;
        avoid = false;
        if (Math.hypot(tx - b.x, ty - b.y) < 40) {
          tk.hold = (tk.hold ?? 0) + dt;
          if (tk.hold > 0.7) this.start("patrol");
        }
        if (tk.t > 5) this.start("patrol");
        break;

      case "patrol": {
        const p = tk.pts![tk.i!];
        tx = p.x;
        ty = p.y;
        b.zT = p.z;
        maxV = 300 * k;
        slow = 60;
        if (Math.hypot(tx - b.x, ty - b.y) < 90) {
          tk.i!++;
          if (tk.i! >= tk.pts!.length) this.start(this.pick());
        }
        if (tk.t > 12) this.start(this.pick());
        break;
      }

      case "inspect": {
        const r = this.rel(o.findTarget(tk.target!));
        if (!r) {
          this.start("patrol");
          break;
        }
        const side = r.l + r.w / 2 > w * 0.55 ? -1 : 1;
        tx = r.l + r.w / 2 + side * (r.w / 2 + B.hw * 0.55 + 28);
        ty = r.t + r.h / 2 - S * 1.5;
        b.zT = 0.62;
        b.look = { x: r.l + r.w / 2, y: r.t + r.h / 2 };
        maxV = 280 * k;
        slow = 200 * k;
        const d = Math.hypot(clamp(tx, B.x0 + 30, B.x1 - 30) - b.x, clamp(ty, B.y0 + 30, B.y1 - 30) - b.y);
        if (d < 28) {
          tk.hold = (tk.hold ?? 0) + dt;
          if (tk.hold > 1.9) this.start(this.pick());
        }
        if (tk.t > 7) this.start(this.pick());
        break;
      }

      case "land": {
        const seat = o.findTarget("docs");
        const r = this.rel(seat);
        if (!r) {
          this.start("patrol");
          break;
        }
        b.zT = 0.6;
        tx = r.l + r.w * 0.5;
        ty = r.t - 6.5 * S + S * 0.6;
        maxV = 300 * k;
        slow = 220 * k;
        avoid = false;
        if (tk.phase === 0) {
          if (Math.hypot(tx - b.x, ty - b.y) < 6 && Math.hypot(b.vx, b.vy) < 80 && Math.abs(b.z - 0.6) < 0.05) {
            tk.phase = 1;
            tk.t = 0;
            b.sit = true;
            b.think = false;
            b.hop = true;
            this.sitTarget = seat;
            this.setSeat(seat, 3);
            o.sfx("tik", 1.4);
          }
          if (tk.t > 7) this.start(this.pick());
        } else {
          seekOn = false;
          b.vx = b.vy = 0;
          b.x = tx;
          const HOP = 0.34;
          const NH = 3;
          if (tk.t < HOP * NH) {
            const i = Math.floor(tk.t / HOP);
            const f = (tk.t % HOP) / HOP;
            b.hop = true;
            b.think = false;
            b.y = ty - Math.sin(f * Math.PI) * S * (3.4 - i * 0.9);
            if ((tk.hops ?? 0) <= i && f > 0.88) {
              tk.hops = i + 1;
              o.sfx("tik", 1.2);
              this.setSeat(seat, 6);
              setTimeout(() => b.sit && this.setSeat(seat, 2), 90);
              for (let j = 0; j < 6; j++) {
                this.parts.push({
                  x: b.x + rnd(-6, 6) * S, y: ty + 6 * S,
                  vx: rnd(-160, 160), vy: rnd(-260, -120),
                  c: Math.random() < 0.7 ? AM : "#EDEAE3",
                  s: Math.max(2, Math.round(S * 0.4)),
                  floor: this.floorY(), rest: false, life: 0,
                });
              }
            }
          } else if (tk.t < HOP * NH + 2.6) {
            b.hop = false;
            b.y = ty;
            b.think = true;
          } else if (tk.t < HOP * NH + 2.9) {
            b.think = false;
            b.y = ty + S * 0.8;
            this.setSeat(seat, 7);
          } else {
            this.start("patrol");
            b.y = ty - S;
            b.vy = -760 * k;
            b.vx = rnd(-220, 220);
            b.scare = 0.6;
            o.sfx("tik", 1.6);
            this.burst(b.x, ty + 6 * S, 0, 1, 260, S, 14);
          }
        }
        break;
      }

      case "sprinkle": {
        const word = tk.word!;
        const r = this.rel(word.el);
        if (!r) {
          this.start("patrol");
          break;
        }
        b.zT = 0.64;
        avoid = false;
        maxV = 320 * k;
        slow = 140 * k;
        tx = r.l + r.w * (0.5 + 0.4 * Math.sin(tk.t * 1.8));
        ty = r.t - 6.5 * S - 26 + Math.sin(tk.t * 4) * 5;
        if (tk.phase === 0 && Math.hypot(tx - b.x, ty - b.y) < 60) {
          tk.phase = 1;
          tk.t2 = 0;
        }
        if (tk.phase === 1) {
          tk.t2! += dt;
          this.emit -= dt;
          while (this.emit < 0) {
            this.emit += 0.022;
            this.parts.push({
              x: b.x + rnd(-3, 3) * S, y: b.y + 5 * S,
              vx: rnd(-40, 40) + b.vx * 0.3, vy: rnd(40, 140),
              c: Math.random() < 0.85 ? AM : "#FFD27A",
              s: Math.max(3, Math.round(S * rnd(0.35, 0.7))),
              paint: word, floor: this.floorY(), rest: false, life: 0,
            });
          }
          if (tk.t2! > 2.8) this.start("patrol");
        }
        if (tk.t > 8) this.start("patrol");
        break;
      }

      case "dash":
        avoid = false;
        maxV = 1150 * k;
        gain = 3;
        slow = 1;
        b.zT = 0.7;
        tx = tk.side! > 0 ? w + 600 : -600;
        ty = tk.ty!;
        if ((tk.side! > 0 && b.x >= B.x1) || (tk.side! < 0 && b.x <= B.x0)) {
          const speed = Math.abs(b.vx);
          const wx = tk.side! > 0 ? w - 2 : 2;
          b.x = tk.side! > 0 ? B.x1 - 6 : B.x0 + 6;
          this.burst(wx, b.y, -tk.side!, 0, speed, S, Math.min(56, 16 + Math.floor(speed / 16)));
          b.vx = -tk.side! * speed * 0.25;
          b.vy *= 0.3;
          b.daze = 0.9;
          sig.ripple = [wx / w, 1 - b.y / h, this.t];
          o.sfx("thud", clamp(speed / 900, 0.3, 1));
          this.start("recover");
        } else if (tk.t > 3.5) this.start("recover");
        break;

      case "recover":
        tx = tk.tx!;
        ty = tk.ty!;
        maxV = 170 * k;
        b.zT = 0.55;
        if ((tk.t > 1.2 && Math.hypot(tx - b.x, ty - b.y) < 60) || tk.t > 6) this.start(this.pick());
        break;

      case "knock":
        avoid = false;
        if (tk.phase === 0) {
          tx = tk.kx!;
          ty = tk.ky!;
          maxV = 380 * k;
          b.zT = 2.5;
          if (b.z > 2.36) {
            tk.phase = 1;
            tk.t = 0;
          }
          if (tk.t > 6) {
            tk.phase = 2;
            tk.t = 0;
          }
        } else if (tk.phase === 1) {
          seekOn = false;
          b.vx *= 1 - dt * 6;
          b.vy *= 1 - dt * 6;
          const cyc = 0.34;
          const i = Math.floor(tk.t / cyc);
          const f = (tk.t % cyc) / cyc;
          if (i < 3) {
            b.zT = b.z = 2.42 + 0.18 * Math.sin(f * Math.PI);
            if ((tk.knocks ?? 0) <= i && f > 0.45) {
              tk.knocks = i + 1;
              o.sfx("knock");
              this.rings.push({ x: b.x + rnd(-1, 1) * S, y: b.y - S, r: 0, life: 0.7, s: Math.max(3, Math.round(S * 0.18)) });
            }
          } else if (tk.t > 3 * cyc + 0.6) {
            tk.phase = 2;
            tk.t = 0;
          }
        } else {
          tx = tk.kx!;
          ty = h * 0.4;
          b.zT = 0.45;
          maxV = 220 * k;
          if (b.z < 0.8) this.start("patrol");
        }
        break;

      case "rest": {
        const c = this.core();
        tx = c.x;
        ty = c.y;
        b.zT = 0.06;
        maxV = 260 * k;
        slow = 200 * k;
        avoid = false;
        if (tk.phase === 0 && b.z < 0.14 && Math.hypot(tx - b.x, ty - b.y) < 30) {
          tk.phase = 1;
          tk.t = 0;
          b.hidden = true;
          sig.pulse = 1;
          o.sfx("hum", 0.7);
        }
        if (tk.phase === 1) {
          b.x = tx;
          b.y = ty;
          b.vx = b.vy = 0;
          seekOn = false;
          if (tk.t > 1.8) this.start("emerge");
        }
        if (tk.phase === 0 && tk.t > 9) this.start("patrol");
        break;
      }

      case "evade":
        seekOn = false;
        b.zT = 0.28;
        maxV = 900 * k;
        break;
    }

    /* ---- steering */
    const cur = this.task;
    S = this.sizeAt(b.z);
    B = this.bounds(S);
    if (avoid && b.z <= 1.05) {
      tx = clamp(tx, B.x0 + 30, B.x1 - 30);
      ty = clamp(ty, B.y0 + 30, B.y1 - 30);
    }
    let ax = 0;
    let ay = 0;
    let near = false;
    if (this.mouse && !b.hidden && b.daze <= 0 && !(cur.name === "rest" && b.z < 0.2)) {
      const dx = b.x - this.mouse.x;
      const dy = b.y - this.mouse.y;
      const d = Math.hypot(dx, dy) || 1;
      const R = Math.max(160, B.hw * 1.5);
      if (d < R) {
        near = true;
        if (cur.name !== "evade") this.start("evade");
        const f = 1 - d / R;
        ax += (dx / d) * f * 7000 * k;
        ay += (dy / d) * f * 7000 * k;
        b.scare = 1;
      }
    }
    if (this.task.name === "evade") {
      const e = this.task;
      if (!near) {
        e.far = (e.far ?? 0) + dt;
        if (e.far > 0.8) this.start(this.pick());
      } else e.far = 0;
    }
    if (seekOn && this.task.name !== "evade" && !b.hidden) {
      const dx = tx - b.x;
      const dy = ty - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = d < slow ? maxV * (d / slow) : maxV;
      ax += ((dx / d) * v - b.vx) * gain;
      ay += ((dy / d) * v - b.vy) * gain;
    }
    if (b.z <= 1.05 && !b.sit && this.task.name !== "dash") {
      // Soft walls.
      const m = Math.max(110 * k, B.hw * 0.8);
      const W = 3200 * k;
      const dl = b.x - B.x0;
      const dr = B.x1 - b.x;
      const du = b.y - B.y0;
      const dd = B.y1 - b.y;
      if (dl < m) ax += W * Math.pow(1 - Math.max(0, dl) / m, 2);
      if (dr < m) ax -= W * Math.pow(1 - Math.max(0, dr) / m, 2);
      if (du < m) ay += W * Math.pow(1 - Math.max(0, du) / m, 2);
      if (dd < m) ay -= W * Math.pow(1 - Math.max(0, dd) / m, 2);
    }
    if (!b.sit && !b.hidden) {
      // Idle wobble.
      ax += Math.sin(this.t * 1.7 + 1.3) * 70 * k;
      ay += Math.cos(this.t * 2.3) * 55 * k;
    }
    if (b.daze > 0) {
      b.daze -= dt;
      ax = -b.vx * 3;
      ay = 420 - b.vy * 1.5;
    }
    const am = Math.hypot(ax, ay);
    const AMX = (this.task.name === "dash" || this.task.name === "evade" ? 5600 : 2400) * k;
    if (am > AMX) {
      ax *= AMX / am;
      ay *= AMX / am;
    }
    if (!b.sit && !b.hidden) {
      b.vx += ax * dt;
      b.vy += ay * dt;
      const sp = Math.hypot(b.vx, b.vy);
      const cap = Math.max(maxV, 300 * k) * 1.15;
      if (sp > cap) {
        b.vx *= cap / sp;
        b.vy *= cap / sp;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    if (this.task.name !== "knock" || this.task.phase !== 1) {
      b.z += (b.zT - b.z) * Math.min(1, dt * (this.task.name === "knock" ? 1.8 : 1.4));
    }
    b.scare = Math.max(0, b.scare - dt * 0.6);
    S = this.sizeAt(b.z);
    B = this.bounds(S);
    if (b.z <= 1.05 && !b.sit && !b.hidden) {
      if (this.task.name !== "dash") {
        if (b.x < B.x0) {
          b.x = B.x0;
          if (b.vx < 0) b.vx *= -0.2;
        }
        if (b.x > B.x1) {
          b.x = B.x1;
          if (b.vx > 0) b.vx *= -0.2;
        }
      }
      if (b.y < B.y0 && this.task.name !== "arrive") {
        b.y = B.y0;
        if (b.vy < 0) b.vy *= -0.2;
      }
      if (b.y > B.y1) {
        b.y = B.y1;
        if (b.vy > 0) b.vy *= -0.2;
      }
    }
    if (![b.x, b.y, b.z, b.vx, b.vy].every(Number.isFinite)) {
      Object.assign(b, { x: w * 0.5, y: h * 0.4, z: 0.5, vx: 120, vy: 0, daze: 0 });
      this.start("patrol");
      S = this.sizeAt(b.z);
      B = this.bounds(S);
    }

    /* ---- anti-stuck */
    const moving = !b.sit && !b.hidden && !["knock", "evade", "inspect"].includes(this.task.name) && b.daze <= 0;
    if (moving && Math.hypot(b.vx, b.vy) < 30 && Math.hypot(tx - b.x, ty - b.y) > 50) {
      this.still += dt;
      if (this.still > 1.2) this.start("recover");
    } else this.still = 0;
    const inCorner = (b.x < B.x0 + 70 || b.x > B.x1 - 70) && (b.y < B.y0 + 70 || b.y > B.y1 - 70);
    this.corner = inCorner && !b.sit && !b.hidden && this.task.name !== "dash" ? this.corner + dt : 0;
    if (this.corner > 1.3) this.start("recover");

    /* ---- wings */
    b.flapT += dt;
    b.wing =
      b.sit && !b.hop
        ? Math.floor(this.t * 2) % 5 === 0 ? 1 : 0
        : Math.floor(b.flapT * (b.scare > 0 || this.task.name === "dash" ? 26 : 12 + Math.hypot(b.vx, b.vy) / 80)) % 2;

    /* ---- particles */
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (!p.rest) {
        p.vy += 1700 * dt;
        p.vx *= 1 - dt * 0.4;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx) * 0.4;
        }
        if (p.x > w - p.s) {
          p.x = w - p.s;
          p.vx = -Math.abs(p.vx) * 0.4;
        }
        if (p.paint) {
          const r = this.rel(p.paint.el);
          if (r && p.x > r.l - 2 && p.x < r.l + r.w + 2 && p.y > r.t + r.h * 0.22 && p.y < r.t + r.h) {
            const key = p.paint.key;
            this.paint[key] = Math.min(1, (this.paint[key] ?? 0) + 0.03);
            this.hold[key] = 4.5;
            o.sfx("blip");
            this.parts.splice(i, 1);
            continue;
          }
        }
        if (p.y >= p.floor) {
          p.y = p.floor;
          if (Math.abs(p.vy) > 260) {
            p.vy = -Math.abs(p.vy) * 0.32;
            p.vx *= 0.6;
          } else {
            p.rest = true;
            p.vy = 0;
            p.life = rnd(2.6, 5);
          }
        }
      } else {
        p.vx *= 1 - dt * 6;
        p.x += p.vx * dt;
        p.life -= dt;
        if (p.life <= 0) {
          this.parts.splice(i, 1);
          continue;
        }
      }
      const depth = clamp((p.floor - (h - 60)) / 46, 0, 1);
      const sz = p.rest ? Math.max(2, Math.round(p.s * (0.55 + 0.45 * depth))) : p.s;
      const a = p.rest && p.life < 1 ? Math.floor(p.life * 4) / 4 : 1;
      if (a <= 0) continue;
      fc.globalAlpha = a;
      fc.fillStyle = p.c;
      fc.fillRect(Math.round(p.x), Math.round(p.y), sz, sz);
    }
    fc.globalAlpha = 1;
    if (this.parts.length > 900) this.parts.splice(0, this.parts.length - 900);

    /* ---- knock rings */
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const g = this.rings[i];
      g.life -= dt;
      g.r += dt * 420 * k;
      if (g.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      const a = g.life / 0.7;
      fc.fillStyle = `rgba(237,234,227,${(0.5 * a).toFixed(3)})`;
      for (let j = 0; j < 28; j++) {
        const ang = (j / 28) * Math.PI * 2;
        fc.fillRect(Math.round(g.x + Math.cos(ang) * g.r), Math.round(g.y + Math.sin(ang) * g.r * 0.9), g.s, g.s);
      }
      const R = 90 * k;
      const sm = fc.createRadialGradient(g.x, g.y, 0, g.x, g.y, R);
      sm.addColorStop(0, `rgba(237,234,227,${(0.12 * a).toFixed(3)})`);
      sm.addColorStop(1, "rgba(237,234,227,0)");
      fc.fillStyle = sm;
      fc.fillRect(g.x - R, g.y - R, R * 2, R * 2);
    }

    this.applyPaint(dt);

    /* ---- bee + glow */
    if (!b.hidden) {
      const gz = clamp(b.z, 0, 1);
      const gr = 12 * S;
      const glow = bc.createRadialGradient(b.x, b.y, 0, b.x, b.y, gr);
      glow.addColorStop(0, `rgba(245,185,66,${(0.04 + 0.05 * gz).toFixed(3)})`);
      glow.addColorStop(1, "rgba(245,185,66,0)");
      bc.fillStyle = glow;
      bc.fillRect(b.x - gr, b.y - gr, gr * 2, gr * 2);
      const jx = b.daze > 0.3 ? (Math.random() < 0.5 ? -1 : 1) * Math.max(2, S * 0.3) : 0;
      const alpha = b.z < 0.45 ? 0.35 + b.z * 1.45 : 1;
      const tn = this.task.name;
      const front = b.z >= 0.58 || b.sit || tn === "land" || tn === "sprinkle";
      this.drawBee(front ? fc : bc, b.x + jx, b.y, S, alpha);
    }
  }
}
