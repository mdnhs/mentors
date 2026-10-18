"use client"

import { LockIcon, VideoIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { formatDate, formatTime } from "@/lib/format"
import { meetingAccess, MEETING_OPENS_MINUTES } from "@/lib/sessions"
import { useNow } from "@/lib/store"
import type { Booking, GroupSession } from "@/lib/types"

export function MeetingCard({ session, bookings }: { session: GroupSession; bookings: Booking[] }) {
  const now = useNow()
  if (!now) return null
  const access = meetingAccess(session, bookings, now)
  if (access.access === "denied") return null

  if (access.access === "locked") {
    return (
      <p className="flex items-start gap-2 rounded-xl border p-3 text-sm text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Session link unlocks {MEETING_OPENS_MINUTES} minutes before the start ({formatDate(access.opensAt, session.timezone)},{" "}
          {formatTime(access.opensAt, session.timezone)}).
        </span>
      </p>
    )
  }

  return (
    <div className="rounded-xl border p-3 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <VideoIcon className="size-4" aria-hidden="true" />
        Session link
      </p>
      <p className="mt-1 text-muted-foreground">Passcode {access.details.passcode} · demo link, no real call</p>
      <a href={access.details.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" }) + " mt-3"}>
        Join session
      </a>
    </div>
  )
}
