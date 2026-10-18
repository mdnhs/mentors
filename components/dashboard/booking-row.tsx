"use client"

import Link from "next/link"

import { BookingActions } from "@/components/dashboard/booking-actions"
import { Button } from "@/components/ui/button"
import { MeetingCard } from "@/components/sessions/meeting-card"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { DateBlock } from "@/components/sessions/date-block"
import { effectiveStatus, isActive } from "@/lib/booking-policy"
import { bookingHref } from "@/lib/dashboard"
import { orderStatusLabels, type Order } from "@/lib/orders"
import { resetStalledPayment, settleDemoRefund } from "@/lib/payment-client"
import { offerTypeLabels } from "@/lib/categories"
import { getMentor, getSession } from "@/lib/data"
import { formatPrice, formatTime } from "@/lib/format"
import { useAppState, useNow } from "@/lib/store"
import type { Booking, BookingStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export const statusStyles: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-warning-soft text-warning" },
  confirmed: { label: "Confirmed", className: "bg-accent text-accent-foreground" },
  "in-review": { label: "In review", className: "bg-warning-soft text-warning" },
  completed: { label: "Completed", className: "bg-success-soft text-success" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
}

type BookingRowProps = {
  booking: Booking
  // Who the row is "with": the mentor for learners, the learner for mentors.
  person?: { name: string; photo?: string }
}

export function SamplePill({ className }: { className?: string }) {
  return <span className={cn("inline-block rounded-md border border-dashed px-1.5 py-0.5 text-xs text-muted-foreground", className)}>Sample</span>
}

const paymentTone: Partial<Record<Order["status"], string>> = {
  "awaiting-payment": "text-warning",
  processing: "text-warning",
  "payment-failed": "text-destructive",
  "refund-pending": "text-warning",
}

export function BookingRow({ booking, person }: BookingRowProps) {
  const now = useNow()
  const { orders, bookings, cancelledSessions } = useAppState()
  const order = orders.find((item) => item.bookingId === booking.id)
  const mentor = getMentor(booking.mentorSlug)
  if (!mentor) return null
  const counterpart = person ?? mentor
  const stateStatus = now ? effectiveStatus(booking, now) : booking.status
  const unpaid = order && stateStatus === "pending"
  const sessionCancelled = Boolean(booking.sessionId && cancelledSessions[booking.sessionId]) && stateStatus === "cancelled"
  const groupSession = booking.kind === "group" && booking.sessionId ? getSession(booking.sessionId) : undefined
  const status = sessionCancelled ? { label: "Session cancelled", className: statusStyles.cancelled.className } : unpaid ? { label: orderStatusLabels[order.status], className: statusStyles.pending.className } : statusStyles[stateStatus]
  const when = booking.kind === "review" ? (stateStatus === "completed" ? "Delivered" : "Feedback due") : formatTime(booking.date, booking.timezone)
  const active = isActive(stateStatus)

  return (
    <li className="p-4">
      <div className="flex items-center gap-4">
        <DateBlock iso={booking.date} timeZone={booking.timezone} className={cn(!active && "opacity-60")} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium", stateStatus === "cancelled" && "line-through")}>
            {person ? (
              booking.title
            ) : (
              <Link href={bookingHref(booking)} className="hover:underline">
                {booking.title}
              </Link>
            )}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
            <MentorAvatar name={counterpart.name} photo={counterpart.photo} className="size-5" />
            <span>{counterpart.name}</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="basis-full sm:basis-auto">
              {offerTypeLabels[booking.kind]} · {when}
            </span>
          </p>
          <span className={cn("mt-1.5 inline-block rounded-md px-2 py-0.5 text-xs font-medium sm:hidden", status.className)}>{status.label}</span>
          {booking.sample && <SamplePill className="mt-1.5 ml-1.5 sm:hidden" />}
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
          {booking.sample && <SamplePill />}
          <span className="text-sm text-muted-foreground">
            {stateStatus === "cancelled" && !order && booking.refundPercent !== undefined ? `${booking.refundPercent}% refunded` : formatPrice(booking.total)}
          </span>
        </div>
        {stateStatus === "completed" && !person && (
          <Link href={`/mentors/${mentor.slug}`} className="shrink-0 link text-sm">
            Book again
          </Link>
        )}
      </div>
      {order && !person && (order.status === "refund-pending" || order.status === "refunded" || order.status === "processing" || order.status === "payment-failed") && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-18 text-sm">
          <span className={cn("font-medium", paymentTone[order.status])}>
            {orderStatusLabels[order.status]}
            {order.refundAmount !== undefined && ` · ${formatPrice(order.refundAmount, order.quote.currency)}`}
          </span>
          {order.status === "refund-pending" && (
            <Button variant="outline" size="sm" onClick={() => settleDemoRefund(order.id)}>
              Complete demo refund
            </Button>
          )}
          {order.status === "processing" && (
            <Button variant="outline" size="sm" onClick={() => resetStalledPayment(order.id)}>
              Payment didn&apos;t finish? Reset
            </Button>
          )}
        </div>
      )}
      {groupSession && !person && stateStatus === "confirmed" && (
        <div className="mt-3 pl-18">
          <MeetingCard session={groupSession} bookings={bookings} />
        </div>
      )}
      {now && !person && active && (
        <div className="mt-3 pl-18">
          <BookingActions booking={booking} order={order} now={now} />
        </div>
      )}
    </li>
  )
}
