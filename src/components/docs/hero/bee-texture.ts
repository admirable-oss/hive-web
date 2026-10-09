import { CanvasTexture, NearestFilter } from "three";
import { drawBee, drawThought, type BeePose } from "@/lib/sprite/bee";

/** Canvas in sprite pixels: room for the 16×13 bee plus its thought bubble above-right. */
const W = 26;
const H = 23;
const CX = 8;
const CY = 16;
const PX = 4;

/** World units per sprite pixel. */
const UNIT = 0.08;
export const BEE_SCALE: [number, number, number] = [W * UNIT, H * UNIT, 1];
/** Sprite anchor (UV, y up) at the bee's centre, so the bubble hangs off to the side. */
export const BEE_CENTER: [number, number] = [CX / W, 1 - CY / H];

/** The brand pixel bee as a crisp billboard texture, redrawn only when its pose changes. */
export function createBeeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = W * PX;
  canvas.height = H * PX;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");

  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;

  let last = "";
  const draw = (pose: BeePose, dots: number) => {
    const key = `${pose.wingDown}${pose.eyes}${pose.ex}${pose.ey}${pose.tip}${dots}`;
    if (key === last) return;
    last = key;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBee(ctx, CX * PX, CY * PX, PX, pose);
    if (dots > 0) drawThought(ctx, CX * PX, CY * PX, PX, dots);
    texture.needsUpdate = true;
  };

  return { texture, draw };
}
