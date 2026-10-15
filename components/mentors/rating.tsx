import { StarIcon } from "lucide-react"

import { getRating } from "@/lib/data"
import { cn } from "@/lib/utils"

export function Rating({ slug, className }: { slug: string; className?: string }) {
  const rating = getRating(slug)

  if (!rating) {
    return <span className={cn("text-xs font-medium text-accent-foreground", className)}>New mentor</span>
  }

  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <StarIcon className="size-3.5 fill-rating text-rating" aria-hidden="true" />
      <span className="font-medium">{rating.average.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({rating.count}
        <span className="sr-only"> reviews</span>)
      </span>
    </span>
  )
}
