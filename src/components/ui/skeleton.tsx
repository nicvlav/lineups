import { cn } from "@/lib/utils/cn"
import { COMPONENT_TOKENS } from "@/lib/design-tokens/component-tokens"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(COMPONENT_TOKENS.skeleton.base, className)}
      {...props}
    />
  )
}

export { Skeleton }
