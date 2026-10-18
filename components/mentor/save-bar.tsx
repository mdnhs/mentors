import type { ReactNode } from "react"

import { UnsavedIndicator } from "@/components/mentor/unsaved-guard"
import { cn } from "@/lib/utils"

// Sticks inside the page content and clears the phone tab bar (h-16), so it never covers navigation.
export function SaveBar({ dirty, idle = "All changes saved", children, className }: { dirty: boolean; idle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("sticky bottom-20 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/95 p-3 shadow-card backdrop-blur-md lg:bottom-4", className)}>
      <span aria-live="polite" className="min-h-6 text-sm text-muted-foreground">
        {dirty ? <UnsavedIndicator dirty /> : idle}
      </span>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
