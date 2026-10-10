import { CanvasTexture, NearestFilter } from "three";

/** The roadmap mock's 26×13 bee (wide wings, antennae), in [x, y, w, colour] runs. */
const Y = "#F5B942";
const A = "#8D8D98";
const D = "#0B0B0C";
const BODY: [number, number, number, string][] = [
  [8, 0, 1, Y], [17, 0, 1, Y], [9, 1, 1, A], [16, 1, 1, A], [10, 2, 1, A], [15, 2, 1, A],
  [9, 3, 8, Y], [8, 4, 10, Y], [8, 5, 2, Y], [10, 5, 1, D], [11, 5, 4, Y], [15, 5, 1, D], [16, 5, 2, Y],
  [8, 6, 2, Y], [10, 6, 1, D], [11, 6, 4, Y], [15, 6, 1, D], [16, 6, 2, Y], [8, 7, 10, Y],
  [8, 8, 1, Y], [9, 8, 8, D], [17, 8, 1, Y], [6, 9, 14, Y], [9, 10, 1, Y], [10, 10, 6, D], [16, 10, 1, Y],
  [9, 11, 1, Y], [11, 11, 1, Y], [14, 11, 1, Y], [16, 11, 1, Y], [9, 12, 1, Y], [11, 12, 1, Y], [14, 12, 1, Y], [16, 12, 1, Y],
];
const WINGS: [number, number, number][] = [[5, 2, 2], [5, 3, 3], [5, 4, 3], [6, 5, 2], [19, 2, 2], [18, 3, 3], [18, 4, 3], [18, 5, 2]];

export const BEE_W = 26;
export const BEE_H = 15;
/** Wing beat, as frame indices into `createBeeFrames()`. */
export const WING_CYCLE = [0, 1, 2, 3, 2, 1];

/** Four wing frames as crisp nearest-filtered textures (1 texel per sprite pixel, 1px margin for the wing travel). */
export function createBeeFrames() {
  return [0, 1, 2, 3].map((fr) => {
    const canvas = document.createElement("canvas");
    canvas.width = BEE_W;
    canvas.height = BEE_H;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(244,244,242,.8)";
    for (const [wx, wy, ww] of WINGS) {
      let y = fr === 2 || fr === 3 ? 7 - wy : wy;
      y += fr === 0 ? -1 : fr === 3 ? 1 : 0;
      ctx.fillRect(wx, y + 1, ww, 1);
    }
    for (const [x, y, w, c] of BODY) {
      ctx.fillStyle = c;
      ctx.fillRect(x, y + 1, w, 1);
    }
    const t = new CanvasTexture(canvas);
    t.magFilter = NearestFilter;
    t.minFilter = NearestFilter;
    t.generateMipmaps = false;
    return t;
  });
}
