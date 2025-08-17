import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm",
  {
    variants: {
      size: {
        sm: "gap-4 py-4",
        default: "gap-6 py-6",
        lg: "gap-8 py-8",
      },
      variant: {
        default: "border-border",
        ghost: "border-transparent shadow-none",
        outline: "border-border bg-transparent shadow-none",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

function Card({ className, size, variant, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ size, variant, className }))}
      {...props}
    />
  )
}

const cardHeaderVariants = cva("flex flex-col", {
  variants: {
    size: {
      sm: "gap-1 px-4",
      default: "gap-1.5 px-6",
      lg: "gap-2 px-8",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

interface CardHeaderProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardHeaderVariants> {}

function CardHeader({ className, size, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(cardHeaderVariants({ size, className }))}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

const cardContentVariants = cva("", {
  variants: {
    size: {
      sm: "px-4",
      default: "px-6",
      lg: "px-8",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

interface CardContentProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardContentVariants> {}

function CardContent({ className, size, ...props }: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn(cardContentVariants({ size, className }))}
      {...props}
    />
  )
}

const cardFooterVariants = cva("flex items-center", {
  variants: {
    size: {
      sm: "px-4",
      default: "px-6",
      lg: "px-8",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

interface CardFooterProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardFooterVariants> {}

function CardFooter({ className, size, ...props }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(cardFooterVariants({ size, className }))}
      {...props}
    />
  )
}

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants,
  cardHeaderVariants,
  cardContentVariants,
  cardFooterVariants
}