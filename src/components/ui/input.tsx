import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"
import { SIZES, RADIUS, SHADOWS, PADDING_X, PADDING_Y } from "@/lib/design-tokens"

const inputVariants = cva(
  cn(
    "border-input file:text-foreground placeholder:text-muted-foreground",
    "selection:bg-primary selection:text-primary-foreground",
    "flex w-full min-w-0 border bg-transparent text-base",
    "transition-[color,box-shadow] outline-none",
    "file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    "md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    RADIUS.md,        // rounded-md
    SHADOWS.sm        // shadow-xs
  ),
  {
    variants: {
      size: {
        sm: cn(
          SIZES.input.sm,      // h-8
          "px-2.5",            // Custom value for precise spacing
          PADDING_Y.xs,        // py-1
          "text-sm"
        ),
        default: cn(
          SIZES.button.md,     // h-9 (using button size for consistency)
          PADDING_X.sm,        // px-3
          PADDING_Y.xs         // py-1
        ),
        lg: cn(
          SIZES.input.md,      // h-10
          PADDING_X.md,        // px-4
          PADDING_Y.sm         // py-2
        ),
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

function Input({ className, type, size, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
