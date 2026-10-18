"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarOffIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { BookingActions } from "@/components/dashboard/booking-actions"
import { NotesPanel } from "@/components/dashboard/notes-panel"
import { SamplePill } from "@/components/dashboard/booking-row"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { PageHeader, Panel } from "@/components/portal/ui"
import { MeetingCard } from "@/components/sessions/meeting-card"
import { EmptyState } from "@/components/site/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { bookingStatusLabels } from "@/lib/admin-selectors"
import { effectiveStatus, policyFor } from "@/lib/booking-policy"
import { offerTypeLabels } from "@/lib/categories"
import { getMentor, getSession } from "@/lib/data"
import { formatDate, formatDuration, formatPrice, formatTime, timezoneOffset } from "@/lib/format"
import { bookingTone, orderTone, zoneName } from "@/lib/learner-insights"
import { cancellationTerms } from "@/lib/offers"
import { isUnpaid, orderStatusLabels } from "@/lib/orders"
import { payForOrder } from "@/lib/payment-client"
import { useAppState, useNow } from "@/lib/store"
import { cn } from "@/lib/utils"

// Bookings live in this browser's shared demo store; the page's learner-only gate is what keeps other roles out.
export function BookingDetail({ id }: { id: string }) {
  const { bookings, orders, profile } = useAppState()
  const now = useNow()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  if (!now) return <Skeleton aria-label="Loading booking" className="h-64 rounded-2xl" />

  const booking = bookings.find((item) => item.id === id)
  const mentor = booking && getMentor(booking.mentorSlug)
  if (!booking || !mentor) {
    return (
      <EmptyState icon={CalendarOffIcon} headingAs="h1" title="We couldn't find that booking" description="It may have been removed, or it isn't on your account.">
        <Link href="/dashboard/bookings" className={buttonVariants()}>
          Back to bookings
        </Link>
      </EmptyState>
    )
  }

  const timeZone = profile.timezone
  const order = orders.find((item) => item.bookingId === booking.id)
  const status = effectiveStatus(booking, now)
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
    <>
      <PageHeader
        crumbs={[{ label: "Bookings", href: "/dashboard/bookings" }, { label: booking.title }]}
        title={booking.title}
        description={
          <span className="flex items-center gap-2">
            <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-5" />
            <span>
              with{" "}
              <Link href={`/mentors/${mentor.slug}`} className="link">
                {mentor.name}
              </Link>
            </span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:col-start-3 lg:row-start-1 lg:self-start">
          <Panel id="status" title="Status" action={<Badge tone={bookingTone[status]}>{bookingStatusLabels[status]}</Badge>}>
            <div className="space-y-4">
              {booking.sample && <SamplePill />}
              {unpaid && (
                <div className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
                  <p>
                    <span className="font-medium">{orderStatusLabels[order.status]}.</span> Held until {formatTime(order.expiresAt, timeZone)}. Demo payment: no money is taken.
                  </p>
                  <Button className="mt-3 w-full" onClick={pay} disabled={paying}>
                    {paying && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                    {paying ? "Processing…" : `Pay ${formatPrice(order.quote.total, order.quote.currency)}`}
                  </Button>
                  <p role="alert" className="mt-2 font-medium text-destructive empty:hidden">
                    {payError}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{cancellationTerms[policyFor(booking)]}</p>
              <BookingActions booking={booking} order={order} now={now} />
            </div>
          </Panel>

          <Panel id="payment" title="Payment" action={order ? <Badge tone={orderTone[order.status]}>{orderStatusLabels[order.status]}</Badge> : undefined}>
            {order ? (
              <dl className="space-y-2 text-sm">
                <Line label="Session">{formatPrice(order.quote.base, order.quote.currency)}</Line>
                <Line label="Platform fee">{formatPrice(order.quote.platformFee, order.quote.currency)}</Line>
                <div className="border-t border-dashed pt-2">
                  <Line label="Total" strong>
                    {formatPrice(order.quote.total, order.quote.currency)}
                  </Line>
                </div>
                {order.refundAmount !== undefined && <Line label="Refund">−{formatPrice(order.refundAmount, order.quote.currency)}</Line>}
                <Line label="Order ID">
                  <span className="whitespace-nowrap text-xs tabular-nums">{order.id}</span>
                </Line>
              </dl>
            ) : (
              <dl className="space-y-2 text-sm">
                <Line label="Total" strong>
                  {formatPrice(booking.total)}
                </Line>
                {booking.sample && <p className="text-muted-foreground">Sample record, no payment attached.</p>}
              </dl>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Demo mode: payments are simulated and no money moves.</p>
          </Panel>
        </aside>

        <div className="space-y-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          <Panel id="details" title="Session details">
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <Item label={isReview ? "Feedback by" : "Date"}>{formatDate(booking.date, timeZone)}</Item>
              {!isReview && (
                <Item label="Time">
                  {formatTime(booking.date, timeZone)} {zoneName(timeZone)}
                  <span className="text-muted-foreground"> ({timezoneOffset(timeZone, booking.date)})</span>
                </Item>
              )}
              {booking.durationMinutes && !isReview && <Item label="Duration">{formatDuration(booking.durationMinutes)}</Item>}
              <Item label="Type">{offerTypeLabels[booking.kind]}</Item>
              <Item label="Booking ID">
                <span className="whitespace-nowrap text-xs tabular-nums">{booking.id}</span>
              </Item>
              {booking.note && (
                <Item label="Your goals" wide>
                  {booking.note}
                </Item>
              )}
            </dl>
            {session && (
              <div className="mt-5 space-y-4 border-t pt-4">
                {status === "confirmed" && <MeetingCard session={session} bookings={bookings} />}
                <Link href={`/sessions/${session.id}`} className="link text-sm">
                  View session page
                </Link>
              </div>
            )}
          </Panel>

          <Panel id="notes" title="Notes & action plan" className="scroll-mt-24">
            <NotesPanel booking={booking} />
          </Panel>
        </div>
      </div>
    </>
  )
}

function Line({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("text-right tabular-nums", strong ? "font-semibold" : "font-medium")}>{children}</dd>
    </div>
  )
}

function Item({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn(wide && "sm:col-span-2")}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{children}</dd>
    </div>
  )
}
