"use client"

import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { toast } from "sonner"

import { statusStyles } from "@/components/dashboard/booking-row"
import { DateBlock } from "@/components/sessions/date-block"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cancelDecision, effectiveStatus } from "@/lib/booking-policy"
import { offerTypeLabels } from "@/lib/categories"
import { formatDate, formatDuration, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import type { MentorBooking } from "@/lib/mentor-dashboard"
import { bookingTone } from "@/lib/mentor-insights"
import { orderStatusLabels } from "@/lib/orders"
import { cancelBookingAsMentor } from "@/lib/payment-client"
import type { Actor } from "@/lib/permissions"
import { deliverReviewAsMentor } from "@/lib/store"
import { cn } from "@/lib/utils"

type Props = { item: MentorBooking; now: Date; actor: Actor | null; mentorTimezone: string }

export function MentorBookingCard({ item, now, actor, mentorTimezone }: Props) {
  const { booking, order, learner, scope } = item
  const [busy, setBusy] = useState(false)

  const status = effectiveStatus(booking, now)
  const paidAmount = order && order.transactions.some((entry) => entry.kind === "charge" && entry.status === "succeeded") ? order.quote.total : 0
  const canCancel = cancelDecision(booking, now).allowed && status !== "expired"
  const isReview = booking.kind === "review"
  const canDeliver = isReview && status === "in-review"
  const zone = timezoneLabel(mentorTimezone, booking.date).split(" ")[0]

  const cancel = async () => {
    const outcome = await cancelBookingAsMentor(actor, booking.id, scope)
    if (outcome.ok) toast.success(paidAmount > 0 ? `Booking cancelled. ${learner} is refunded in full.` : "Booking cancelled.")
    else toast.error(outcome.message)
  }

  const deliver = async () => {
    if (busy) return
    setBusy(true)
    const outcome = await deliverReviewAsMentor(actor, booking.id, scope)
    setBusy(false)
    if (outcome.ok) toast.success(`Review marked as delivered to ${learner}`)
    else toast.error(outcome.message)
  }

  return (
    <li className="py-4">
      <div className="flex items-start gap-4">
        <DateBlock iso={booking.date} timeZone={mentorTimezone} className={cn(status !== "confirmed" && status !== "in-review" && "bg-muted text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                <span className={cn(status === "cancelled" && "line-through")}>{learner}</span>
                {booking.sample && <Badge tone="outline">Sample</Badge>}
              </p>
              <p className="truncate text-sm text-muted-foreground">{booking.title}</p>
            </div>
            <div className="flex items-center gap-2">
              {order && order.status !== "confirmed" && <Badge tone="warning">{orderStatusLabels[order.status]}</Badge>}
              <Badge tone={bookingTone[status]}>{statusStyles[status].label}</Badge>
            </div>
          </div>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground tabular-nums">
            <span>{isReview ? `Due ${formatDate(booking.date, mentorTimezone)}` : `${formatTime(booking.date, mentorTimezone)} ${zone}`}</span>
            <span>{booking.durationMinutes && !isReview ? formatDuration(booking.durationMinutes) : offerTypeLabels[booking.kind]}</span>
            {order && <span className="font-medium text-foreground">{formatPrice(order.quote.base, order.quote.currency)} <span className="font-normal text-muted-foreground">before fees</span></span>}
          </p>

          {booking.note && (
            <details className="group mt-2 text-sm">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md font-medium text-primary focus-ring [&::-webkit-details-marker]:hidden">
                Learner&apos;s goals
                <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
              </summary>
              <p className="mt-2 rounded-xl bg-muted/60 p-3">{booking.note}</p>
            </details>
          )}

          {(canCancel || canDeliver) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {canDeliver && (
                <Button variant="outline" size="sm" disabled={busy} onClick={deliver}>
                  {busy ? "Saving…" : "Mark as delivered"}
                </Button>
              )}
              {canCancel && (
                <ConfirmAction
                  destructive
                  trigger={
                    <Button variant="ghost" size="sm">
                      Cancel and refund
                    </Button>
                  }
                  title={`Cancel ${booking.title}?`}
                  description={
                    <p>
                      {paidAmount > 0 ? `${learner} is refunded ${formatPrice(paidAmount)} in full, whatever the usual refund window.` : "No payment was taken, so nothing needs refunding."} Demo only: no real
                      transfer is made.
                    </p>
                  }
                  confirmLabel="Cancel booking"
                  busyLabel="Cancelling…"
                  cancelLabel="Keep booking"
                  onConfirm={cancel}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
