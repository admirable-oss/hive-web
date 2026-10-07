import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import {
  Button as ButtonPrimitive,
  Link as LinkPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components"

/**
 * Hive buttons are boxy: no radius, stepped (`steps()`) transitions and
 * "pixel" corners on filled variants. Interaction styles key off
 * react-aria's data attributes so hover never sticks on touch devices.
 */
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-3 font-sans whitespace-nowrap outline-none select-none transition-[color,background-color,border-color,transform] duration-150 ease-[steps(2)] data-disabled:pointer-events-none data-disabled:opacity-50 data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-honey [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Amber, pixel corners — "Install". */
        primary:
          "clip-pixel-4 bg-honey font-medium text-ink data-hovered:bg-bone data-hovered:text-ink data-pressed:translate-y-px data-focus-visible:-outline-offset-4 data-focus-visible:outline-ink",
        /** Bone, larger pixel corners — hero "Read the docs". */
        inverse:
          "clip-pixel-5 bg-bone font-medium text-ink data-hovered:bg-honey data-hovered:text-ink data-pressed:translate-y-px data-focus-visible:-outline-offset-4 data-focus-visible:outline-ink",
        /** Hairline outline — "GitHub ↗". */
        secondary:
          "border border-bone/14 bg-transparent text-bone data-hovered:border-bone/40 data-hovered:text-bone",
        /** Text-only nav item. */
        ghost: "text-fog data-hovered:bg-graphite data-hovered:text-bone",
        /** Dark chip used inside command boxes — "COPY". */
        quiet:
          "bg-graphite font-mono tracking-[.18em] text-bone data-hovered:bg-graphite-hi data-hovered:text-bone",
        link: "text-honey underline-offset-4 data-hovered:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-14 px-6 text-base",
        chip: "h-10 px-3.5 text-[11px]",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "sm",
    },
  }
)

type ButtonVariantProps = VariantProps<typeof buttonVariants> & { className?: string }

function Button({
  className,
  variant = "primary",
  size = "sm",
  ...props
}: Omit<ButtonPrimitiveProps, "className"> & React.RefAttributes<HTMLButtonElement> & ButtonVariantProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function LinkButton({
  className,
  variant = "primary",
  size = "sm",
  ...props
}: Omit<LinkPrimitiveProps, "className"> & React.RefAttributes<HTMLAnchorElement> & ButtonVariantProps) {
  return (
    <LinkPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, LinkButton, buttonVariants }
