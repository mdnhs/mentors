"use client"

import Link from "next/link"
import { useState } from "react"
import { CircleAlertIcon, Loader2Icon, RotateCcwIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import type { Order } from "@/lib/orders"
import { cancelBookingWithRefund, payForOrder } from "@/lib/payment-client"

type Props = {
  order: Order
  onRestart: () => void
}

export function PaymentStatus({ order, onRestart }: Props) {
  const [busy, setBusy] = useState(false)
  const { status, quote } = order
  const holdEnds = `${formatDate(order.expiresAt)}, ${formatTime(order.expiresAt)}`

  const retry = async () => {
    if (busy) return
    setBusy(true)
    await payForOrder(order.id, order.method, "success")
    setBusy(false)
  }

  const cancel = async () => {
    if (busy) return
    setBusy(true)
    await cancelBookingWithRefund(order.bookingId)
    setBusy(false)
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
          <Button size="lg" onClick={retry} disabled={busy}>
            <RotateCcwIcon aria-hidden="true" />
            Try again · {formatPrice(quote.total, quote.currency)}
          </Button>
          <Button size="lg" variant="outline" onClick={cancel} disabled={busy}>
            Cancel booking
          </Button>
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
