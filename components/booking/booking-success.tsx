"use client"

import Link from "next/link"
import { PrinterIcon } from "lucide-react"

import { AddToCalendar } from "@/components/booking/add-to-calendar"
import { SuccessHero } from "@/components/booking/success-hero"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { offerTypeLabels } from "@/lib/categories"
import { formatDate, formatDuration, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import type { Order } from "@/lib/orders"
import type { Booking, Mentor } from "@/lib/types"

export function BookingSuccess({ booking, mentor, order }: { booking: Booking; mentor: Mentor; order: Order }) {
  const firstName = mentor.name.split(" ")[0]
  const isReview = booking.kind === "review"

  const rows = [
    { label: "Type", value: offerTypeLabels[booking.kind] },
    isReview
      ? { label: "Feedback by", value: formatDate(booking.date, booking.timezone) }
      : { label: "When", value: `${formatDate(booking.date, booking.timezone)}, ${formatTime(booking.date, booking.timezone)}` },
    !isReview && mentor.timezone !== booking.timezone
      ? { label: `${firstName}'s time`, value: `${formatDate(booking.date, mentor.timezone)}, ${formatTime(booking.date, mentor.timezone)}` }
      : null,
    !isReview ? { label: "Your timezone", value: timezoneLabel(booking.timezone, booking.date) } : null,
    booking.durationMinutes && !isReview ? { label: "Duration", value: formatDuration(booking.durationMinutes) } : null,
    { label: "Booking ID", value: booking.id },
    { label: "Order ID", value: order.id },
    { label: "Price", value: formatPrice(order.quote.base, order.quote.currency) },
    { label: "Platform fee", value: formatPrice(order.quote.platformFee, order.quote.currency) },
    { label: "Total (demo payment)", value: formatPrice(order.quote.total, order.quote.currency) },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className="mx-auto max-w-lg py-6 text-center sm:py-12 print:py-0">
      <SuccessHero
        title={isReview ? "Review requested" : `You're booked with ${firstName}`}
        description={isReview ? `${firstName} will send written feedback to your inbox.` : "You'll find the call link in My sessions before it starts."}
      />

      <div className="mt-8 surface p-5 text-left shadow-card print:shadow-none">
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
      <p className="mt-4 text-xs text-muted-foreground">Demo booking: it is saved in this browser only and no payment was taken.</p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center print:hidden">
        {!isReview && booking.durationMinutes ? (
          <AddToCalendar
            event={{
              uid: booking.id,
              start: booking.date,
              durationMinutes: booking.durationMinutes,
              title: `${booking.title} with ${mentor.name}`,
              description: `MentorBridge booking ${booking.id}. The call link appears in My sessions before the session starts.`,
            }}
          />
        ) : null}
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          <PrinterIcon aria-hidden="true" />
          Print receipt
        </Button>
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center print:hidden">
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
