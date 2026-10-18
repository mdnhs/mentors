"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { CalendarOffIcon, CheckIcon, CircleAlertIcon, Loader2Icon } from "lucide-react"

import { SchedulePicker } from "@/components/booking/schedule-picker"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { rescheduleDecision } from "@/lib/booking-policy"
import { rescheduleBooking } from "@/lib/booking-service"
import { formatDate, formatTime } from "@/lib/format"
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
      <div role="status" className="mx-auto max-w-lg py-6 text-center sm:py-12">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-success ring-8 ring-success-soft/50">
          <CheckIcon className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-heading">Session rescheduled</h1>
        <p className="mt-2 text-muted-foreground">
          {moved.title} is now on {formatDate(moved.date, moved.timezone)} at {formatTime(moved.date, moved.timezone)}.
        </p>
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
    <div className="mt-4 max-w-2xl pb-24 sm:pb-0">
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
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
            <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>

      <div data-mobile-bar className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-card/95 px-4 py-3 backdrop-blur sm:static sm:mt-4 sm:justify-between sm:border-0 sm:bg-transparent sm:p-0">
        <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Keep current time
        </Link>
        <Button onClick={confirm} disabled={!slot || submitting} size="lg" className="flex-1 sm:min-w-40 sm:flex-none">
          {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {submitting ? "Moving…" : "Confirm new time"}
        </Button>
      </div>
    </div>
  )
}
