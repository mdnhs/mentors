import Link from "next/link"
import { ClockIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { DateBlock } from "@/components/sessions/date-block"
import { SeatsMeter } from "@/components/sessions/seats-meter"
import { getCategory } from "@/lib/categories"
import { getMentor } from "@/lib/data"
import { formatDuration, formatPrice, formatTime } from "@/lib/format"
import type { GroupSession } from "@/lib/types"
import { cn } from "@/lib/utils"

export function SessionCard({ session, className }: { session: GroupSession; className?: string }) {
  const mentor = getMentor(session.mentorSlug)!
  const category = getCategory(session.category)

  return (
    <article
      className={cn(
        "group relative flex flex-col surface-interactive p-5",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <DateBlock iso={session.startsAt} />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <category.icon className="size-3.5" aria-hidden="true" />
            {category.label}
          </p>
          <h3 className="mt-1 leading-snug font-semibold">{session.title}</h3>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-7" />
          <span className="truncate">{mentor.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <ClockIcon className="size-3.5" aria-hidden="true" />
          {formatTime(session.startsAt)} · {formatDuration(session.durationMinutes)}
        </span>
      </div>

      {session.seats && <SeatsMeter seats={session.seats} className="mt-4" />}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <p className="text-sm">
          <span className="text-base font-semibold">{formatPrice(session.price)}</span>
          <span className="text-muted-foreground"> / seat</span>
        </p>
        <Link
          href={`/sessions/${session.id}`}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors outline-none group-hover:bg-primary group-hover:text-primary-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          Reserve seat<span className="sr-only"> for {session.title}</span>
        </Link>
      </div>
    </article>
  )
}
