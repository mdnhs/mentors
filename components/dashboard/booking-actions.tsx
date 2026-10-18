"use client"

import Link from "next/link"
import { useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cancelDecision, policyFor, rescheduleDecision } from "@/lib/booking-policy"
import { cancellationTerms } from "@/lib/offers"
import { isUnpaid, type Order } from "@/lib/orders"
import { cancelBookingWithRefund, settleDemoRefund } from "@/lib/payment-client"
import { formatPrice } from "@/lib/format"
import { refundAmount } from "@/lib/pricing"
import type { Booking } from "@/lib/types"

function refundCopy(percent: number, order?: Order) {
  if (order && isUnpaid(order.status)) return "No payment was taken, so there is nothing to refund."
  if (percent === 0) return "This is inside the refund window, so you won't get a refund."
  const amount = order ? ` of ${formatPrice(refundAmount(order.quote.total, percent), order.quote.currency)}` : ""
  return percent === 100 ? `You'll get a full refund${amount}.` : `You'll get a ${percent}% refund${amount}.`
}

export function BookingActions({ booking, order, now }: { booking: Booking; order?: Order; now: Date }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const cancel = cancelDecision(booking, now)
  const processing = order?.status === "processing"
  const reschedule = rescheduleDecision(booking, now)
  const canMove = booking.kind !== "review" && booking.kind !== "group"
  const reasonId = `reschedule-reason-${booking.id}`

  const confirmCancel = async () => {
    if (busy) return
    setBusy(true)
    const outcome = await cancelBookingWithRefund(booking.id)
    if (outcome.ok) {
      setOpen(false)
      if (outcome.order?.status === "refund-pending") await settleDemoRefund(outcome.order.id)
    } else setError(outcome.message)
    setBusy(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canMove &&
        (reschedule.allowed ? (
          <Link href={`/mentors/${booking.mentorSlug}/book?reschedule=${booking.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Reschedule
          </Link>
        ) : (
          <>
            <Button variant="outline" size="sm" disabled aria-describedby={reasonId}>
              Reschedule
            </Button>
            <span id={reasonId} className="text-xs text-muted-foreground">
              {reschedule.reason}
            </span>
          </>
        ))}
      {cancel.allowed && !processing && (
        <Button variant="ghost" size="sm" onClick={() => { setError(null); setOpen(true) }}>
          Cancel
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {booking.title}?</DialogTitle>
            <DialogDescription>
              {cancel.allowed ? refundCopy(cancel.refundPercent, order) : cancel.reason} {cancellationTerms[policyFor(booking)]}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep session
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirmCancel}>
              {busy ? "Cancelling…" : "Cancel session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
