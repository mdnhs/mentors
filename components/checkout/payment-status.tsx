"use client"

import Link from "next/link"
import { useState } from "react"
import { CircleAlertIcon, Loader2Icon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { ConfirmAction } from "@/components/site/confirm-action"
import { Button, buttonVariants } from "@/components/ui/button"
import { usePrincipal } from "@/lib/auth"
import { formatDate, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import type { Order } from "@/lib/orders"
import { cancelBookingWithRefund, payForOrder } from "@/lib/payment-client"
import { useAppState } from "@/lib/store"

type Props = {
  order: Order
  onRestart: () => void
}

export function PaymentStatus({ order, onRestart }: Props) {
  const { bookings } = useAppState()
  const principal = usePrincipal()
  const [busy, setBusy] = useState<"retry" | "cancel" | null>(null)
  const { status, quote } = order
  // Orders carry no timezone of their own, so the hold is shown in the zone the learner booked in.
  const timeZone = bookings.find((booking) => booking.id === order.bookingId)?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const holdEnds = `${formatDate(order.expiresAt, timeZone)}, ${formatTime(order.expiresAt, timeZone)} ${timezoneLabel(timeZone, order.expiresAt)}`

  const run = async (action: "retry" | "cancel") => {
    if (busy) return
    setBusy(action)
    try {
      const outcome = action === "retry" ? await payForOrder(order.id, order.method, "success") : await cancelBookingWithRefund(principal, order.bookingId)
      if (!outcome.ok) toast.error(outcome.message)
    } finally {
      setBusy(null)
    }
  }

  if (status === "awaiting-payment" || status === "processing" || status === "paid") {
    return (
      <div role="status" className="py-10 text-center">
        <Loader2Icon className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" />
        <h2 className="mt-5 text-subheading">Confirming your payment…</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your booking is confirmed only once the payment is verified. Please keep this page open.</p>
      </div>
    )
  }

  if (status === "payment-failed") {
    return (
      <div role="alert" className="py-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
          <CircleAlertIcon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-subheading">Payment didn&apos;t go through</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You weren&apos;t charged. Your time is held until {holdEnds}, so you can try again (the demo retry succeeds).
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => run("retry")} disabled={busy !== null}>
            {busy === "retry" ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : <RotateCcwIcon aria-hidden="true" />}
            {busy === "retry" ? "Processing…" : `Try again · ${formatPrice(quote.total, quote.currency)}`}
          </Button>
          <ConfirmAction
            trigger={
              <Button size="lg" variant="outline" disabled={busy !== null}>
                Cancel booking
              </Button>
            }
            title="Cancel this booking?"
            description="The time you're holding is released to others. You haven't been charged, so there's nothing to refund."
            confirmLabel="Cancel booking"
            busyLabel="Cancelling…"
            cancelLabel="Keep my booking"
            destructive
            onConfirm={() => run("cancel")}
          />
        </div>
      </div>
    )
  }

  const closed =
    status === "cancelled"
      ? { title: "Booking cancelled", body: "No payment was taken. The time you held is available to others again." }
      : status === "refund-pending"
        ? { title: "Refund pending", body: `Your ${formatPrice(order.refundAmount ?? 0, quote.currency)} refund is being processed (demo).` }
        : status === "refunded"
          ? { title: "Refunded", body: `${formatPrice(order.refundAmount ?? 0, quote.currency)} was refunded (demo).` }
          : null
  if (!closed) return null

  return (
    <div role="status" className="py-8 text-center">
      <h2 className="text-subheading">{closed.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{closed.body}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={onRestart}>
          Choose a time again
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Go to my sessions
        </Link>
      </div>
    </div>
  )
}
