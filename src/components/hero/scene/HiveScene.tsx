import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, PerformanceMonitor } from "@react-three/drei";
import { Raycaster, Vector2, Vector3, type Group, type Mesh, type PerspectiveCamera } from "three";
import { RuntimeDemo } from "@/components/hero/runtime/RuntimeDemo";
import { useGsapTicker } from "@/hooks/use-gsap-ticker";
import { hiveAudio } from "@/lib/audio/hive-audio";
import { gsap } from "@/lib/gsap";
import type { HeroSignals } from "@/lib/hero-signals";
import { introElapsed } from "@/lib/hive-store";
import { createFloorGeometry, createFloorMaterial } from "./floor-material";
import { computeFloorLayout, FOV } from "./layout";

export interface HiveSceneProps {
  signals: HeroSignals;
  /** Render every tick (false while the menu covers the hero / reduced motion). */
  active: boolean;
  reducedMotion: boolean;
  introAt: number | null;
  /** DOM layer the terminal is portalled into (sits between the bee canvases). */
  htmlLayer: RefObject<HTMLDivElement | null>;
  /** Bottom of the hero copy, px from the section top. */
  getCeiling: () => number;
  intensity?: number;
}

/** Hover tilt reduction (rad) and rise toward camera when the terminal is lifted. */
const LIFT_TILT = 0.12;
const LIFT_RISE = 30;
/** Intro: the terminal starts sunk this far beneath the floor plane. */
const SINK = 160;

function Ground({ signals, reducedMotion, introAt, htmlLayer, getCeiling, intensity = 1 }: Omit<HiveSceneProps, "active">) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  const [ceil, setCeil] = useState(getCeiling);
  useEffect(() => {
    const update = () => setCeil(getCeiling());
    update();
    void document.fonts?.ready.then(update);
    const settle = setTimeout(update, 1800); // after the copy's intro rise
    return () => clearTimeout(settle);
  }, [size.width, size.height, getCeiling]);

  const L = useMemo(() => computeFloorLayout(size.width, size.height, ceil), [size.width, size.height, ceil]);
  const material = useMemo(createFloorMaterial, []);
  const geometry = useMemo(createFloorGeometry, []);
  useEffect(
    () => () => {
      material.dispose();
      geometry.dispose();
    },
    [material, geometry],
  );

  useLayoutEffect(() => {
    camera.fov = FOV;
    camera.near = 10;
    camera.far = 40000;
    camera.position.set(0, 0, L.zc);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const u = material.uniforms;
    u.uRect.value.set(0, L.ht / 2, L.wt / 2, L.ht / 2);
    u.uFogNear.value = L.fogNear;
    u.uFogFar.value = L.fogFar;
  }, [L, camera, material]);

  useEffect(() => {
    material.uniforms.uIntensity.value = intensity;
  }, [intensity, material]);

  const lift = useRef({ v: 0 });
  const rise = useRef({ v: reducedMotion ? 1 : 0 });
  useEffect(() => {
    if (reducedMotion) {
      rise.current.v = 1;
      return;
    }
    if (introAt === null) return;
    const tween = gsap.to(rise.current, { v: 1, duration: 1.6, ease: "power3.out", delay: Math.max(0, 1.1 - introElapsed()) });
    return () => void tween.kill();
  }, [introAt, reducedMotion]);

  const setLift = (on: boolean) => {
    if (!reducedMotion) gsap.to(lift.current, { v: on ? 1 : 0, duration: 0.6, ease: "power3.out", overwrite: true });
  };

  const ground = useRef<Group>(null);
  const term = useRef<Group>(null);
  const floor = useRef<Mesh>(null);
  const termEl = useRef<HTMLDivElement>(null);
  const tools = useMemo(() => ({ ray: new Raycaster(), ndc: new Vector2(), tmp: new Vector3(), buf: new Vector2() }), []);
  const lastRipple = useRef(-10);

  useFrame(() => {
    const g = ground.current;
    if (!g) return;
    const u = material.uniforms;

    // Gentle parallax from the (already smoothed) pointer.
    camera.position.set((signals.mx - 0.5) * 60, (signals.my - 0.5) * 28, L.zc);
    camera.lookAt(0, 0, 0);

    const l = lift.current.v;
    const r = rise.current.v;
    g.rotation.x = -(L.theta - l * LIFT_TILT);
    g.position.set(0, L.yn + l * 10, l * LIFT_RISE);
    if (term.current) term.current.position.z = 2 - (1 - r) * SINK;
    if (termEl.current) {
      termEl.current.style.opacity = String(r);
      termEl.current.style.pointerEvents = r > 0.9 ? "auto" : "none";
    }

    gl.getDrawingBufferSize(tools.buf);
    const px = tools.buf.y / size.height;
    u.uRes.value.copy(tools.buf);
    u.uPx.value = px;
    u.uCeil.value = ceil * px;
    u.uTime.value = signals.t;
    u.uIntro.value = signals.intro;
    u.uPulse.value = signals.pulse;

    // Screen-space ripples (bee crashes, demo events) → floor coordinates.
    const [rx, ry, rt] = signals.ripple;
    if (rt !== lastRipple.current && rt > -5 && floor.current) {
      lastRipple.current = rt;
      tools.ndc.set(rx * 2 - 1, ry * 2 - 1);
      tools.ray.setFromCamera(tools.ndc, camera);
      const hit = tools.ray.intersectObject(floor.current, false)[0];
      if (hit) {
        g.worldToLocal(tools.tmp.copy(hit.point));
        u.uRipple.value.set(tools.tmp.x, tools.tmp.y, rt);
      }
    }
  });

  // Tap the floor: a ripple runs through the topology.
  const onFloorDown = (e: ThreeEvent<PointerEvent>) => {
    const g = ground.current;
    if (!g) return;
    g.worldToLocal(tools.tmp.copy(e.point));
    material.uniforms.uRipple.value.set(tools.tmp.x, tools.tmp.y, signals.t);
    signals.pulse = Math.max(signals.pulse, 0.5);
    hiveAudio.play("blip");
  };

  return (
    <group ref={ground}>
      <mesh ref={floor} geometry={geometry} material={material} frustumCulled={false} onPointerDown={onFloorDown} />
      {L.visible && (
        <group ref={term} position={[0, L.ht / 2, 2]}>
          <Html transform center distanceFactor={400} portal={htmlLayer as RefObject<HTMLElement>} zIndexRange={[5, 0]}>
            <div
              ref={termEl}
              style={{ width: L.wt, height: L.ht, opacity: 0 }}
              onPointerEnter={() => setLift(true)}
              onPointerLeave={() => setLift(false)}
            >
              {/* Near edge crisp, far edge dissolving into the haze. */}
              <RuntimeDemo
                className="size-full [mask-image:linear-gradient(to_top,black_45%,rgb(0_0_0/.25)_100%)]"
                signals={signals}
                reducedMotion={reducedMotion}
                introAt={introAt}
              />
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

/** Drives R3F from GSAP's ticker so the page keeps a single rAF loop. */
function TickerDriver({ active }: { active: boolean }) {
  const advance = useThree((s) => s.advance);
  const size = useThree((s) => s.size);
  useGsapTicker((now) => advance(now), active);
  // Static mode: render a short burst (lets drei's Html mount and settle), then stop.
  useEffect(() => {
    if (active) return;
    let n = 0;
    let id = 0;
    const step = () => {
      advance(performance.now());
      if (++n < 30) id = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(id);
  }, [active, size, advance]);
  return null;
}

/**
 * The hive floor as a real 3D scene: a hex-topology ground plane with the
 * runtime terminal lying on it (drei <Html transform> keeps the TUI as live,
 * crisp DOM in the same camera space). Hover lifts the terminal, taps ripple
 * the floor, the pointer adds parallax. Loaded lazily — see HiveSceneLayer.
 */
export default function HiveScene({ active, ...props }: HiveSceneProps) {
  const maxDpr = useMemo(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    return Math.min(coarse ? 1.5 : 1.75, window.devicePixelRatio || 1);
  }, []);
  const [dpr, setDpr] = useState(maxDpr);

  return (
    <Canvas
      frameloop="never"
      dpr={dpr}
      flat
      linear
      camera={{ fov: FOV, near: 10, far: 40000, position: [0, 0, 1000] }}
      gl={{ alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power", premultipliedAlpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor flipflops={3} onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} onFallback={() => setDpr(1)} />
      <Ground {...props} />
      <TickerDriver active={active} />
    </Canvas>
  );
}
