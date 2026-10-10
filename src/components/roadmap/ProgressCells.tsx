import type { ProgCell } from "@/lib/roadmap/derive";

const STYLE: Record<ProgCell["state"], { bg: string; border: string }> = {
  shipped: { bg: "#C98F2E", border: "#C98F2E" },
  has: { bg: "#F5B942", border: "#F5B942" },
  open: { bg: "transparent", border: "#6E6B63" },
  none: { bg: "transparent", border: "rgba(237,234,227,.12)" },
};

const SIZE = { sm: "size-[7px]", md: "h-2 flex-1 max-w-7", lg: "h-2.5 w-[26px]" } as const;

/** One small block per roadmap item: shipped, code on main, still open, or naming no package. */
export function ProgressCells({ cells, size = "md" }: { cells: ProgCell[]; size?: keyof typeof SIZE }) {
  return (
    <span className={size === "sm" ? "flex gap-0.5" : "flex gap-0.75"}>
      {cells.map((c, i) => (
        <span key={i} title={c.title} className={`border ${SIZE[size]}`} style={{ background: STYLE[c.state].bg, borderColor: STYLE[c.state].border }} />
      ))}
    </span>
  );
}
