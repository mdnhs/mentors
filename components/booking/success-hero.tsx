import type { ReactNode } from "react"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SuccessHeroProps = {
  title: string
  description: ReactNode
  heading?: "h1" | "h2" | "h3"
  compact?: boolean
  className?: string
}

export function SuccessHero({ title, description, heading: Heading = "h1", compact = false, className }: SuccessHeroProps) {
  return (
    <div className={cn("text-center", className)}>
      <span
        className={cn(
          "mx-auto flex items-center justify-center rounded-full bg-success-soft text-success",
          compact ? "size-12 ring-4 ring-success-soft/50" : "size-14 ring-8 ring-success-soft/50"
        )}
      >
        <CheckIcon className={compact ? "size-6" : "size-7"} aria-hidden="true" />
      </span>
      <div role="status">
        <Heading className={cn(compact ? "mt-4 text-subheading" : "mt-6 text-heading")}>{title}</Heading>
        <p className={cn("mt-2 text-muted-foreground", compact && "text-sm")}>{description}</p>
      </div>
    </div>
  )
}
