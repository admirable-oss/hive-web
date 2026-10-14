import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  EdgesGeometry,
  Object3D,
  Vector3,
  type Group,
  type InstancedMesh,
  type PerspectiveCamera,
  type Sprite,
  type SpriteMaterial,
} from "three";
import { gsap } from "@/lib/gsap";
import { BEE_H, BEE_W, createBeeFrames, WING_CYCLE } from "@/components/roadmap/comb/bee-frames";
import { createMotes, createShadowTexture } from "@/components/roadmap/comb/materials";
import { CLOUD, hexCluster, PADLOCK, SELF } from "./layout";

export type Plan = "self" | "cloud";

const FOV = 28;
const ELEVATION = 0.4;
const BEES = 5;
/** On-screen size of one bee sprite pixel, in CSS px: smaller on phones, where the combs are too. */
const beePx = (w: number) => (w < 640 ? 1.5 : w < 1024 ? 2 : 2.5);
const VOXEL = 0.17;

const HONEY = new Color("#F5B942");
const HONEY_DEEP = new Color("#C98F2E");
const GRAPHITE = new Color("#3A3935");
const INNER_HONEY = new Color("#FFD680");
const INNER_DARK = new Color("#0D0D0C");

export interface PricingSceneProps {
  /** The plan a card (or the cursor on a comb) is pointing at. */
  focus: Plan | null;
  onFocus: (plan: Plan | null) => void;
  /** Animate (false offscreen); reduced motion renders a still frame. */
  active: boolean;
  reducedMotion: boolean;
  /** DOM layer holding the `[data-anchor="self|cloud"]` tags that follow each comb. */
  overlay: RefObject<HTMLDivElement | null>;
  onReady: () => void;
}

/** A soft radial pool, for the honey glow under the comb you run. */
function createGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(245,185,66,.55)");
  g.addColorStop(0.45, "rgba(245,185,66,.14)");
  g.addColorStop(1, "rgba(245,185,66,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

function Scene({ focus, onFocus, reducedMotion, overlay }: Omit<PricingSceneProps, "active" | "onReady">) {
  const still = reducedMotion;
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const self = useMemo(() => hexCluster(2), []);
  const cloud = useMemo(() => hexCluster(1, 0.82), []);
  const prism = useMemo(() => new CylinderGeometry(0.9, 0.9, 1, 6, 1).translate(0, 0.5, 0), []);
  const inset = useMemo(() => new CylinderGeometry(0.68, 0.68, 0.04, 6, 1), []);
  const cloudPrism = useMemo(() => new CylinderGeometry(0.74, 0.74, 0.5, 6, 1).translate(0, 0.25, 0), []);
  const cloudEdges = useMemo(() => new EdgesGeometry(cloudPrism), [cloudPrism]);
  const voxels = useMemo(() => {
    const out: { x: number; y: number; part: number }[] = [];
    PADLOCK.forEach((row, j) =>
      [...row].forEach((ch, i) => {
        if (ch === " ") return;
        out.push({ x: (i - (row.length - 1) / 2) * VOXEL, y: (PADLOCK.length - 1 - j) * VOXEL, part: ch === "o" ? 0 : ch === "#" ? 1 : 2 });
      }),
    );
    return out;
  }, []);
  const frames = useMemo(createBeeFrames, []);
  const glowTex = useMemo(createGlowTexture, []);
  const shadowTex = useMemo(createShadowTexture, []);
  const motes = useMemo(() => createMotes(70, 13, 5), []);
  useEffect(
    () => () => {
      [prism, inset, cloudPrism, cloudEdges, motes.geometry, motes.material, glowTex, shadowTex].forEach((r) => r.dispose());
      frames.forEach((f) => f.dispose());
    },
    [prism, inset, cloudPrism, cloudEdges, motes, glowTex, shadowTex, frames],
  );

  const cells = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  const lock = useRef<InstancedMesh>(null);
  const cloudGroup = useRef<Group>(null);
  const lockGroup = useRef<Group>(null);
  const cloudShadow = useRef<Group>(null);
  const beeRefs = useRef<(Sprite | null)[]>([]);

  // Instance colours never change; matrices are rewritten each frame.
  useLayoutEffect(() => {
    self.forEach((c, i) => {
      cells.current?.setColorAt(i, c.ring === 0 ? HONEY : c.ring === 1 ? HONEY_DEEP : GRAPHITE);
      caps.current?.setColorAt(i, c.ring < 2 ? INNER_HONEY : INNER_DARK);
    });
    voxels.forEach((v, i) => lock.current?.setColorAt(i, new Color(v.part === 0 ? "#B5B1A8" : v.part === 1 ? "#77736A" : "#141412")));
    [cells, caps, lock].forEach((r) => r.current?.instanceColor && (r.current.instanceColor.needsUpdate = true));
    invalidate();
  }, [self, voxels, invalidate]);

  // Build-up: rings rise from the centre out, then the cloud comb drifts in.
  const build = useRef({ v: still ? 1 : 0, c: still ? 1 : 0 });
  useEffect(() => {
    if (still) {
      build.current = { v: 1, c: 1 };
      invalidate();
      return;
    }
    const tl = gsap
      .timeline({ delay: 0.25 })
      .to(build.current, { v: 1, duration: 2.2, ease: "power2.out" })
      .to(build.current, { c: 1, duration: 1.6, ease: "power3.out" }, 0.7);
    return () => void tl.kill();
  }, [still, invalidate]);

  // Focus: the bees get busy over the comb you run; the padlock rattles on the one that's coming.
  const busy = useRef({ v: 0 });
  const rattle = useRef({ v: 0 });
  useEffect(() => {
    gsap.to(busy.current, { v: focus === "self" ? 1 : 0, duration: 0.8, ease: "power2.out", overwrite: true, onUpdate: invalidate });
    if (focus === "cloud" && !still) {
      gsap.fromTo(rattle.current, { v: 1 }, { v: 0, duration: 0.9, ease: "power2.out", overwrite: true });
    }
  }, [focus, still, invalidate]);

  const dummy = useMemo(() => new Object3D(), []);
  const tmp = useMemo(() => new Vector3(), []);
  const phase = useRef(0);

  useFrame((state, dt) => {
    const t = still ? 0 : state.clock.elapsedTime;
    const w = size.width;
    const h = size.height;
    const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);
    const b = build.current;

    // Camera: fit both combs, slow sway, a touch of cursor parallax.
    const aspect = w / Math.max(1, h);
    const dist = Math.max(4.6 / tanV, 10.6 / (tanV * aspect));
    const yaw = still ? 0 : Math.sin(t * 0.07) * 0.05 + state.pointer.x * 0.04;
    const elev = ELEVATION + (still ? 0 : state.pointer.y * 0.03);
    camera.position.set(Math.sin(yaw) * Math.cos(elev) * dist, 1.1 + Math.sin(elev) * dist, Math.cos(yaw) * Math.cos(elev) * dist);
    camera.lookAt(0, 1.1, 0);

    // The comb you run: breathing cells, lit cores.
    const lift = busy.current.v;
    self.forEach((c, i) => {
      const rise = gsap.utils.clamp(0, 1, (b.v - c.ring * 0.22) / 0.56);
      const ease = 1 - Math.pow(1 - rise, 3);
      const base = c.ring === 0 ? 1.7 : c.ring === 1 ? 1.2 : 0.5 + c.seed * 0.3;
      const hgt = Math.max(0.001, (base + Math.sin(t * 1.1 + c.seed * 6.28) * 0.07 + (c.ring < 2 ? lift * 0.25 : 0)) * ease);
      dummy.position.set(SELF.x + c.x, SELF.y, SELF.z + c.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, hgt, 1);
      dummy.updateMatrix();
      cells.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = SELF.y + hgt + 0.005;
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      caps.current?.setMatrixAt(i, dummy.matrix);
    });
    if (cells.current) cells.current.instanceMatrix.needsUpdate = true;
    if (caps.current) caps.current.instanceMatrix.needsUpdate = true;

    // The cloud comb: sealed, drifting, waiting.
    const bob = Math.sin(t * 0.6) * 0.18;
    const cg = cloudGroup.current;
    if (cg) {
      cg.position.set(CLOUD.x, CLOUD.y + bob + (1 - b.c) * 1.4, CLOUD.z);
      cg.rotation.y = t * 0.08;
      cg.scale.setScalar(Math.max(0.001, b.c));
    }
    const lg = lockGroup.current;
    if (lg) {
      const r = rattle.current.v;
      lg.rotation.y = Math.sin(t * 0.5) * 0.35 - cg!.rotation.y;
      lg.rotation.z = Math.sin(t * 40) * 0.12 * r;
      lg.position.y = 1.05 + Math.sin(t * 1.3) * 0.06 + r * 0.08;
    }
    const sh = cloudShadow.current;
    if (sh) sh.scale.setScalar((1.1 - bob * 0.6) * b.c);

    // Bees: a loose orbit round the comb you run, tighter and quicker when it's in focus.
    if (!still) phase.current += dt * (0.45 + lift * 0.55);
    const beeY = ((BEE_H * beePx(w)) / Math.max(1, h)) * 2 * tanV;
    const beeX = beeY * (BEE_W / BEE_H);
    for (let i = 0; i < BEES; i++) {
      const s = beeRefs.current[i];
      if (!s) continue;
      const a = phase.current * (1 + i * 0.13) + (i * Math.PI * 2) / BEES;
      const rad = 3.6 + Math.sin(a * 1.7 + i) * 0.7 - lift * 0.6;
      s.position.set(SELF.x + Math.cos(a) * rad, 2.6 + Math.sin(a * 2.3 + i * 1.9) * 0.45 + lift * 0.4, SELF.z + Math.sin(a) * rad * 0.7);
      // Face the way it's flying across the screen.
      const dir = -Math.sin(a) >= 0 ? 1 : -1;
      s.scale.set(beeX * dir, beeY, 1);
      s.visible = b.v > 0.4;
      const frame = still ? 1 : WING_CYCLE[Math.floor(t * 12 + i * 3) % WING_CYCLE.length];
      const mat = s.material as SpriteMaterial;
      if (mat.map !== frames[frame]) {
        mat.map = frames[frame];
        mat.needsUpdate = true;
      }
    }

    motes.material.uniforms.uTime.value = t;
    motes.material.uniforms.uScale.value = (h * gl.getPixelRatio()) / (2 * tanV);

    // DOM tags follow their combs.
    const box = overlay.current;
    if (box) {
      box.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
        const isSelf = el.dataset.anchor === "self";
        if (isSelf) tmp.set(SELF.x, 2.2 + lift * 0.25, SELF.z);
        else tmp.set(CLOUD.x, CLOUD.y + bob - 0.6, CLOUD.z);
        tmp.project(camera);
        el.style.transform = `translate(${Math.round(((tmp.x + 1) / 2) * w)}px, ${Math.round(((1 - tmp.y) / 2) * h)}px) translate(-50%, ${isSelf ? "-100%" : "0"})`;
        el.style.opacity = (isSelf ? b.v : b.c) > 0.6 ? "1" : "0";
      });
    }
  });

  const hover = (plan: Plan) => ({
    onPointerOver: () => onFocus(plan),
    onPointerOut: () => onFocus(null),
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#FFE7BF", "#151514", 0.6]} />
      <directionalLight position={[-6, 10, 7]} intensity={2.1} color="#FFE2B0" />
      <directionalLight position={[8, 4, -6]} intensity={0.5} color="#9AA4FF" />
      <pointLight position={[SELF.x, 3.4, SELF.z + 0.6]} intensity={18} distance={12} decay={2} color="#FFB840" />

      {/* Honey pool under the comb you run. */}
      <mesh rotation-x={-Math.PI / 2} position={[SELF.x, 0.01, SELF.z]} renderOrder={0}>
        <planeGeometry args={[14, 11]} />
        <meshBasicMaterial map={glowTex} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>

      <group {...hover("self")}>
        <instancedMesh ref={cells} args={[prism, undefined, self.length]} frustumCulled={false}>
          <meshStandardMaterial flatShading roughness={0.62} metalness={0.05} />
        </instancedMesh>
        <instancedMesh ref={caps} args={[inset, undefined, self.length]} frustumCulled={false}>
          <meshBasicMaterial />
        </instancedMesh>
      </group>

      {Array.from({ length: BEES }, (_, i) => (
        <sprite key={i} ref={(s) => void (beeRefs.current[i] = s)} visible={false} renderOrder={5}>
          <spriteMaterial map={frames[1]} transparent sizeAttenuation={false} depthWrite={false} />
        </sprite>
      ))}

      {/* The cloud comb's shadow on the floor. */}
      <group ref={cloudShadow} position={[CLOUD.x, 0.01, CLOUD.z]}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[5.4, 4.2]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.9} />
        </mesh>
      </group>

      <group ref={cloudGroup} position={[CLOUD.x, CLOUD.y, CLOUD.z]} {...hover("cloud")}>
        {cloud.map((c, i) => (
          <group key={i} position={[c.x, c.ring ? 0 : 0.12, c.z]}>
            <mesh geometry={cloudPrism}>
              <meshStandardMaterial color="#2A2926" flatShading roughness={0.8} transparent opacity={0.92} />
            </mesh>
            <lineSegments geometry={cloudEdges}>
              <lineBasicMaterial color="#F5B942" transparent opacity={0.28} />
            </lineSegments>
            {/* Wax caps: sealed until it ships. */}
            <mesh position-y={0.505} scale={[0.86, 1, 0.86]} geometry={inset}>
              <meshStandardMaterial color="#5A5850" flatShading roughness={0.9} />
            </mesh>
          </group>
        ))}
        <group ref={lockGroup} position-y={1.05}>
          <instancedMesh
            ref={lock}
            args={[undefined, undefined, voxels.length]}
            frustumCulled={false}
            onUpdate={(m) => {
              voxels.forEach((v, i) => {
                dummy.position.set(v.x, v.y, v.part === 2 ? 0.04 : 0);
                dummy.rotation.set(0, 0, 0);
                dummy.scale.set(1, 1, v.part === 0 ? 0.7 : 1);
                dummy.updateMatrix();
                m.setMatrixAt(i, dummy.matrix);
              });
              m.instanceMatrix.needsUpdate = true;
            }}
          >
            <boxGeometry args={[VOXEL * 0.94, VOXEL * 0.94, VOXEL * 1.6]} />
            <meshStandardMaterial flatShading roughness={0.55} metalness={0.2} />
          </instancedMesh>
        </group>
      </group>

      <points geometry={motes.geometry} material={motes.material} frustumCulled={false} renderOrder={4} />
    </>
  );
}

/**
 * /pricing in three.js: the comb you run (lit, breathing, bees on patrol) and
 * the comb that's coming (sealed with wax, floating, a pixel padlock on top).
 * Loaded lazily by PricingStage; resolution adapts with PerformanceMonitor.
 */
export default function PricingScene({ active, onReady, ...props }: PricingSceneProps) {
  // Deterministic server render; read device capabilities after hydration.
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
      camera={{ fov: FOV, near: 1, far: 300, position: [0, 12, 40] }}
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
      <Scene {...props} />
    </Canvas>
  );
}
