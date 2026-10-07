import { cn } from "cn";
import { MARK_LAYERS, WORDMARK_LAYERS, WORDMARK_WIDTH, type PixelLayer } from "./logo-paths";

const MARK_W = 16;
const GAP = 4;
const H = 13;

const Layers = ({ layers, x = 0 }: { layers: PixelLayer[]; x?: number }) => (
  <g transform={x ? `translate(${x} 0)` : undefined}>
    {layers.map((l) => (
      <path key={l.fill + l.opacity} d={l.d} fill={l.fill} fillOpacity={l.opacity === 1 ? undefined : l.opacity} />
    ))}
  </g>
);

interface LogoProps {
  variant?: "lockup" | "mark" | "wordmark";
  className?: string;
  /** Accessible name; pass "" when the logo is decorative. */
  title?: string;
}

/** Pixel-perfect inline Hive logo (bee mark + "hive" wordmark). */
export function Logo({ variant = "lockup", className, title = "Hive" }: LogoProps) {
  const width =
    variant === "mark" ? MARK_W : variant === "wordmark" ? WORDMARK_WIDTH : MARK_W + GAP + WORDMARK_WIDTH;
  return (
    <svg
      viewBox={`0 0 ${width} ${H}`}
      shapeRendering="crispEdges"
      className={cn("block h-7 w-auto", className)}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      {variant !== "wordmark" && <Layers layers={MARK_LAYERS} />}
      {variant !== "mark" && <Layers layers={WORDMARK_LAYERS} x={variant === "lockup" ? MARK_W + GAP : 0} />}
    </svg>
  );
}
