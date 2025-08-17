import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

import { cn } from "@/lib/utils/cn"
import { COMPONENT_TOKENS } from "@/lib/design-tokens/component-tokens"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator-root"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0",
        orientation === "horizontal" 
          ? COMPONENT_TOKENS.separator.horizontal 
          : COMPONENT_TOKENS.separator.vertical,
        className
      )}
      {...props}
    />
  )
}

export { Separator }
