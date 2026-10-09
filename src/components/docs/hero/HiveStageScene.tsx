import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, ShaderMaterial, type Mesh, type Sprite } from "three";
import { BEE_CENTER, BEE_SCALE, createBeeTexture } from "./bee-texture";
import { BeeBrain, type BeeEvent, type BeeStatus } from "./brain";
import { buildCells, cellAt, createCombGeometry, createCombMaterial, RIPPLES } from "./comb";

const FOV = 32;
/** Seconds between heartbeat rings, and how fast they travel (units/s). */
const BEAT_EVERY = 4.2;
const BEAT_SPEED = 3.4;

export interface HiveStageSceneProps {
  /** Animate (false offscreen and for reduced motion: one still frame). */
  active: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  /** Receives the bee's status ~10×/s for the DOM HUD. */
  onStatus: RefObject<((s: BeeStatus) => void) | null>;
}

/* ------------------------------------------------------------- sparks */

const SPARKS = 64;

/** Honey pixels: drips while the bee works, a burst when a cell is finished. */
function createSparks() {
  const pos = new Float32Array(SPARKS * 3);
  const vel = new Float32Array(SPARKS * 3);
  const life = new Float32Array(SPARKS);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(pos, 3));
  geometry.setAttribute("aLife", new BufferAttribute(life, 1));
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uScale: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute float aLife;
      uniform float uScale;
      varying float vLife;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vLife = aLife;
        gl_PointSize = aLife > 0.0 ? floor(0.09 * uScale / -mv.z) + 2.0 : 0.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() { gl_FragColor = vec4(0.961, 0.725, 0.259, clamp(vLife * 2.0, 0.0, 1.0)); }`,
  });
  let next = 0;
  return {
    geometry,
    material,
    emit(e: Extract<BeeEvent, { kind: "spark" }>) {
      const i = next++ % SPARKS;
      pos.set([e.x, e.y, e.z], i * 3);
      vel.set([e.vx, e.vy, e.vz], i * 3);
      life[i] = 1;
    },
    update(dt: number) {
      for (let i = 0; i < SPARKS; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt * 0.9;
        vel[i * 3 + 1] -= 7 * dt;
        for (let k = 0; k < 3; k++) pos[i * 3 + k] += vel[i * 3 + k] * dt;
        if (pos[i * 3 + 1] < 0.05) {
          pos[i * 3 + 1] = 0.05;
          life[i] = Math.min(life[i], 0.15);
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aLife.needsUpdate = true;
    },
  };
}

/* --------------------------------------------------------------- hive */

function Hive({ reducedMotion, onStatus }: Pick<HiveStageSceneProps, "reducedMotion" | "onStatus">) {
  const cells = useMemo(buildCells, []);
  const brain = useMemo(() => new BeeBrain(cells), [cells]);
  const geometry = useMemo(() => createCombGeometry(cells), [cells]);
  const material = useMemo(createCombMaterial, []);
  const bee = useMemo(createBeeTexture, []);
  const sparks = useMemo(createSparks, []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      bee.texture.dispose();
      sparks.geometry.dispose();
      sparks.material.dispose();
    },
    [geometry, material, bee, sparks],
  );
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!reducedMotion) return;
    brain.pose0();
    invalidate();
  }, [brain, reducedMotion, invalidate]);

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const beeRef = useRef<Sprite>(null);
  const shadowRef = useRef<Mesh>(null);
  const ripple = useRef(0);
  const hudT = useRef(0);

  useEffect(() => {
    sparks.material.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((FOV / 2) * (Math.PI / 180)));
  }, [size.height, gl, sparks]);

  useFrame((state, dt) => {
    if (!reducedMotion) brain.step(dt);
    const t = brain.t;
    const u = material.uniforms;
    u.uTime.value = t;
    u.uBeat.value = reducedMotion ? -10 : (t % BEAT_EVERY) * BEAT_SPEED - 1.5;
    u.uBee.value.set(brain.pos.x, brain.pos.z);

    const fill = geometry.getAttribute("aFill") as BufferAttribute;
    const cellState = geometry.getAttribute("aState") as BufferAttribute;
    (fill.array as Float32Array).set(brain.fill);
    (cellState.array as Float32Array).set(brain.state);
    fill.needsUpdate = true;
    cellState.needsUpdate = true;

    for (const e of brain.events) {
      if (e.kind === "ripple") u.uRipples.value[ripple.current++ % RIPPLES].set(e.x, e.z, t, e.strength);
      else sparks.emit(e);
    }
    brain.events.length = 0;
    sparks.update(reducedMotion ? 0 : dt);

    const { x, y, z } = brain.pos;
    beeRef.current?.position.set(x, y, z);
    bee.draw(brain.pose, brain.pose.dots);
    if (shadowRef.current) {
      shadowRef.current.position.set(x, 0.12, z);
      const s = Math.max(0.5, 1.15 - y * 0.18);
      shadowRef.current.scale.set(s, s, s);
    }

    // Gentle parallax toward the cursor.
    camera.position.x += (state.pointer.x * 0.9 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y = 14 + state.pointer.y * 0.4;
    camera.lookAt(0, 0, 0.9);

    hudT.current += dt;
    if (hudT.current > 0.1 || reducedMotion) {
      hudT.current = 0;
      onStatus.current?.(brain.status());
    }
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    brain.pointer = { x: e.point.x, z: e.point.z };
    gl.domElement.style.cursor = cellAt(cells, e.point.x, e.point.z) >= 0 ? "pointer" : "";
  };
  const onLeave = () => {
    brain.pointer = null;
    gl.domElement.style.cursor = "";
  };

  return (
    <>
      <instancedMesh args={[geometry, material, cells.length]} frustumCulled={false} />
      {/* Invisible ground plane: the cursor's footprint on the comb. */}
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={0.1}
        onPointerMove={onMove}
        onPointerOut={onLeave}
        onClick={(e) => brain.tap(e.point.x, e.point.z)}
      >
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
      <mesh ref={shadowRef} rotation-x={-Math.PI / 2} renderOrder={5}>
        <circleGeometry args={[0.42, 6]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <points geometry={sparks.geometry} material={sparks.material} frustumCulled={false} renderOrder={9} />
      <sprite ref={beeRef} center={BEE_CENTER} scale={BEE_SCALE} renderOrder={10}>
        <spriteMaterial map={bee.texture} transparent depthTest={false} depthWrite={false} />
      </sprite>
    </>
  );
}

/**
 * The docs hero's living comb: an instanced honeycomb that breathes and
 * pulses with a heartbeat, ripples when work lands, and a pixel worker bee
 * with a small brain (see brain.ts) roaming it. Loaded lazily by HiveStage.
 */
export default function HiveStageScene({ active, reducedMotion, onReady, onStatus }: HiveStageSceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "demand"}
      dpr={[1, 1.75]}
      flat
      linear
      camera={{ fov: FOV, near: 0.5, far: 80, position: [0, 14, 13] }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        camera.lookAt(0, 0, 0.9);
        onReady();
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Hive reducedMotion={reducedMotion} onStatus={onStatus} />
    </Canvas>
  );
}
