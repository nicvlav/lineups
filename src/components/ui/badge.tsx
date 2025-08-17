import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"
import { RADIUS, SHADOWS, ANIMATIONS } from "@/lib/design-tokens"
import { COMPONENT_TOKENS } from "@/lib/design-tokens/component-tokens"

const badgeVariants = cva(
  cn(
    "inline-flex items-center border font-semibold",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    COMPONENT_TOKENS.badge.padding.default,  // px-2.5 py-0.5
    COMPONENT_TOKENS.badge.text.default,      // text-xs
    RADIUS.md,                                // rounded-md
    ANIMATIONS.transition.fast                // transition-colors
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
          SHADOWS.sm
        ),
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: cn(
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
          SHADOWS.sm
        ),
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }