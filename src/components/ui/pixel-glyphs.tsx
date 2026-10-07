import { cn } from "cn"

type Cell = "bone" | "honey" | null

const FILL: Record<Exclude<Cell, null>, string> = { bone: "bg-bone", honey: "bg-honey" }

/** 3×3 dot matrix with an amber core — the menu "hamburger". */
const GRID: Cell[] = ["bone", "bone", "bone", "bone", "honey", "bone", "bone", "bone", "bone"]
/** 3×3 checker forming an ×, amber core — the close glyph. */
const CROSS: Cell[] = ["bone", null, "bone", null, "honey", null, "bone", null, "bone"]

function PixelMatrix({ cells, dot, gap, className }: { cells: Cell[]; dot: number; gap: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid place-content-center", className)}
      style={{ gridTemplateColumns: `repeat(3, ${dot}px)`, gap }}
    >
      {cells.map((c, i) => (
        <span
          key={i}
          data-cell={c ?? "empty"}
          className={cn("block transition-transform duration-150 ease-[steps(2)]", c && FILL[c])}
          style={{ width: dot, height: dot }}
        />
      ))}
    </span>
  )
}

export function PixelGridGlyph({ className }: { className?: string }) {
  return <PixelMatrix cells={GRID} dot={4} gap={4} className={className} />
}

export function PixelCrossGlyph({ className }: { className?: string }) {
  return <PixelMatrix cells={CROSS} dot={3} gap={2} className={className} />
}
