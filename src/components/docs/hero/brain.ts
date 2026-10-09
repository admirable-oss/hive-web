import { clamp, rnd } from "@/lib/math";
import type { BeePose } from "@/lib/sprite/bee";
import { BEE_COLORS } from "@/lib/sprite/bee";
import { cellAt, type Cell } from "./comb";

/** Per-cell state, read by the comb shader. */
export const CELL = { idle: 0, queued: 1, working: 2, hover: 3 } as const;

export type Mode = "think" | "fly" | "work" | "celebrate" | "patrol" | "curious" | "evade" | "nap";

export type BeeEvent =
  | { kind: "ripple"; x: number; z: number; strength: number }
  | { kind: "spark"; x: number; y: number; z: number; vx: number; vy: number; vz: number };

interface Job {
  cell: number;
  at: number;
  urgent: boolean;
}

export interface BeeStatus {
  mode: Mode;
  label: string;
  progress: number;
  queued: number;
  built: number;
}

const HOVER = 1.1;
const CRUISE = 1.9;
/** The bee keeps to the bright middle of the comb. */
const RANGE = 5;
const MAX_JOBS = 4;
const MAX_SPEED = 4.2;
const MAX_FORCE = 14;
const WORK_TIME = 2.6;
/** How long a filled cell keeps its honey before draining for the next round. */
const HOLD: [number, number] = [18, 30];

type V3 = { x: number; y: number; z: number };

/**
 * The docs hero's worker bee. A tiny utility brain over a steering body:
 * it thinks (antennae go violet), weighs the job queue by urgency, age and
 * distance, flies over and fills the cell with honey, celebrates, sometimes
 * patrols or naps on finished comb, gets curious about the cursor — and darts
 * away if it comes too close, unless it is busy working. Taps queue urgent
 * work. Framework-free; the scene calls `step(dt)` and reads the outputs.
 */
export class BeeBrain {
  readonly fill: Float32Array;
  readonly state: Float32Array;
  readonly events: BeeEvent[] = [];
  readonly pos: V3 = { x: 7, y: 2.6, z: -3 };
  readonly pose: Required<Pick<BeePose, "wingDown" | "eyes" | "ex" | "ey">> & { tip: string; dots: number } = {
    wingDown: false,
    eyes: "open",
    ex: 0,
    ey: 0,
    tip: BEE_COLORS.honey,
    dots: 0,
  };

  /** Ground point under the cursor, set by the scene. */
  pointer: { x: number; z: number } | null = null;
  t = 0;

  private vel: V3 = { x: -2, y: 0, z: 0 };
  private target: V3 = { x: 0, y: CRUISE, z: 0 };
  private mode: Mode = "patrol";
  private modeT = 0;
  private modeDur = 0;
  private job: Job | null = null;
  private napping = false;
  private jobs: Job[] = [];
  private filledAt: Float32Array;
  private hold: Float32Array;
  private built = 0;
  private nextSpawn = 0.6;
  private nextBlink = 2;
  private blinkUntil = 0;
  private wingT = 0;
  private sparkT = 0;
  private evadeCool = 0;
  private curiousCool = 0;

  constructor(private cells: Cell[]) {
    this.fill = new Float32Array(cells.length);
    this.state = new Float32Array(cells.length);
    this.filledAt = new Float32Array(cells.length);
    this.hold = new Float32Array(cells.length).map(() => rnd(...HOLD));
    // Some finished comb from earlier shifts, so the hive never starts empty.
    for (let i = 0; i < 5; i++) {
      const c = this.freeCell();
      if (c < 0) break;
      this.fill[c] = 1;
      this.filledAt[c] = rnd(-HOLD[0], 0);
    }
    this.target = { x: rnd(-2, 2), y: CRUISE, z: rnd(-1, 2) };
  }

  /** A still frame for reduced motion: the bee hovering over a freshly filled cell. */
  pose0() {
    const i = Math.max(0, this.freeCell());
    const c = this.cells[i];
    this.fill[i] = 1;
    Object.assign(this.pos, { x: c.x, y: HOVER, z: c.z });
  }

  /** Cursor tap on the comb: an urgent job (and a ripple) at that cell. */
  tap(x: number, z: number) {
    const c = cellAt(this.cells, x, z);
    if (c < 0) return;
    this.events.push({ kind: "ripple", x: this.cells[c].x, z: this.cells[c].z, strength: 0.7 });
    if (this.isFree(c) && Math.hypot(this.cells[c].x, this.cells[c].z) <= RANGE + 1) {
      this.jobs.unshift({ cell: c, at: this.t, urgent: true });
      if (this.jobs.length > MAX_JOBS + 2) this.jobs.pop();
      // Drop whatever it was idly doing; a job in hand goes back to the queue.
      if (["think", "patrol", "fly", "curious", "nap"].includes(this.mode)) this.decide();
    }
  }

  status(): BeeStatus {
    const cell = this.job ? this.cells[this.job.cell].label : "";
    const labels: Record<Mode, string> = {
      think: "thinking",
      fly: this.napping ? "heading home" : `flying → cell ${cell}`,
      work: `building cell ${cell}`,
      celebrate: `◆ cell ${cell} done`,
      patrol: "patrolling",
      curious: "curious",
      evade: "evading",
      nap: "napping",
    };
    return {
      mode: this.mode,
      label: labels[this.mode],
      progress: this.mode === "work" ? clamp(this.modeT / WORK_TIME, 0, 1) : this.mode === "celebrate" ? 1 : 0,
      queued: this.jobs.length,
      built: this.built,
    };
  }

  step(dt: number) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    this.modeT += dt;
    this.spawnJobs();
    this.drainHoney(dt);
    this.watchPointer();
    this.think();
    this.move(dt);
    this.writeCells();
    this.writePose(dt);
  }

  /* --------------------------------------------------------------- world */

  private isFree(c: number) {
    return this.fill[c] === 0 && this.job?.cell !== c && !this.jobs.some((j) => j.cell === c);
  }

  private freeCell() {
    for (let tries = 0; tries < 40; tries++) {
      const c = Math.floor(Math.random() * this.cells.length);
      if (this.cells[c].d <= RANGE && this.isFree(c)) return c;
    }
    return -1;
  }

  private spawnJobs() {
    if (this.t < this.nextSpawn) return;
    this.nextSpawn = this.t + rnd(2.2, 4.6);
    if (this.jobs.length >= MAX_JOBS) return;
    const c = this.freeCell();
    if (c >= 0) this.jobs.push({ cell: c, at: this.t, urgent: false });
  }

  private drainHoney(dt: number) {
    for (let i = 0; i < this.fill.length; i++) {
      if (this.fill[i] < 1 && this.filledAt[i] === 0) continue;
      if (this.filledAt[i] !== 0 && this.t - this.filledAt[i] > this.hold[i]) {
        this.fill[i] = Math.max(0, this.fill[i] - dt * 0.35);
        if (this.fill[i] === 0) this.filledAt[i] = 0;
      }
    }
  }

  private writeCells() {
    const s = this.state;
    s.fill(CELL.idle);
    const hover = this.pointer ? cellAt(this.cells, this.pointer.x, this.pointer.z) : -1;
    if (hover >= 0) s[hover] = CELL.hover;
    for (const j of this.jobs) s[j.cell] = CELL.queued;
    if (this.job && !this.napping) s[this.job.cell] = this.mode === "work" ? CELL.working : CELL.queued;
  }

  /* --------------------------------------------------------------- brain */

  private enter(mode: Mode, dur = 0) {
    this.mode = mode;
    this.modeT = 0;
    this.modeDur = dur;
  }

  /** Utility pick: urgent first, then older and closer jobs. */
  private pickJob(): Job | null {
    let best: Job | null = null;
    let bestU = -Infinity;
    for (const j of this.jobs) {
      const c = this.cells[j.cell];
      const u = (j.urgent ? 100 : 0) + (this.t - j.at) * 0.4 - Math.hypot(c.x - this.pos.x, c.z - this.pos.z);
      if (u > bestU) {
        bestU = u;
        best = j;
      }
    }
    return best;
  }

  private decide() {
    if (this.job && !this.napping) this.jobs.unshift(this.job); // interrupted: back in the queue
    this.job = null;
    this.napping = false;

    if (this.pointer && this.t > this.curiousCool && Math.random() < 0.3) {
      this.curiousCool = this.t + 8;
      return this.enter("curious", rnd(1.8, 2.8));
    }
    const job = this.pickJob();
    if (job) {
      this.jobs.splice(this.jobs.indexOf(job), 1);
      this.job = job;
      return this.flyTo(this.cells[job.cell]);
    }
    const filled = this.cells.findIndex((c, i) => this.fill[i] === 1 && c.d <= RANGE);
    if (filled >= 0 && Math.random() < 0.25) {
      this.job = { cell: filled, at: this.t, urgent: false };
      this.napping = true;
      return this.flyTo(this.cells[filled]);
    }
    const a = Math.random() * Math.PI * 2;
    const r = rnd(1, RANGE - 0.5);
    this.target = { x: Math.cos(a) * r, y: CRUISE, z: Math.sin(a) * r };
    this.enter("patrol");
  }

  private flyTo(c: Cell) {
    this.target = { x: c.x, y: HOVER, z: c.z };
    this.enter("fly");
  }

  private watchPointer() {
    const p = this.pointer;
    if (!p || this.mode === "work" || this.mode === "evade" || this.t < this.evadeCool) return;
    const dx = this.pos.x - p.x;
    const dz = this.pos.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > 1.3) return;
    // Heading to a cell the cursor is on (usually the one just tapped): that's the job, not a threat.
    if (this.mode === "fly" && this.job && !this.napping) {
      const c = this.cells[this.job.cell];
      if (Math.hypot(c.x - p.x, c.z - p.z) < 2) return;
    }
    // Too close: dart away, staying on the comb.
    this.vel.x += (dx / d) * 7;
    this.vel.z += (dz / d) * 7;
    this.vel.y += 2;
    const tx = clamp(this.pos.x + (dx / d) * 2.6, -RANGE, RANGE);
    const tz = clamp(this.pos.z + (dz / d) * 2.6, -RANGE, RANGE);
    this.target = { x: tx, y: CRUISE + 0.4, z: tz };
    this.evadeCool = this.t + 1.6;
    this.enter("evade", 0.7);
  }

  private think() {
    const arrived = () =>
      Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y, this.target.z - this.pos.z) < 0.14 &&
      Math.hypot(this.vel.x, this.vel.z) < 0.7;

    switch (this.mode) {
      case "think":
        if (this.modeT > this.modeDur) this.decide();
        break;
      case "patrol":
        if (arrived()) this.enter("think", rnd(0.6, 1.3));
        break;
      case "fly":
        if (!this.job) return this.enter("think", 0.5);
        if (arrived()) {
          if (this.napping) {
            this.target.y = HOVER - 0.4;
            this.enter("nap", rnd(2.5, 4));
          } else this.enter("work", WORK_TIME);
        }
        break;
      case "work": {
        const job = this.job!;
        const p = clamp(this.modeT / WORK_TIME, 0, 1);
        this.fill[job.cell] = 1 - (1 - p) * (1 - p);
        // Little pixel hops while it works.
        this.target.y = HOVER + ((Math.floor(this.modeT / 0.2) & 1) * 0.12);
        if (p >= 1) {
          const c = this.cells[job.cell];
          this.fill[job.cell] = 1;
          this.filledAt[job.cell] = this.t;
          this.hold[job.cell] = rnd(...HOLD);
          this.built++;
          this.events.push({ kind: "ripple", x: c.x, z: c.z, strength: 1 });
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            this.events.push({ kind: "spark", x: c.x, y: 0.2, z: c.z, vx: Math.cos(a) * 1.6, vy: rnd(2.2, 3.6), vz: Math.sin(a) * 1.6 });
          }
          this.target.y = HOVER + 0.5;
          this.enter("celebrate", 0.7);
        }
        break;
      }
      case "celebrate":
        if (this.modeT > this.modeDur) {
          this.job = null;
          this.enter("think", rnd(0.5, 1.1));
        }
        break;
      case "curious": {
        const p = this.pointer;
        if (!p || this.modeT > this.modeDur) return this.enter("think", 0.4);
        const dx = this.pos.x - p.x;
        const dz = this.pos.z - p.z;
        const d = Math.hypot(dx, dz) || 1;
        this.target = { x: p.x + (dx / d) * 1.9, y: 1.5, z: p.z + (dz / d) * 1.9 };
        break;
      }
      case "evade":
        if (this.modeT > this.modeDur) this.enter("think", rnd(0.4, 0.8));
        break;
      case "nap":
        this.target.y = HOVER - 0.4 + Math.sin(this.t * 1.4) * 0.04;
        if (this.modeT > this.modeDur) {
          this.job = null;
          this.napping = false;
          this.enter("think", 0.8);
        }
        break;
    }
  }

  /* ---------------------------------------------------------------- body */

  private move(dt: number) {
    const { pos, vel, target } = this;
    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const flat = Math.hypot(dx, dz);
    // Cruise high between cells, settle to hover height on approach.
    const ty = this.mode === "fly" || this.mode === "patrol" ? target.y + Math.min(1, flat / 2.5) * (CRUISE - target.y) : target.y;
    const d = Math.hypot(dx, ty - pos.y, dz) || 1;
    const speed = this.mode === "evade" ? MAX_SPEED * 1.6 : this.mode === "curious" ? MAX_SPEED * 0.5 : MAX_SPEED;
    const want = d < 1.4 ? speed * (d / 1.4) : speed;
    let sx = (dx / d) * want - vel.x;
    let sy = ((ty - pos.y) / d) * want - vel.y;
    let sz = (dz / d) * want - vel.z;
    const s = Math.hypot(sx, sy, sz);
    const max = MAX_FORCE * dt;
    if (s > max) {
      sx *= max / s;
      sy *= max / s;
      sz *= max / s;
    }
    vel.x += sx;
    vel.y += sy;
    vel.z += sz;
    pos.x += vel.x * dt;
    pos.y += vel.y * dt + Math.sin(this.t * 5.5) * 0.004;
    pos.z += vel.z * dt;
  }

  private writePose(dt: number) {
    const p = this.pose;
    const m = this.mode;

    this.wingT += dt;
    const flap = m === "nap" ? Infinity : m === "fly" || m === "evade" || m === "patrol" ? 0.045 : 0.085;
    if (this.wingT > flap) {
      this.wingT = 0;
      p.wingDown = !p.wingDown;
    }
    if (m === "nap") p.wingDown = true;

    if (this.t > this.nextBlink) {
      this.blinkUntil = this.t + 0.12;
      this.nextBlink = this.t + rnd(2.4, 5);
    }
    p.eyes = m === "nap" || this.t < this.blinkUntil ? "shut" : m === "evade" || m === "celebrate" ? "wide" : "open";

    const look = m === "curious" && this.pointer ? this.pointer.x - this.pos.x : Math.abs(this.vel.x) > 0.8 ? this.vel.x : 0;
    p.ex = Math.sign(Math.round(look * 2) / 2);
    p.ey = m === "work" ? 1 : 0;

    p.tip = m === "think" || m === "curious" ? BEE_COLORS.violet : BEE_COLORS.honey;
    p.dots = m === "think" ? 1 + (Math.floor(this.modeT / 0.25) % 3) : 0;

    // Honey drips while working.
    if (m === "work") {
      this.sparkT += dt;
      if (this.sparkT > 0.14) {
        this.sparkT = 0;
        this.events.push({ kind: "spark", x: this.pos.x + rnd(-0.2, 0.2), y: this.pos.y - 0.35, z: this.pos.z, vx: rnd(-0.3, 0.3), vy: -0.6, vz: rnd(-0.3, 0.3) });
      }
    }
  }
}
