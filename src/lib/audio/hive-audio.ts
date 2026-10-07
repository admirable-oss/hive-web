import { hiveStore } from "../hive-store";
import { rnd } from "../math";

export type SfxKind = "knock" | "thud" | "tik" | "hum" | "blip";

/**
 * Procedural WebAudio SFX — no audio files. The AudioContext is created lazily
 * on the first user gesture (autoplay policy) and every sound is gated on the
 * global `sound` toggle.
 */
class HiveAudio {
  private ctx: AudioContext | null = null;
  private lastBlip = 0;
  private attached = 0;
  private noise = new Map<number, AudioBuffer>();

  private unlock = () => {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  };

  /** Ref-counted gesture listeners; returns a detach function. */
  attach() {
    if (this.attached++ === 0) {
      window.addEventListener("pointerdown", this.unlock, { passive: true });
      window.addEventListener("keydown", this.unlock);
    }
    return () => {
      if (--this.attached === 0) {
        window.removeEventListener("pointerdown", this.unlock);
        window.removeEventListener("keydown", this.unlock);
      }
    };
  }

  play = (kind: SfxKind, v = 1) => {
    const c = this.ctx;
    if (!hiveStore.get().sound || !c || c.state !== "running") return;
    const t = c.currentTime;
    switch (kind) {
      case "knock":
        this.tone(c, t, "sine", 210, 80, 0.14, 0.55 * v);
        this.burst(c, t, 0.05, "bandpass", 2600, 1.4, 0.5 * v);
        this.burst(c, t, 0.09, "lowpass", 500, 0.7, 0.35 * v);
        break;
      case "thud":
        this.tone(c, t, "sine", 130, 45, 0.2, 0.4 * v);
        this.burst(c, t, 0.12, "lowpass", 700, 0.7, 0.3 * v);
        break;
      case "tik":
        this.tone(c, t, "square", 1500, 900, 0.035, 0.05 * v);
        break;
      case "hum":
        this.tone(c, t, "sine", 110, 160, 0.5, 0.08 * v);
        this.tone(c, t, "triangle", 220, 330, 0.4, 0.03 * v);
        break;
      case "blip":
        if (t - this.lastBlip < 0.06) return;
        this.lastBlip = t;
        this.tone(c, t, "sine", rnd(1700, 2500), 1200, 0.05, 0.025 * v);
        break;
    }
  };

  private noiseBuffer(c: AudioContext, dur: number) {
    let buf = this.noise.get(dur);
    if (!buf) {
      const n = Math.floor(c.sampleRate * dur);
      buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      this.noise.set(dur, buf);
    }
    return buf;
  }

  private burst(c: AudioContext, t: number, dur: number, type: BiquadFilterType, f: number, q: number, g0: number) {
    const s = c.createBufferSource();
    const fl = c.createBiquadFilter();
    const g = c.createGain();
    s.buffer = this.noiseBuffer(c, dur);
    fl.type = type;
    fl.frequency.value = f;
    fl.Q.value = q;
    g.gain.value = g0;
    s.connect(fl).connect(g).connect(c.destination);
    s.start(t);
  }

  private tone(c: AudioContext, t: number, type: OscillatorType, f0: number, f1: number, dur: number, g0: number) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(g0, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

export const hiveAudio = new HiveAudio();
