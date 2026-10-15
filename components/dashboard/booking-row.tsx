import Link from "next/link"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { DateBlock } from "@/components/sessions/date-block"
import { offerTypeLabels } from "@/lib/categories"
import { getMentor } from "@/lib/data"
import { formatPrice, formatTime } from "@/lib/format"
import type { Booking, BookingStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusStyles: Record<BookingStatus, { label: string; className: string }> = {
  upcoming: { label: "Upcoming", className: "bg-accent text-accent-foreground" },
  "in-review": { label: "In review", className: "bg-warning-soft text-warning" },
  completed: { label: "Completed", className: "bg-success-soft text-success" },
}

type BookingRowProps = {
  booking: Booking
  // Who the row is "with": the mentor for learners, the learner for mentors.
  person?: { name: string; photo?: string }
}

export function BookingRow({ booking, person }: BookingRowProps) {
  const mentor = getMentor(booking.mentorSlug)
  if (!mentor) return null
  const counterpart = person ?? mentor
  const status = statusStyles[booking.status]
  const when = booking.kind === "review" ? (booking.status === "completed" ? "Delivered" : "Feedback due") : formatTime(booking.date, booking.timezone)

  return (
    <li className="flex items-center gap-4 p-4">
      <DateBlock iso={booking.date} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{booking.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
          <MentorAvatar name={counterpart.name} photo={counterpart.photo} className="size-5" />
          <span>{counterpart.name}</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="basis-full sm:basis-auto">
            {offerTypeLabels[booking.kind]} · {when}
          </span>
        </p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
        <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
        <span className="text-sm text-muted-foreground">{formatPrice(booking.total)}</span>
      </div>
      {booking.status === "completed" && !person && (
        <Link href={`/mentors/${mentor.slug}`} className="shrink-0 link text-sm">
          Book again
        </Link>
      )}
    </li>
  )
}
