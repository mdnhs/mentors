"use client"

import { formatDate, formatTime } from "@/lib/format"
import { useIsClient } from "@/lib/store"

export function LocalTime({ iso, timeZone }: { iso: string; timeZone: string }) {
  const isClient = useIsClient()
  if (!isClient) return null
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (local === timeZone) return null
  return (
    <span className="text-muted-foreground">
      {" "}
      · your time {formatDate(iso, local)}, {formatTime(iso, local)}
    </span>
  )
}
