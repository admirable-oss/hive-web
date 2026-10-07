import type * as React from "react"
import { cn } from "cn"
import { Button as ButtonPrimitive, type ButtonProps } from "react-aria-components"
import { PixelGridGlyph } from "./pixel-glyphs"

/**
 * 44×44 menu trigger: a 3×3 pixel grid with an amber core. On hover the
 * outer ring of dots steps one pixel outward.
 */
function GridMenuButton({
  className,
  ...props
}: Omit<ButtonProps, "className" | "children"> & React.RefAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <ButtonPrimitive
      data-slot="grid-menu-button"
      className={cn(
        "group/menu grid size-11 shrink-0 place-content-center outline-none data-focus-visible:outline-2 data-focus-visible:outline-honey",
        // Outer dots nudge outward on hover (index-based offsets).
        "data-hovered:[&_[data-cell]:nth-child(1)]:-translate-x-px data-hovered:[&_[data-cell]:nth-child(1)]:-translate-y-px",
        "data-hovered:[&_[data-cell]:nth-child(2)]:-translate-y-px",
        "data-hovered:[&_[data-cell]:nth-child(3)]:translate-x-px data-hovered:[&_[data-cell]:nth-child(3)]:-translate-y-px",
        "data-hovered:[&_[data-cell]:nth-child(4)]:-translate-x-px",
        "data-hovered:[&_[data-cell]:nth-child(6)]:translate-x-px",
        "data-hovered:[&_[data-cell]:nth-child(7)]:-translate-x-px data-hovered:[&_[data-cell]:nth-child(7)]:translate-y-px",
        "data-hovered:[&_[data-cell]:nth-child(8)]:translate-y-px",
        "data-hovered:[&_[data-cell]:nth-child(9)]:translate-x-px data-hovered:[&_[data-cell]:nth-child(9)]:translate-y-px",
        className
      )}
      {...props}
    >
      <PixelGridGlyph />
    </ButtonPrimitive>
  )
}

export { GridMenuButton }
