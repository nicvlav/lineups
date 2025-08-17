import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils/cn"
import { COMPONENT_TOKENS } from "@/lib/design-tokens/component-tokens"
import { GAP, SIZES, RADIUS, SHADOWS } from "@/lib/design-tokens"

const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium",
    "transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    GAP.sm,           // gap-2
    RADIUS.md,        // rounded-md
    `[&_svg:not([class*='size-'])]:${COMPONENT_TOKENS.button.iconSize.default}` // size-4
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary text-primary-foreground hover:bg-primary/90",
          SHADOWS.sm
        ),
        destructive: cn(
          "bg-destructive text-white hover:bg-destructive/90",
          "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          SHADOWS.sm
        ),
        outline: cn(
          "border border-input bg-background",
          "hover:bg-accent hover:text-accent-foreground",
          SHADOWS.sm
        ),
        secondary: cn(
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          SHADOWS.sm
        ),
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: cn(
          SIZES.button.md,                    // h-9
          COMPONENT_TOKENS.button.padding.default, // px-4 py-2
          "has-[>svg]:px-3"
        ),
        sm: cn(
          SIZES.button.sm,                    // h-8
          COMPONENT_TOKENS.button.padding.sm, // px-3 py-1
          "gap-1.5 has-[>svg]:px-2.5"
        ),
        lg: cn(
          SIZES.button.lg,                    // h-10
          COMPONENT_TOKENS.button.padding.lg, // px-6 py-2
          "has-[>svg]:px-4"
        ),
        icon: SIZES.button.md,                // size-9 (h-9 w-9)
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
