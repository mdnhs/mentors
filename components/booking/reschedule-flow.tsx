"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { CalendarOffIcon } from "lucide-react"

import { SchedulePicker } from "@/components/booking/schedule-picker"
import { StepActions } from "@/components/booking/steps/step-actions"
import { SuccessHero } from "@/components/booking/success-hero"
import { CheckoutError } from "@/components/checkout/checkout-parts"
import { EmptyState } from "@/components/site/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { rescheduleDecision } from "@/lib/booking-policy"
import { rescheduleBooking } from "@/lib/booking-service"
import { formatDate, formatTime, timezoneLabel } from "@/lib/format"
import { transact, useAppState, useIsClient } from "@/lib/store"
import type { Booking, Mentor } from "@/lib/types"

export function RescheduleFlow({ mentor, bookingId }: { mentor: Mentor; bookingId: string }) {
  const isClient = useIsClient()
  const { bookings } = useAppState()
  const [now] = useState(() => new Date())
  const [slot, setSlot] = useState<string | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moved, setMoved] = useState<Booking | null>(null)
  const inFlight = useRef(false)

  if (!isClient) {
    return (
      <div aria-busy="true" aria-label="Loading booking" className="mt-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-6 h-96 rounded-2xl" />
      </div>
    )
  }

  const booking = bookings.find((item) => item.id === bookingId && item.mentorSlug === mentor.slug)
  const decision = booking && booking.durationMinutes ? rescheduleDecision(booking, now) : null

  if (moved) {
    return (
      <div className="mx-auto max-w-lg py-6 text-center sm:py-12">
        <SuccessHero
          title="Session rescheduled"
          description={`${moved.title} is now on ${formatDate(moved.date, moved.timezone)} at ${formatTime(moved.date, moved.timezone)} ${timezoneLabel(moved.timezone, moved.date)}.`}
        />
        <Link href="/dashboard" className={buttonVariants({ size: "lg", className: "mt-8" })}>
          Go to my sessions
        </Link>
      </div>
    )
  }

  if (!booking || !decision || !decision.allowed) {
    return (
      <div className="mt-4 max-w-2xl">
        <h1 className="text-title">Reschedule</h1>
        <EmptyState
          icon={CalendarOffIcon}
          title={booking ? "This session can't be rescheduled" : "We couldn't find that booking"}
          description={decision && !decision.allowed ? decision.reason : "It may have been cancelled or removed."}
          className="mt-6"
        >
          <Link href="/dashboard" className={buttonVariants()}>
            Back to my sessions
          </Link>
        </EmptyState>
      </div>
    )
  }

  const learnerTimezone = timezone ?? booking.timezone

  const confirm = async () => {
    if (inFlight.current || !slot) return
    inFlight.current = true
    setSubmitting(true)
    setError(null)
    await new Promise((resolve) => setTimeout(resolve, 600))
    const outcome = await transact((current) => ({ ...current, ...rescheduleBooking(current.bookings, booking.id, mentor, slot, new Date()) }))
    if (outcome.ok) setMoved(outcome.booking)
    else {
      setError(outcome.message)
      setSlot(null)
    }
    inFlight.current = false
    setSubmitting(false)
  }

  return (
    <div className="mt-4 max-w-2xl">
      <h1 className="text-title">Reschedule {booking.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Currently {formatDate(booking.date, learnerTimezone)}, {formatTime(booking.date, learnerTimezone)}. You can move a session once.
      </p>

      <div className="mt-5 surface p-4 shadow-card sm:p-6">
        <SchedulePicker
          mentor={mentor}
          durationMinutes={booking.durationMinutes!}
          bookings={bookings}
          now={now}
          ignoreBookingId={booking.id}
          timezone={learnerTimezone}
          onTimezone={setTimezone}
          value={slot}
          onChange={(next) => {
            setSlot(next)
            setError(null)
          }}
        />
        {error && <CheckoutError title="We couldn't move your session." message={error} className="mt-4" />}
      </div>

      {(["desktop", "mobile"] as const).map((variant) => (
        <StepActions
          key={variant}
          variant={variant}
          backLabel="Keep current time"
          backHref="/dashboard"
          nextLabel="Confirm new time"
          busyLabel="Moving…"
          onNext={confirm}
          disabled={!slot}
          busy={submitting}
          blockedReason="Pick a new date and time to continue."
        />
      ))}
    </div>
  )
}
