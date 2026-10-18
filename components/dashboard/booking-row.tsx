"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

import { BookingActions } from "@/components/dashboard/booking-actions"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { DateBlock } from "@/components/sessions/date-block"
import { MeetingCard } from "@/components/sessions/meeting-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { bookingStatusLabels } from "@/lib/admin-selectors"
import { effectiveStatus, isActive } from "@/lib/booking-policy"
import { offerTypeLabels } from "@/lib/categories"
import { bookingHref } from "@/lib/dashboard"
import { getMentor, getSession } from "@/lib/data"
import { formatPrice, formatTime } from "@/lib/format"
import { bookingEnd } from "@/lib/availability"
import { bookingTone, orderTone, type BadgeTone } from "@/lib/learner-insights"
import { orderStatusLabels } from "@/lib/orders"
import { resetStalledPayment, settleDemoRefund } from "@/lib/payment-client"
import type { PaymentOutcome } from "@/lib/payment-service"
import { useAppState, useNow } from "@/lib/store"
import type { Booking, BookingStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export const statusStyles: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: bookingStatusLabels.pending, className: "bg-warning-soft text-warning" },
  confirmed: { label: bookingStatusLabels.confirmed, className: "bg-accent text-accent-foreground" },
  "in-review": { label: bookingStatusLabels["in-review"], className: "bg-warning-soft text-warning" },
  completed: { label: bookingStatusLabels.completed, className: "bg-success-soft text-success" },
  cancelled: { label: bookingStatusLabels.cancelled, className: "bg-muted text-muted-foreground" },
  expired: { label: bookingStatusLabels.expired, className: "bg-muted text-muted-foreground" },
}

export function SamplePill({ className }: { className?: string }) {
  return (
    <Badge tone="outline" className={className}>
      Sample
    </Badge>
  )
}

export function BookingRow({ booking, timeZone }: { booking: Booking; timeZone: string }) {
  const now = useNow()
  const { orders, bookings, cancelledSessions } = useAppState()
  const [paymentBusy, setPaymentBusy] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const order = orders.find((item) => item.bookingId === booking.id)
  const mentor = getMentor(booking.mentorSlug)
  if (!mentor) return null

  const stateStatus = now ? effectiveStatus(booking, now) : booking.status
  const unpaid = order && stateStatus === "pending"
  const sessionCancelled = Boolean(booking.sessionId && cancelledSessions[booking.sessionId]) && stateStatus === "cancelled"
  const groupSession = booking.kind === "group" && booking.sessionId ? getSession(booking.sessionId) : undefined
  const status: { label: string; tone: BadgeTone } = sessionCancelled
    ? { label: "Session cancelled", tone: "neutral" }
    : unpaid
      ? { label: orderStatusLabels[order.status], tone: orderTone[order.status] }
      : { label: bookingStatusLabels[stateStatus], tone: bookingTone[stateStatus] }
  const when = booking.kind === "review" ? (stateStatus === "completed" ? "Delivered" : "Feedback due") : formatTime(booking.date, timeZone)
  const active = isActive(stateStatus)
  const live = Boolean(now) && booking.kind !== "review" && stateStatus === "confirmed" && new Date(booking.date) <= now! && bookingEnd(booking) > now!.getTime()
  const paymentNote = order && (order.status === "refund-pending" || order.status === "refunded" || order.status === "processing" || order.status === "payment-failed")

  const runPaymentAction = async (action: () => Promise<PaymentOutcome>, success: string) => {
    if (paymentBusy) return
    setPaymentBusy(true)
    setPaymentError(null)
    try {
      const outcome = await action()
      if (outcome.ok) toast.success(success)
      else setPaymentError(outcome.message)
    } catch {
      setPaymentError("Something went wrong. Please try again.")
    } finally {
      setPaymentBusy(false)
    }
  }

  return (
    <li className="py-4 first:pt-1 last:pb-1">
      <div className="flex items-start gap-4">
        <DateBlock iso={booking.date} timeZone={timeZone} className={cn(!active && "bg-muted text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={cn("min-w-0 font-medium", stateStatus === "cancelled" && "text-muted-foreground line-through")}>
              <Link href={bookingHref(booking)} className="rounded-sm hover:underline focus-ring">
                {booking.title}
              </Link>
            </p>
            <span className="shrink-0 text-sm font-medium tabular-nums">
              {stateStatus === "cancelled" && !order && booking.refundPercent !== undefined ? `${booking.refundPercent}% refunded` : formatPrice(booking.total)}
            </span>
          </div>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-5" />
            <span className="truncate">{mentor.name}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={live ? "success" : status.tone}>{live ? "Live now" : status.label}</Badge>
            {booking.sample && <SamplePill />}
            <span className="text-xs text-muted-foreground tabular-nums">
              {offerTypeLabels[booking.kind]}, {when}
            </span>
          </div>

          {paymentNote && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={orderTone[order.status]}>
                {orderStatusLabels[order.status]}
                {order.refundAmount !== undefined && ` ${formatPrice(order.refundAmount, order.quote.currency)}`}
              </Badge>
              {order.status === "refund-pending" && (
                <Button variant="outline" size="sm" disabled={paymentBusy} onClick={() => runPaymentAction(() => settleDemoRefund(order.id), "Demo refund completed")}>
                  Complete demo refund
                </Button>
              )}
              {order.status === "processing" && (
                <Button variant="outline" size="sm" disabled={paymentBusy} onClick={() => runPaymentAction(() => resetStalledPayment(order.id), "Payment reset — you can try paying again")}>
                  Payment didn&apos;t finish? Reset
                </Button>
              )}
              <p role="alert" className="basis-full text-destructive empty:hidden">
                {paymentError}
              </p>
            </div>
          )}
          {groupSession && stateStatus === "confirmed" && (
            <div className="mt-3">
              <MeetingCard session={groupSession} bookings={bookings} />
            </div>
          )}
          {(now && active) || stateStatus === "completed" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {now && active && <BookingActions booking={booking} order={order} now={now} />}
              {stateStatus === "completed" && (
                <Link href={`/mentors/${mentor.slug}`} className="rounded-sm text-sm font-medium text-primary hover:underline focus-ring">
                  Book again
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  )
}
