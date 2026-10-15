import Link from "next/link"
import { CheckIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { buttonVariants } from "@/components/ui/button"
import { offerTypeLabels } from "@/lib/categories"
import { formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format"
import type { Booking, Mentor } from "@/lib/types"

export function BookingSuccess({ booking, mentor }: { booking: Booking; mentor: Mentor }) {
  const firstName = mentor.name.split(" ")[0]
  const isReview = booking.kind === "review"

  const rows = [
    { label: "Type", value: offerTypeLabels[booking.kind] },
    isReview
      ? { label: "Feedback by", value: formatDate(booking.date, booking.timezone) }
      : { label: "When", value: `${formatDate(booking.date, booking.timezone)}, ${formatTime(booking.date, booking.timezone)}` },
    booking.durationMinutes && !isReview ? { label: "Duration", value: formatDuration(booking.durationMinutes) } : null,
    { label: "Booking ID", value: booking.id },
    { label: "Total (not charged)", value: formatPrice(booking.total) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="mx-auto max-w-lg py-6 text-center sm:py-12" role="status">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-success-soft/50">
        <CheckIcon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-heading">
        {isReview ? "Review requested" : `You're booked with ${firstName}`}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {isReview
          ? `${firstName} will send written feedback to your inbox.`
          : "You'll find the call link in My sessions before it starts."}
      </p>

      <div className="mt-8 surface p-5 text-left shadow-card">
        <div className="flex items-center gap-3 border-b pb-4">
          <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-11" />
          <div className="min-w-0">
            <p className="font-medium">{booking.title}</p>
            <p className="truncate text-sm text-muted-foreground">with {mentor.name}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2.5 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">This is a demo booking. No payment was taken.</p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
          Go to my sessions
        </Link>
        <Link href="/mentors" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Find more mentors
        </Link>
      </div>
    </div>
  )
}
