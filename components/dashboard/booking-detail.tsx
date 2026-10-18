"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarClockIcon, CalendarOffIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { BookingActions } from "@/components/dashboard/booking-actions"
import { NotesPanel } from "@/components/dashboard/notes-panel"
import { SamplePill, statusStyles } from "@/components/dashboard/booking-row"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { MeetingCard } from "@/components/sessions/meeting-card"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { effectiveStatus, policyFor } from "@/lib/booking-policy"
import { offerTypeLabels } from "@/lib/categories"
import { getMentor, getSession } from "@/lib/data"
import { formatDate, formatDuration, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import { cancellationTerms } from "@/lib/offers"
import { isUnpaid, orderStatusLabels } from "@/lib/orders"
import { payForOrder } from "@/lib/payment-client"
import { useAppState, useNow } from "@/lib/store"
import { cn } from "@/lib/utils"

// Bookings live in this browser's shared demo store; the page's learner-only gate is what keeps other roles out.
export function BookingDetail({ id }: { id: string }) {
  const { bookings, orders } = useAppState()
  const now = useNow()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  if (!now) return <Skeleton className="mt-6 h-64 rounded-2xl" />

  const booking = bookings.find((item) => item.id === id)
  const mentor = booking && getMentor(booking.mentorSlug)
  if (!booking || !mentor) {
    return (
      <EmptyState icon={CalendarOffIcon} headingAs="h1" title="We couldn't find that booking" description="It may have been removed, or it isn't on your account." className="mt-6">
        <Link href="/dashboard" className={buttonVariants()}>
          Back to my sessions
        </Link>
      </EmptyState>
    )
  }

  const order = orders.find((item) => item.bookingId === booking.id)
  const status = effectiveStatus(booking, now)
  const style = statusStyles[status]
  const session = booking.sessionId ? getSession(booking.sessionId) : undefined
  const isReview = booking.kind === "review"
  const unpaid = order && isUnpaid(order.status) && status === "pending"

  const pay = async () => {
    if (!order || paying) return
    setPaying(true)
    setPayError(null)
    try {
      const outcome = await payForOrder(order.id, order.method, "success")
      if (outcome.ok) toast.success("Payment received — your session is confirmed")
      else setPayError(outcome.message)
    } catch {
      setPayError("We couldn't take the payment. Please try again.")
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="mt-5 grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <header className="flex items-start gap-4">
          <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-14" />
          <div className="min-w-0 flex-1">
            <h1 className="text-title">{booking.title}</h1>
            <p className="mt-1 text-muted-foreground">
              with{" "}
              <Link href={`/mentors/${mentor.slug}`} className="link">
                {mentor.name}
              </Link>{" "}
              · {offerTypeLabels[booking.kind]}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", style.className)}>{style.label}</span>
              {booking.sample && <SamplePill />}
            </p>
          </div>
        </header>

        {unpaid && (
          <div className="rounded-xl bg-warning-soft p-4 text-sm text-warning">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p>
                <span className="font-medium">{orderStatusLabels[order.status]}.</span> Your time is held until {formatTime(order.expiresAt)}. Demo payment: no money is taken.
              </p>
              <Button size="sm" onClick={pay} disabled={paying}>
                {paying && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                {paying ? "Processing…" : `Pay ${formatPrice(order.quote.total, order.quote.currency)}`}
              </Button>
            </div>
            <p role="alert" className="mt-2 font-medium text-destructive empty:hidden">
              {payError}
            </p>
          </div>
        )}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:self-start">
        <section aria-labelledby="payment" className="surface p-4 sm:p-5">
          <h2 id="payment" className="text-subheading">
            Payment
          </h2>
          {order ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="Price">{formatPrice(order.quote.base, order.quote.currency)}</Row>
              <Row label="Platform fee">{formatPrice(order.quote.platformFee, order.quote.currency)}</Row>
              <Row label="Total" strong>
                {formatPrice(order.quote.total, order.quote.currency)}
              </Row>
              <Row label="Status">{orderStatusLabels[order.status]}</Row>
              {order.refundAmount !== undefined && <Row label="Refund">{formatPrice(order.refundAmount, order.quote.currency)}</Row>}
              <Row label="Order ID">{order.id}</Row>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Total {formatPrice(booking.total)}. {booking.sample ? "Sample record with no payment attached." : ""}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Demo mode: payments are simulated and no money moves.</p>
        </section>

        <section aria-labelledby="policy" className="surface p-4 sm:p-5">
          <h2 id="policy" className="text-subheading">
            Cancel or reschedule
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{cancellationTerms[policyFor(booking)]}</p>
          <div className="mt-3">
            <BookingActions booking={booking} order={order} now={now} />
          </div>
        </section>
      </aside>

      <div className="space-y-8 lg:col-span-2">

        <section aria-labelledby="when" className="surface p-4 sm:p-5">
          <h2 id="when" className="text-subheading">
            Details
          </h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label={isReview ? "Feedback by" : "When"}>
              <span className="flex items-center gap-1.5">
                <CalendarClockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                {formatDate(booking.date, booking.timezone)}
                {!isReview && `, ${formatTime(booking.date, booking.timezone)}`}
              </span>
            </Row>
            {!isReview && <Row label="Your timezone">{timezoneLabel(booking.timezone, booking.date)}</Row>}
            {booking.durationMinutes && !isReview && <Row label="Duration">{formatDuration(booking.durationMinutes)}</Row>}
            <Row label="Booking ID">{booking.id}</Row>
            {booking.note && <Row label="Your goals">{booking.note}</Row>}
          </dl>
          {session && (
            <p className="mt-4 text-sm">
              <Link href={`/sessions/${session.id}`} className="link">
                View session page
              </Link>
            </p>
          )}
          {session && status === "confirmed" && (
            <div className="mt-4">
              <MeetingCard session={session} bookings={bookings} />
            </div>
          )}
        </section>

        <section aria-labelledby="notes-heading" id="notes" className="surface scroll-mt-24 p-4 sm:p-5">
          <h2 id="notes-heading" className="text-subheading">
            Notes &amp; action plan
          </h2>
          <div className="mt-4">
            <NotesPanel booking={booking} />
          </div>
        </section>
      </div>
    </div>
  )
}

function Row({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right", strong ? "font-semibold" : "font-medium")}>{children}</dd>
    </div>
  )
}
