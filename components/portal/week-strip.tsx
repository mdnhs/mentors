import Link from "next/link"

import { formatTime } from "@/lib/format"
import { addDays, dateKeyInZone, weekdayOf } from "@/lib/timezone"
import { cn } from "@/lib/utils"

export type WeekEvent = { id: string; startsAt: string; title: string; href?: string; muted?: boolean }

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// The next seven days at a glance; each day lists its sessions so a busy week is visible without reading.
export function WeekStrip({ events, now, timeZone, className }: { events: WeekEvent[]; now: Date; timeZone: string; className?: string }) {
  const today = dateKeyInZone(now.getTime(), timeZone)
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index))
  const byDay = new Map(days.map((day) => [day, [] as WeekEvent[]]))
  for (const event of [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    byDay.get(dateKeyInZone(new Date(event.startsAt).getTime(), timeZone))?.push(event)
  }

  return (
    <ol aria-label="Next seven days" className={cn("scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-7 sm:overflow-visible sm:px-0", className)}>
      {days.map((day) => {
        const items = byDay.get(day) ?? []
        const isToday = day === today
        const label = `${weekdays[weekdayOf(day)]} ${Number(day.slice(8))}`
        return (
          <li
            key={day}
            aria-label={`${isToday ? "Today, " : ""}${label}: ${items.length === 0 ? "nothing booked" : `${items.length} ${items.length === 1 ? "session" : "sessions"}`}`}
            className={cn(
              "flex min-h-32 w-28 shrink-0 snap-start flex-col rounded-xl border bg-card p-2.5 sm:w-auto",
              isToday && "border-primary/40 ring-1 ring-primary/20"
            )}
          >
            <p className="flex items-baseline justify-between">
              <span className={cn("text-xs", isToday ? "font-medium text-primary" : "text-muted-foreground")}>{isToday ? "Today" : weekdays[weekdayOf(day)]}</span>
              <span className={cn("text-lg font-semibold tabular-nums", !isToday && items.length === 0 && "text-muted-foreground/60")}>{Number(day.slice(8))}</span>
            </p>
            <ul className="mt-2 flex flex-1 flex-col gap-1.5">
              {items.map((event) => {
                const chip = (
                  <>
                    <span className="block text-xs tabular-nums opacity-80">{formatTime(event.startsAt, timeZone)}</span>
                    <span className="line-clamp-2 text-xs font-medium">{event.title}</span>
                  </>
                )
                const chipClass = cn("block rounded-lg px-2 py-1.5", event.muted ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground")
                return (
                  <li key={event.id}>
                    {event.href ? (
                      <Link href={event.href} className={cn(chipClass, "transition-colors hover:bg-primary hover:text-primary-foreground focus-ring")}>
                        {chip}
                      </Link>
                    ) : (
                      <span className={chipClass}>{chip}</span>
                    )}
                  </li>
                )
              })}
              {items.length === 0 && <li aria-hidden="true" className="mt-auto h-1 rounded-full bg-muted" />}
            </ul>
          </li>
        )
      })}
    </ol>
  )
}
