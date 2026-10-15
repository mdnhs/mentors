"use client"

import { cn } from "@/lib/utils"

type ChipProps = React.ComponentProps<"button"> & { active: boolean }

export function Chip({ active, className, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm whitespace-nowrap transition focus-ring [&_svg]:size-4",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-card text-foreground hover:border-foreground/30",
        className
      )}
      {...props}
    />
  )
}
