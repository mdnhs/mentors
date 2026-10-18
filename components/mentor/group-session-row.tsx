"use client"

import Link from "next/link"
import { toast } from "sonner"

import { DateBlock } from "@/components/sessions/date-block"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDuration, formatTime, timezoneLabel } from "@/lib/format"
import { seatShare } from "@/lib/mentor-insights"
import { cancelSessionAndRefund } from "@/lib/payment-client"
import type { Actor } from "@/lib/permissions"
import { sessionPhase } from "@/lib/sessions"
import type { GroupSession } from "@/lib/types"
import { cn } from "@/lib/utils"

const phaseBadge = {
  scheduled: { label: "Scheduled", tone: "accent" },
  completed: { label: "Ended", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const

export function GroupSessionRow({ session, taken, now, actor, mentorTimezone }: { session: GroupSession; taken: number; now: Date; actor: Actor | null; mentorTimezone: string }) {
  const phase = sessionPhase(session, now)
  const share = seatShare(taken, session.seats.total)
  const canCancel = session.status !== "cancelled" && new Date(session.startsAt) > now

  const cancel = async () => {
    const outcome = await cancelSessionAndRefund(actor, session.id)
    if (outcome.ok) toast.success(`${session.title} cancelled. Everyone enrolled is refunded.`)
    else toast.error(outcome.message)
  }

  return (
    <li className="flex items-start gap-4 py-4">
      <DateBlock iso={session.startsAt} timeZone={mentorTimezone} className={cn(phase !== "scheduled" && "bg-muted text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
          <div className="min-w-0">
            <Link href={`/sessions/${session.id}`} className={cn("rounded-sm font-medium hover:underline focus-ring", phase === "cancelled" && "line-through")}>
              {session.title}
            </Link>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatTime(session.startsAt, mentorTimezone)} {timezoneLabel(mentorTimezone, session.startsAt).split(" ")[0]}
              <span className="ml-3">{formatDuration(session.durationMinutes)}</span>
            </p>
          </div>
          <Badge tone={phaseBadge[phase].tone}>{phaseBadge[phase].label}</Badge>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={`Seats filled for ${session.title}`}
            aria-valuemin={0}
            aria-valuemax={session.seats.total}
            aria-valuenow={taken}
            aria-valuetext={`${taken} of ${session.seats.total} seats taken`}
            className="h-1.5 max-w-60 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div className={cn("h-full rounded-full", phase === "cancelled" ? "bg-muted-foreground/40" : "bg-primary")} style={{ width: `${share * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {taken} of {session.seats.total} seats taken
          </span>
        </div>

        {canCancel && (
          <div className="mt-3">
            <ConfirmAction
              destructive
              trigger={
                <Button variant="ghost" size="sm">
                  Cancel session
                </Button>
              }
              title={`Cancel ${session.title}?`}
              description={<p>Everyone enrolled is refunded in full and new sign-ups close. Demo only: no real transfer is made.</p>}
              confirmLabel="Cancel for everyone"
              busyLabel="Cancelling…"
              cancelLabel="Keep session"
              onConfirm={cancel}
            />
          </div>
        )}
      </div>
    </li>
  )
}
