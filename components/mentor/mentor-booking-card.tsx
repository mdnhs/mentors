"use client"

import { useState } from "react"
import { CalendarClockIcon, QuoteIcon } from "lucide-react"
import { toast } from "sonner"

import { statusStyles, SamplePill } from "@/components/dashboard/booking-row"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cancelDecision } from "@/lib/booking-policy"
import { effectiveStatus } from "@/lib/booking-policy"
import { offerTypeLabels } from "@/lib/categories"
import { formatDate, formatDuration, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import type { MentorBooking } from "@/lib/mentor-dashboard"
import { orderStatusLabels } from "@/lib/orders"
import { cancelBookingAsMentor } from "@/lib/payment-client"
import type { Actor } from "@/lib/permissions"
import { deliverReviewAsMentor } from "@/lib/store"
import { cn } from "@/lib/utils"

type Props = { item: MentorBooking; now: Date; actor: Actor | null; mentorTimezone: string }

export function MentorBookingCard({ item, now, actor, mentorTimezone }: Props) {
  const { booking, order, learner, scope } = item
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = effectiveStatus(booking, now)
  const style = statusStyles[status]
  const paidAmount = order && order.transactions.some((entry) => entry.kind === "charge" && entry.status === "succeeded") ? order.quote.total : 0
  const canCancel = cancelDecision(booking, now).allowed && status !== "expired"
  const isReview = booking.kind === "review"
  const canDeliver = isReview && status === "in-review"

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    const outcome = await cancelBookingAsMentor(actor, booking.id, scope)
    setBusy(false)
    if (outcome.ok) setOpen(false)
    else setError(outcome.message)
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
    <li className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className={cn("font-medium", status === "cancelled" && "line-through")}>{booking.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {learner} · {offerTypeLabels[booking.kind]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", style.className)}>{style.label}</span>
          {order && order.status !== "confirmed" && <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{orderStatusLabels[order.status]}</span>}
          {booking.sample && <SamplePill />}
        </div>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarClockIcon className="size-4" aria-hidden="true" />
          {isReview ? `Feedback due ${formatDate(booking.date, mentorTimezone)}` : `${formatDate(booking.date, mentorTimezone)}, ${formatTime(booking.date, mentorTimezone)} ${timezoneLabel(mentorTimezone, booking.date).split(" ")[0]}`}
        </span>
        {booking.durationMinutes && !isReview && <span>{formatDuration(booking.durationMinutes)}</span>}
        {order && <span>{formatPrice(order.quote.base, order.quote.currency)} before fees</span>}
      </p>

      {booking.note && (
        <blockquote className="mt-3 flex gap-2 rounded-xl bg-muted/60 p-3 text-sm">
          <QuoteIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>
            <span className="block text-xs font-medium text-muted-foreground">Learner&apos;s goals</span>
            {booking.note}
          </span>
        </blockquote>
      )}

      {(canCancel || canDeliver) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {canDeliver && (
            <Button variant="outline" size="sm" disabled={busy} onClick={deliver}>
              Mark as delivered
            </Button>
          )}
          {canCancel && (
            <Button variant="ghost" size="sm" onClick={() => { setError(null); setOpen(true) }}>
              Cancel and refund
            </Button>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {booking.title}?</DialogTitle>
            <DialogDescription>
              {paidAmount > 0 ? `${learner} is refunded ${formatPrice(paidAmount)} in full, whatever the usual refund window.` : `No payment was taken, so nothing needs refunding.`} Demo only.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep booking
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirm}>
              {busy ? "Cancelling…" : "Cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  )
}
