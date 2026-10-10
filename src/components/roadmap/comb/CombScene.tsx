import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { InstancedBufferAttribute, Vector2, Vector3, type Mesh, type PerspectiveCamera, type Sprite, type SpriteMaterial } from "three";
import { gsap } from "@/lib/gsap";
import type { Milestone } from "@/lib/roadmap/parse";
import { BEE_H, BEE_W, createBeeFrames, WING_CYCLE } from "./bee-frames";
import { Flock, hoverPoint, topOf, type Bee, type FlockCommit } from "./flock";
import { buildComb, RAD, type Field } from "./layout";
import { createCombGeometry, createCombMaterial, createFloorMaterial, createMotes, createShadowTexture } from "./materials";

const FOV = 26;
const ELEVATION = 0.82;
const MAX_BEES = 8;
const IDLE_BEES = ["1d1e0000", "2b0e0000", "3a9e0000"];
/** On-screen size of one bee sprite pixel, in CSS px: the bees stay pixel art over the smooth comb. */
const BEE_PX = 3;

const FIELD_WIDE: Field = { rx: 22, rz: 11 };
const FIELD_NARROW: Field = { rx: 12, rz: 9 };

export interface CombSceneProps {
  milestones: Milestone[];
  sel: string | null;
  commits: FlockCommit[];
  /** Animate (false offscreen); reduced motion renders still frames. */
  active: boolean;
  reducedMotion: boolean;
  /** Wide hero: the comb spans the hero and the milestone path sits right of the title. */
  wide: boolean;
  /** DOM layer holding `[data-ml="i"]` milestone labels and the `[data-bee-tag]` commit tag. */
  overlay: RefObject<HTMLDivElement | null>;
  onReady: () => void;
  onLeadBee?: (sha: string | null) => void;
  onNewBee?: (bee: Bee) => void;
}

function Comb({ milestones, sel, commits, reducedMotion, wide, overlay, onLeadBee, onNewBee }: Omit<CombSceneProps, "onReady" | "active">) {
  const still = reducedMotion;
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const field = wide ? FIELD_WIDE : FIELD_NARROW;

  // Layout & GPU resources follow the milestone *shape* (ids + statuses), not every re-read.
  const shapeKey = milestones.map((m) => m.id + m.status).join("|");
  const { cells, ms } = useMemo(() => buildComb(milestones, field), [shapeKey, field]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = useMemo(() => ms.find((c) => c.kind === 2) ?? ms[0], [ms]);
  const geometry = useMemo(() => createCombGeometry(cells), [cells]);
  const material = useMemo(createCombMaterial, []);
  const floor = useMemo(() => createFloorMaterial(material), [material]);
  const motes = useMemo(() => createMotes(wide ? 90 : 45, field.rx, field.rz), [wide, field]);
  const frames = useMemo(createBeeFrames, []);
  const shadowTex = useMemo(createShadowTexture, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    material.uniforms.uPixelSize.value = 3 * gl.getPixelRatio();
  }, [gl, material]);
  useEffect(
    () => () => {
      motes.geometry.dispose();
      motes.material.dispose();
    },
    [motes],
  );
  useEffect(
    () => () => {
      material.dispose();
      floor.dispose();
      shadowTex.dispose();
      frames.forEach((f) => f.dispose());
    },
    [material, floor, frames, shadowTex],
  );

  // Build-up: cells rise from the centre outward.
  const build = useRef({ v: still ? 1 : 0 });
  useEffect(() => {
    if (still) {
      build.current.v = 1;
      invalidate();
      return;
    }
    build.current.v = 0;
    const t = gsap.to(build.current, { v: 1, duration: 2.6, ease: "power2.out", delay: 0.2 });
    return () => void t.kill();
  }, [geometry, still, invalidate]);

  // Bees: one per recent commit; idle workers when GitHub has nothing for us.
  const flock = useMemo(
    () => (current ? new Flock(ms, current, still, RAD, onNewBee) : null),
    [ms, current, still], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => () => flock?.dispose(), [flock]);
  const commitKey = commits.map((c) => c.sha + c.dest).join();
  const wasIdle = useRef(false);
  useEffect(() => {
    if (!flock) return;
    const idle = !commits.length;
    const list = idle ? IDLE_BEES.map((sha) => ({ sha, msg: "", dest: current?.id ?? "" })) : commits.slice(0, MAX_BEES);
    // Real commits replacing the idle workers settle in quietly (no "new commit" fanfare).
    flock.sync(list, wasIdle.current && !idle);
    wasIdle.current = idle;
    onLeadBee?.(idle ? null : (flock.bees[0]?.sha ?? null));
    invalidate();
  }, [flock, commitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selection: focus the camera part of the way toward the cell and lift it.
  const focus = useRef({ x: 0, z: 0 });
  const first = useRef(true);
  useEffect(() => {
    const c = ms.find((m) => m.id === sel);
    if (!c) return;
    const fast = first.current || still;
    first.current = false;
    if (fast) {
      focus.current = { x: c.x * 0.3, z: c.z * 0.3 };
      ms.forEach((m) => (m.lift = m === c ? 0.3 : 0));
      invalidate();
      return;
    }
    gsap.to(focus.current, { x: c.x * 0.3, z: c.z * 0.3, duration: 1.3, ease: "power3.inOut", onUpdate: invalidate });
    ms.forEach((m) => gsap.to(m, { lift: m === c ? 0.3 : 0, duration: 0.7, ease: "back.out(2)", overwrite: true }));
  }, [sel, ms, still, invalidate]);

  // Cursor on the comb: the spotlight leans toward it and the tiles under it dip.
  const pointer = useRef<{ x: number; z: number } | null>(null);
  const pointerOn = useRef({ v: 0 });
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    pointer.current = { x: e.point.x, z: e.point.z };
    gsap.to(pointerOn.current, { v: 1, duration: 0.4, overwrite: true });
  };
  const onLeave = () => void gsap.to(pointerOn.current, { v: 0, duration: 0.8, overwrite: true });

  const beeRefs = useRef<(Sprite | null)[]>([]);
  const shadowRefs = useRef<(Mesh | null)[]>([]);
  const tmp = useMemo(() => new Vector3(), []);
  const spot = useMemo(() => new Vector3(), []);
  const ptr = useMemo(() => new Vector2(999, 999), []);
  const liftAttr = geometry.getAttribute("aLift") as InstancedBufferAttribute;
  const msOffset = cells.length - ms.length;

  useFrame((state, dt) => {
    const t = still ? 0 : state.clock.elapsedTime;
    const w = size.width;
    const h = size.height;
    const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);

    // Camera: fit the field's width (wide) or the milestone path (narrow); slow sway.
    const aspect = w / Math.max(1, h);
    const halfW = wide ? field.rx * 0.66 : RAD * 0.74;
    const halfH = (wide ? field.rz * 0.62 : RAD * 0.62) + 1;
    const dist = Math.max(halfH / tanV, halfW / (tanV * aspect));
    const yaw = -0.08 + (still ? 0 : Math.sin(t * 0.08) * 0.07 + state.pointer.x * 0.03);
    const f = focus.current;
    camera.position.set(
      f.x + Math.sin(yaw) * Math.cos(ELEVATION) * dist,
      Math.sin(ELEVATION) * dist,
      f.z + Math.cos(yaw) * Math.cos(ELEVATION) * dist,
    );
    camera.lookAt(f.x, 0.6, f.z);
    if (wide) camera.setViewOffset(w, h, -w * 0.12, h * 0.04, w, h);
    else camera.clearViewOffset();

    // Spotlight: wanders around the building cell; leans toward the cursor when it's on the comb.
    const home = current ?? { x: 0, z: 0 };
    const wx = home.x + (still ? 0 : Math.sin(t * 0.21) * 3.2);
    const wz = home.z + (still ? 0 : Math.cos(t * 0.17) * 1.8);
    const on = pointerOn.current.v;
    const tx = pointer.current ? wx + (pointer.current.x - wx) * on * 0.7 : wx;
    const tz = pointer.current ? wz + (pointer.current.z - wz) * on * 0.7 : wz;
    const k = still ? 1 : Math.min(1, dt * 2.5);
    spot.set(spot.x + (tx - spot.x) * k, 9, spot.z + (tz - spot.z) * k);
    if (pointer.current) ptr.set(pointer.current.x, pointer.current.z);

    const u = material.uniforms;
    u.uTime.value = t;
    u.uBuild.value = build.current.v;
    u.uFlash.value = flock?.flash.v ?? 0;
    u.uMotion.value = still ? 0 : 1;
    u.uSpot.value.copy(spot);
    u.uPointer.value.copy(ptr);
    u.uPointerOn.value = still ? 0 : on;
    if (current) floor.uniforms.uCur.value.set(current.x, current.z);
    motes.material.uniforms.uTime.value = t;
    motes.material.uniforms.uScale.value = (h * gl.getPixelRatio()) / (2 * tanV);

    const lifts = liftAttr.array as Float32Array;
    ms.forEach((m, i) => (lifts[msOffset + i] = m.lift ?? 0));
    liftAttr.needsUpdate = true;

    // Bees: constant on-screen size, pixel-crisp.
    const beeScaleY = ((BEE_H * BEE_PX) / Math.max(1, h)) * 2 * tanV;
    const beeScaleX = beeScaleY * (BEE_W / BEE_H);
    const bees = flock?.bees ?? [];
    for (let i = 0; i < MAX_BEES; i++) {
      const sprite = beeRefs.current[i];
      const shadow = shadowRefs.current[i];
      const b = bees[i];
      if (!sprite || !shadow) continue;
      sprite.visible = shadow.visible = !!b;
      if (!b) continue;
      const A = hoverPoint(b.a, b);
      const B = hoverPoint(b.b, b);
      const p = b.p;
      const arc = b.a === b.b ? 0 : Math.sin(Math.PI * p) * 1.7;
      const wv = t + b.phase;
      const x = A.x + (B.x - A.x) * p + Math.sin(wv * 1.7) * 0.22;
      const y = A.y + (B.y - A.y) * p + arc + Math.sin(wv * 2.9) * 0.12;
      const z = A.z + (B.z - A.z) * p + Math.cos(wv * 1.3) * 0.22;
      sprite.position.set(x, y, z);
      sprite.scale.set(beeScaleX, beeScaleY, 1);
      const frame = still ? 1 : WING_CYCLE[Math.floor(t * 12 + b.phase * 3) % WING_CYCLE.length];
      const mat = sprite.material as SpriteMaterial;
      if (mat.map !== frames[frame]) {
        mat.map = frames[frame];
        mat.needsUpdate = true;
      }
      const ground = p < 0.5 ? b.a : b.b;
      const gy = topOf(ground) + 0.02;
      const s = Math.max(0.35, 1 - (y - gy) * 0.18);
      shadow.position.set(x, gy, z);
      shadow.scale.set(s, s, s);
    }

    // DOM labels follow their cells; the commit tag follows the lead bee.
    const box = overlay.current;
    if (box) {
      const visible = build.current.v > 0.35;
      box.querySelectorAll<HTMLElement>("[data-ml]").forEach((el) => {
        const c = ms[Number(el.dataset.ml)];
        if (!c) return;
        tmp.set(c.x, c.h + (c.lift ?? 0), c.z).project(camera);
        el.style.transform = `translate(${Math.round(((tmp.x + 1) / 2) * w)}px, ${Math.round(((1 - tmp.y) / 2) * h) - 6}px) translate(-50%, -100%)`;
        el.style.opacity = visible ? "1" : "0";
      });
      const tag = box.querySelector<HTMLElement>("[data-bee-tag]");
      const lead = beeRefs.current[0];
      if (tag) {
        if (lead?.visible && bees[0] && !IDLE_BEES.includes(bees[0].sha)) {
          tmp.copy(lead.position).project(camera);
          tag.style.transform = `translate(${Math.round(((tmp.x + 1) / 2) * w) + 36}px, ${Math.round(((1 - tmp.y) / 2) * h) - 50}px)`;
          tag.style.opacity = "1";
        } else tag.style.opacity = "0";
      }
    }
  });

  return (
    <>
      {/* Invisible ground plane: where the cursor touches the comb. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.5} onPointerMove={onMove} onPointerOut={onLeave}>
        <planeGeometry args={[field.rx * 2.4, field.rz * 2.4]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={0} material={floor}>
        <planeGeometry args={[field.rx * 2.2, field.rz * 2.2]} />
      </mesh>
      <instancedMesh args={[geometry, material, cells.length]} frustumCulled={false} renderOrder={1} />
      <points geometry={motes.geometry} material={motes.material} frustumCulled={false} renderOrder={4} />
      {Array.from({ length: MAX_BEES }, (_, i) => (
        <group key={i}>
          <mesh ref={(m) => void (shadowRefs.current[i] = m)} rotation-x={-Math.PI / 2} visible={false} renderOrder={2}>
            <planeGeometry args={[1, 0.55]} />
            <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
          </mesh>
          <sprite ref={(s) => void (beeRefs.current[i] = s)} visible={false} renderOrder={5}>
            <spriteMaterial map={frames[1]} transparent sizeAttenuation={false} depthWrite={false} />
          </sprite>
        </group>
      ))}
    </>
  );
}

/**
 * The roadmap's comb in three.js: bevelled cells in one instanced draw call
 * (build-up, wobble, cursor dent and lighting on the GPU), a drifting
 * spotlight, pollen motes, and pixel-art commit bees on GSAP timelines.
 * Resolution adapts to the device (PerformanceMonitor). Loaded lazily by CombStage.
 */
export default function CombScene({ active, onReady, ...props }: CombSceneProps) {
  // Keep the server render deterministic for Vercel; read browser capabilities
  // only after hydration, then let PerformanceMonitor adapt from that ceiling.
  const [maxDpr, setMaxDpr] = useState(1);
  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    const cap = Math.min(window.devicePixelRatio || 1, window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2);
    setMaxDpr(cap);
    setDpr(cap);
  }, []);
  return (
    <Canvas
      frameloop={active && !props.reducedMotion ? "always" : "demand"}
      dpr={dpr}
      flat
      linear
      camera={{ fov: FOV, near: 1, far: 400, position: [0, 30, 30] }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        onReady();
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(Math.max(1, maxDpr * 0.66))}
        onIncline={() => setDpr(maxDpr)}
        onFallback={() => setDpr(1)}
      />
      <Comb {...props} />
    </Canvas>
  );
}
