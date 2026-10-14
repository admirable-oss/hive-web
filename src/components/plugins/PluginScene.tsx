import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, PerformanceMonitor, RoundedBox } from "@react-three/drei";
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  Object3D,
  Sprite,
  SpriteMaterial,
  type InstancedMesh,
  type PerspectiveCamera,
} from "three";
import { BEE_H, BEE_W, createBeeFrames, WING_CYCLE } from "@/components/roadmap/comb/bee-frames";
import { createMotes, createShadowTexture } from "@/components/roadmap/comb/materials";
import { hexCluster } from "@/components/pricing/scene/layout";

const FOV = 28;
const ELEVATION = 0.38;
const HONEY = new Color("#F5B942");
const HONEY_DEEP = new Color("#C98F2E");
const GRAPHITE = new Color("#25231F");
const INNER_HONEY = new Color("#FFD680");
const INNER_DARK = new Color("#121110");

const beePx = (w: number) => (w < 640 ? 1.5 : w < 1024 ? 2 : 2.4);

interface ModuleDef {
  id: "agent" | "flow" | "term";
  title: string;
  x: number;
  y: number;
  z: number;
  turn: number;
  accent: string;
  phase: number;
}

const MODULES: ModuleDef[] = [
  { id: "agent", title: "AGENT ENGINE", x: -2.25, y: 1.55, z: -0.45, turn: -0.38, accent: "#F5B942", phase: 0 },
  { id: "flow", title: "WORKFLOW PIPE", x: 2.15, y: 1.72, z: -0.4, turn: 0.32, accent: "#F0A94A", phase: 2.1 },
  { id: "term", title: "TERMINAL TUI", x: 0.15, y: 2.75, z: 1.35, turn: 0.05, accent: "#FFE2A4", phase: 4.2 },
];

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,214,120,.65)");
  gradient.addColorStop(0.35, "rgba(245,185,66,.22)");
  gradient.addColorStop(0.7, "rgba(245,185,66,.05)");
  gradient.addColorStop(1, "rgba(245,185,66,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new CanvasTexture(canvas);
}

function DockArray({ reducedMotion }: { reducedMotion: boolean }) {
  const cells = useMemo(() => hexCluster(2, 0.98), []);
  const prism = useMemo(() => new CylinderGeometry(0.92, 0.92, 1, 6, 1).translate(0, 0.5, 0), []);
  const inset = useMemo(() => new CylinderGeometry(0.7, 0.7, 0.045, 6, 1), []);
  const glowTex = useMemo(createGlowTexture, []);

  useEffect(() => {
    return () => {
      prism.dispose();
      inset.dispose();
      glowTex.dispose();
    };
  }, [prism, inset, glowTex]);

  const cellsMesh = useRef<InstancedMesh>(null);
  const capsMesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    cells.forEach((c, i) => {
      cellsMesh.current?.setColorAt(i, c.ring === 0 ? HONEY : c.ring === 1 ? HONEY_DEEP : GRAPHITE);
      capsMesh.current?.setColorAt(i, c.ring === 0 ? new Color("#FFF1C2") : c.ring === 1 ? INNER_HONEY : INNER_DARK);
    });
    if (cellsMesh.current?.instanceColor) cellsMesh.current.instanceColor.needsUpdate = true;
    if (capsMesh.current?.instanceColor) capsMesh.current.instanceColor.needsUpdate = true;
  }, [cells]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    cells.forEach((c, i) => {
      const baseHeight = c.ring === 0 ? 0.72 : c.ring === 1 ? 0.44 : 0.26 + c.seed * 0.08;
      const breathe = Math.sin(t * 1.1 + c.seed * 6.28) * 0.04;
      const h = Math.max(0.05, baseHeight + breathe);

      dummy.position.set(c.x, 0, c.z);
      dummy.scale.set(1, h, 1);
      dummy.updateMatrix();
      cellsMesh.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(c.x, h + 0.005, c.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      capsMesh.current?.setMatrixAt(i, dummy.matrix);
    });

    if (cellsMesh.current) cellsMesh.current.instanceMatrix.needsUpdate = true;
    if (capsMesh.current) capsMesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position-y={-0.2}>
      {/* Golden honey pool beneath the dock */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} renderOrder={0}>
        <planeGeometry args={[13, 11]} />
        <meshBasicMaterial map={glowTex} transparent depthWrite={false} blending={AdditiveBlending} opacity={0.88} />
      </mesh>

      <instancedMesh ref={cellsMesh} args={[prism, undefined, cells.length]} frustumCulled={false} castShadow receiveShadow>
        <meshStandardMaterial flatShading roughness={0.48} metalness={0.25} />
      </instancedMesh>

      <instancedMesh ref={capsMesh} args={[inset, undefined, cells.length]} frustumCulled={false}>
        <meshBasicMaterial />
      </instancedMesh>

      {/* Dock center glowing core */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.52, 0.52, 0.035, 6, 1]} />
        <meshStandardMaterial color="#FFF0BE" emissive="#F5B942" emissiveIntensity={1.4} roughness={0.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ModuleGlyph({ id, accent }: { id: string; accent: string }) {
  const bars =
    id === "agent"
      ? [
          [-0.24, 0, 0.09, 0.44],
          [0.24, 0, 0.09, 0.44],
          [0, 0.16, 0.54, 0.08],
          [0, -0.16, 0.54, 0.08],
          [0, 0, 0.22, 0.22],
        ]
      : id === "flow"
        ? [
            [-0.22, 0.18, 0.28, 0.08],
            [0.22, 0, 0.09, 0.46],
            [0, -0.18, 0.48, 0.08],
            [-0.1, 0, 0.08, 0.24],
          ]
        : [
            [-0.24, 0.16, 0.12, 0.08],
            [0.02, 0.16, 0.12, 0.08],
            [0.28, 0.16, 0.12, 0.08],
            [-0.12, -0.16, 0.46, 0.08],
            [0.18, -0.16, 0.14, 0.08],
          ];

  return (
    <group position-y={0.28}>
      {bars.map(([x, z, width, depth], index) => (
        <RoundedBox key={index} args={[width, 0.045, depth]} radius={0.018} smoothness={2} position={[x, 0, z]}>
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.85} roughness={0.2} metalness={0.4} toneMapped={false} />
        </RoundedBox>
      ))}
    </group>
  );
}

function ConnectorPins({ accent }: { accent: string }) {
  return (
    <group position-y={-0.15}>
      {[-0.38, -0.13, 0.13, 0.38].map((x) => (
        <RoundedBox key={x} args={[0.13, 0.1, 0.14]} radius={0.025} smoothness={2} position={[x, 0, 0.52]}>
          <meshStandardMaterial color={accent} roughness={0.25} metalness={0.88} />
        </RoundedBox>
      ))}
    </group>
  );
}

function FloatingModule({
  module,
  reducedMotion,
  shadowTex,
}: {
  module: ModuleDef;
  reducedMotion: boolean;
  shadowTex: CanvasTexture;
}) {
  const root = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const { id, x, y, z, turn, accent, phase } = module;

  useFrame(({ clock, pointer }) => {
    if (!root.current) return;
    const t = reducedMotion ? 0 : clock.elapsedTime + phase;
    const floatY = y + Math.sin(t * 0.85) * 0.12;
    const floatZ = z + Math.cos(t * 0.6) * 0.06;

    root.current.position.set(x, floatY, floatZ);
    root.current.rotation.set(
      0.16 + Math.sin(t * 0.5) * 0.03 + pointer.y * 0.025,
      turn + Math.sin(t * 0.42) * 0.045 + pointer.x * 0.04,
      Math.sin(t * 0.65) * 0.025,
    );

    if (shadow.current) {
      shadow.current.position.set(x, 0.55, floatZ);
      const s = Math.max(0.65, 1.25 - (floatY - 0.55) * 0.3);
      shadow.current.scale.set(s, s, s);
    }
  });

  return (
    <>
      {/* Module shadow projected on the dock */}
      <mesh ref={shadow} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={[2.2, 1.6]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.65} />
      </mesh>

      <group ref={root}>
        {/* Main chassis: sleek graphite chamfered cartridge */}
        <RoundedBox args={[1.56, 0.28, 1.1]} radius={0.09} smoothness={4} castShadow receiveShadow>
          <meshStandardMaterial color="#161614" roughness={0.28} metalness={0.78} />
        </RoundedBox>

        {/* Recessed circuit plate */}
        <RoundedBox args={[1.36, 0.1, 0.9]} radius={0.06} smoothness={3} position-y={0.16} castShadow>
          <meshStandardMaterial color="#2B2720" roughness={0.3} metalness={0.65} />
        </RoundedBox>

        {/* Smoked glass inner core */}
        <RoundedBox args={[1.16, 0.04, 0.7]} radius={0.04} smoothness={3} position-y={0.23}>
          <meshStandardMaterial color="#0A0A09" roughness={0.15} metalness={0.35} />
        </RoundedBox>

        <ModuleGlyph id={id} accent={accent} />
        <ConnectorPins accent={accent} />

        {/* Glowing cybernetic status LED strip */}
        <mesh position={[0, 0.27, -0.36]}>
          <boxGeometry args={[0.82, 0.02, 0.02]} />
          <meshBasicMaterial color={accent} transparent opacity={0.75} toneMapped={false} />
        </mesh>

        {/* Power indicator dot */}
        <mesh position={[0.54, 0.27, -0.34]}>
          <cylinderGeometry args={[0.024, 0.024, 0.025, 8]} />
          <meshBasicMaterial color="#FFF4D0" toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

function PulseRings({ reducedMotion }: { reducedMotion: boolean }) {
  const ring1 = useRef<Group>(null);
  const ring2 = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    if (ring1.current) {
      ring1.current.rotation.y = t * 0.35;
      ring1.current.position.y = 0.58 + Math.sin(t * 1.3) * 0.04;
    }
    if (ring2.current) {
      ring2.current.rotation.y = -t * 0.25;
      ring2.current.position.y = 0.72 + Math.cos(t * 1.1) * 0.03;
    }
  });

  return (
    <>
      <group ref={ring1}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.76, 0.016, 6, 6]} />
          <meshBasicMaterial color="#FFE3A4" transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <group ref={ring2}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.92, 0.012, 6, 6]} />
          <meshBasicMaterial color="#F5B942" transparent opacity={0.45} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

function DataTethers({ reducedMotion }: { reducedMotion: boolean }) {
  const lineMat = useRef<{ opacity: number }>({ opacity: 0.35 });

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    lineMat.current.opacity = 0.28 + Math.sin(t * 2.2) * 0.12;
  });

  const paths = useMemo(
    () =>
      MODULES.map((m) => [
        [0, 0.55, 0],
        [m.x * 0.45, m.y * 0.52 + 0.1, m.z * 0.45],
        [m.x, m.y - 0.2, m.z],
      ] as [number, number, number][]),
    [],
  );

  return (
    <>
      {paths.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={i === 2 ? "#FFE2A4" : "#F5B942"}
          transparent
          opacity={0.32}
          lineWidth={1.2}
        />
      ))}
    </>
  );
}

function BeePatrol({
  reducedMotion,
  shadowTex,
}: {
  reducedMotion: boolean;
  shadowTex: CanvasTexture;
}) {
  const count = 4;
  const sprites = useRef<(Sprite | null)[]>([]);
  const shadows = useRef<(Mesh | null)[]>([]);
  const frames = useMemo(createBeeFrames, []);
  const size = useThree((s) => s.size);
  const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);

  useEffect(() => {
    return () => {
      frames.forEach((f) => f.dispose());
    };
  }, [frames]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const w = size.width;
    const h = size.height;
    const beeY = ((BEE_H * beePx(w)) / Math.max(1, h)) * 2 * tanV;
    const beeX = beeY * (BEE_W / BEE_H);

    for (let i = 0; i < count; i++) {
      const sprite = sprites.current[i];
      const shadow = shadows.current[i];
      if (!sprite) continue;

      const phase = t * (0.42 + i * 0.08) + i * 1.57;
      const rad = 2.4 + Math.sin(phase * 1.4 + i) * 0.5;
      const x = Math.cos(phase) * rad;
      const z = Math.sin(phase) * (rad * 0.75);
      const y = 2.1 + Math.sin(phase * 2.2 + i * 1.8) * 0.45;

      sprite.position.set(x, y, z);
      const dir = -Math.sin(phase) >= 0 ? 1 : -1;
      sprite.scale.set(beeX * dir, beeY, 1);

      if (shadow) {
        shadow.position.set(x, 0.52, z);
        const s = Math.max(0.3, 0.85 - (y - 0.52) * 0.22);
        shadow.scale.set(s, s, s);
      }

      const mat = sprite.material as SpriteMaterial;
      if (mat && !reducedMotion) {
        const frame = WING_CYCLE[Math.floor(t * 12 + i * 3) % WING_CYCLE.length];
        if (mat.map !== frames[frame]) {
          mat.map = frames[frame];
          mat.needsUpdate = true;
        }
      }
    }
  });

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <group key={i}>
          <mesh ref={(m) => void (shadows.current[i] = m)} rotation-x={-Math.PI / 2} renderOrder={2}>
            <planeGeometry args={[0.9, 0.52]} />
            <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.5} />
          </mesh>
          <sprite ref={(s) => void (sprites.current[i] = s)} renderOrder={5}>
            <spriteMaterial map={frames[1]} transparent depthWrite={false} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </group>
  );
}

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<Group>(null);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const shadowTex = useMemo(createShadowTexture, []);
  const motes = useMemo(() => createMotes(70, 14, 6), []);
  const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);

  useEffect(() => {
    return () => {
      shadowTex.dispose();
      motes.geometry.dispose();
      motes.material.dispose();
    };
  }, [shadowTex, motes]);

  useFrame((state) => {
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    const w = size.width;
    const h = size.height;
    const mobile = w < 768;

    // Camera positioning with subtle sway and cursor parallax
    const dist = mobile ? 14.5 : 15.2;
    const yaw = reducedMotion ? 0 : Math.sin(t * 0.08) * 0.04 + state.pointer.x * 0.03;
    const elev = ELEVATION + (reducedMotion ? 0 : state.pointer.y * 0.025);

    camera.position.set(Math.sin(yaw) * dist, 1.2 + Math.sin(elev) * dist, Math.cos(yaw) * dist);
    camera.lookAt(mobile ? 0 : 0.8, 1.1, 0);

    motes.material.uniforms.uTime.value = t;
    motes.material.uniforms.uScale.value = (h * gl.getPixelRatio()) / (2 * tanV);

    if (root.current) {
      root.current.position.set(mobile ? 0 : 3.2, -1.05, 0);
      root.current.scale.setScalar(mobile ? 0.78 : 0.94);
      root.current.rotation.y = Math.sin(t * 0.12) * 0.02 + state.pointer.x * 0.02;
    }
  });

  return (
    <>
      <ambientLight intensity={0.52} />
      <hemisphereLight args={["#FFE7BF", "#10100F", 0.65]} />
      <directionalLight castShadow position={[-6, 10, 7]} intensity={2.6} color="#FFE7BE" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[8, 4, -6]} intensity={0.55} color="#9AA4FF" />
      <pointLight position={[3.2, 0.6, 0.4]} intensity={22} distance={14} decay={2} color="#FFB840" />
      <pointLight position={[-1.8, 2.2, -1.5]} intensity={6} distance={9} decay={2} color="#D46B2E" />

      <group ref={root}>
        <DockArray reducedMotion={reducedMotion} />
        <PulseRings reducedMotion={reducedMotion} />
        <DataTethers reducedMotion={reducedMotion} />
        {MODULES.map((module) => (
          <FloatingModule key={module.id} module={module} reducedMotion={reducedMotion} shadowTex={shadowTex} />
        ))}
        <BeePatrol reducedMotion={reducedMotion} shadowTex={shadowTex} />
      </group>

      <points geometry={motes.geometry} material={motes.material} frustumCulled={false} renderOrder={4} />
    </>
  );
}

export default function PluginScene({
  active = true,
  reducedMotion = false,
  onReady,
}: {
  active?: boolean;
  reducedMotion?: boolean;
  onReady?: () => void;
}) {
  const [maxDpr, setMaxDpr] = useState(1);
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    const cap = Math.min(window.devicePixelRatio || 1, window.matchMedia("(pointer: coarse)").matches ? 1.4 : 1.8);
    setMaxDpr(cap);
    setDpr(cap);
  }, []);

  return (
    <Canvas
      frameloop={active && !reducedMotion ? "always" : "demand"}
      dpr={dpr}
      flat
      shadows
      camera={{ fov: FOV, near: 0.1, far: 80, position: [0, 6, 15] }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        onReady?.();
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(Math.max(1, maxDpr * 0.66))}
        onIncline={() => setDpr(maxDpr)}
        onFallback={() => setDpr(1)}
      />
      <Scene reducedMotion={reducedMotion} />
    </Canvas>
  );
}
