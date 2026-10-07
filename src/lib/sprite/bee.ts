/** 16×13 pixel bee — same geometry as the Hive mark. Rects are [x, y, w, h]. */
type Rect = readonly [number, number, number, number];

const mirror = (rs: readonly Rect[]): Rect[] => rs.map(([x, y, w, h]) => [16 - x - w, y, w, h] as const);
const WING_UP: Rect[] = [[0, 2, 2, 1], [0, 3, 3, 2], [1, 5, 2, 1]];
const WING_DOWN: Rect[] = [[0, 4, 3, 2], [1, 6, 2, 1]];

const SPRITE = {
  wingUp: WING_UP.concat(mirror(WING_UP)),
  wingDown: WING_DOWN.concat(mirror(WING_DOWN)),
  stalks: [[4, 1, 1, 1], [5, 2, 1, 1], [11, 1, 1, 1], [10, 2, 1, 1]] as Rect[],
  tips: [[3, 0, 1, 1], [12, 0, 1, 1]] as Rect[],
  body: [[4, 3, 8, 1], [3, 4, 10, 6], [4, 10, 8, 1]] as Rect[],
  stripes: [[4, 8, 8, 1], [5, 10, 6, 1]] as Rect[],
  legs: [[4, 11, 1, 2], [6, 11, 1, 2], [9, 11, 1, 2], [11, 11, 1, 2]] as Rect[],
  arms: [[1, 9, 2, 1], [13, 9, 2, 1]] as Rect[],
  eyes: [[5, 5, 1, 2], [10, 5, 1, 2]] as Rect[],
  eyesShut: [[5, 6, 1, 1], [10, 6, 1, 1]] as Rect[],
  eyesWide: [[5, 4, 1, 3], [10, 4, 1, 3]] as Rect[],
};

export const BEE_COLORS = {
  honey: "#F5B942",
  ink: "#0B0B0C",
  wing: "rgba(244,244,242,.82)",
  stalk: "#9B9BA1",
  violet: "#8B7CFF",
} as const;

export interface BeePose {
  wingDown?: boolean;
  /** Eye offset in sprite pixels. */
  ex?: number;
  ey?: number;
  arm?: number;
  leg?: number;
  eyes?: "open" | "shut" | "wide";
  tip?: string;
}

/** Sprite pixel size and top-left origin for a bee centred on (cx, cy). */
export const beeFrame = (cx: number, cy: number, S: number) => {
  const px = Math.max(2, Math.round(S));
  return { px, x0: Math.round(cx - 8 * px), y0: Math.round(cy - 6.5 * px) };
};

export function drawBee(ctx: CanvasRenderingContext2D, cx: number, cy: number, S: number, pose: BeePose = {}) {
  const { px, x0, y0 } = beeFrame(cx, cy, S);
  const fill = (rs: readonly Rect[], color: string, dx = 0, dy = 0) => {
    ctx.fillStyle = color;
    for (const [x, y, w, h] of rs) ctx.fillRect(x0 + (x + dx) * px, y0 + (y + dy) * px, w * px, h * px);
  };
  fill(pose.wingDown ? SPRITE.wingDown : SPRITE.wingUp, BEE_COLORS.wing);
  fill(SPRITE.stalks, BEE_COLORS.stalk);
  fill(SPRITE.tips, pose.tip ?? BEE_COLORS.honey);
  fill(SPRITE.body, BEE_COLORS.honey);
  fill(SPRITE.stripes, BEE_COLORS.ink);
  fill(SPRITE.legs, BEE_COLORS.honey, 0, pose.leg ?? 0);
  fill(SPRITE.arms, BEE_COLORS.honey, 0, pose.arm ?? 0);
  const eyes = pose.eyes ?? "open";
  if (eyes === "shut") fill(SPRITE.eyesShut, BEE_COLORS.ink);
  else if (eyes === "wide") fill(SPRITE.eyesWide, BEE_COLORS.ink, pose.ex ?? 0, 0);
  else fill(SPRITE.eyes, BEE_COLORS.ink, pose.ex ?? 0, pose.ey ?? 0);
}

/** Pixel thought bubble with 0–3 "thinking" dots, drawn above-right of the bee. */
export function drawThought(ctx: CanvasRenderingContext2D, cx: number, cy: number, S: number, dots: number) {
  const { px, x0, y0 } = beeFrame(cx, cy, S);
  ctx.fillStyle = "rgba(237,234,227,.92)";
  ctx.fillRect(x0 + 14 * px, y0 - px, px, px);
  ctx.fillRect(x0 + 15.5 * px, y0 - 3 * px, px * 1.5, px * 1.5);
  const bx = x0 + 16 * px;
  const by = y0 - 9 * px;
  ctx.fillRect(bx + px, by, 7 * px, 5 * px);
  ctx.fillRect(bx, by + px, 9 * px, 3 * px);
  ctx.fillStyle = BEE_COLORS.ink;
  for (let i = 0; i < dots; i++) ctx.fillRect(bx + (2 + i * 2) * px, by + 2 * px, px, px);
}
