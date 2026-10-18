"use client"

import Link from "next/link"
import { ClockIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { DateBlock } from "@/components/sessions/date-block"
import { SeatsMeter } from "@/components/sessions/seats-meter"
import { SessionBadge } from "@/components/sessions/session-badge"
import { useSessionView } from "@/components/sessions/use-session-view"
import { getCategory } from "@/lib/categories"
import { getMentor } from "@/lib/data"
import { formatDuration, formatPrice, formatTime } from "@/lib/format"
import type { GroupSession } from "@/lib/types"
import { cn } from "@/lib/utils"

export function SessionCard({ session: base, className }: { session: GroupSession; className?: string }) {
  const view = useSessionView(base)
  const { session } = view
  const mentor = getMentor(session.mentorSlug)!
  const category = getCategory(session.category)
  const inactive = view.phase !== "scheduled"
  const cta = view.learner === "enrolled" || view.learner === "pending" ? "View" : view.check.open ? "Reserve seat" : "View details"

  return (
    <article className={cn("group relative flex flex-col surface-interactive p-5", inactive && "opacity-80", className)}>
      <div className="flex items-start gap-4">
        <DateBlock iso={session.startsAt} timeZone={session.timezone} className={cn(inactive && "opacity-60")} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <category.icon className="size-3.5" aria-hidden="true" />
              {category.label}
            </span>
            <SessionBadge view={view} />
          </p>
          <h3 className={cn("mt-1 leading-snug font-semibold", view.phase === "cancelled" && "line-through decoration-1")}>{session.title}</h3>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-10" />
        <div className="min-w-0 text-sm">
          <p className="truncate font-medium">{mentor.name}</p>
          <p className="flex items-center gap-1 text-muted-foreground">
            <ClockIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {formatTime(session.startsAt, session.timezone)} · {formatDuration(session.durationMinutes)}
          </p>
        </div>
      </div>

      {!inactive && <SeatsMeter seats={{ total: session.seats.total, taken: session.seats.total - view.left }} className="mt-4" />}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <p className="text-sm">
          <span className="text-base font-semibold">{formatPrice(session.price)}</span>
          <span className="text-muted-foreground"> / seat</span>
        </p>
        <Link
          href={`/sessions/${session.id}`}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors outline-none group-hover:bg-primary group-hover:text-primary-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {cta}
          <span className="sr-only"> for {session.title}</span>
        </Link>
      </div>
    </article>
  )
}
