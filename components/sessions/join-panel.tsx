"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { CheckCircle2Icon, CircleAlertIcon, Loader2Icon } from "lucide-react"

import { AddToCalendar } from "@/components/booking/add-to-calendar"
import { SuccessHero } from "@/components/booking/success-hero"
import {
  CheckoutError,
  ContactFields,
  DemoNotice,
  DemoResultPicker,
  isValidContact,
  PaymentMethodPicker,
  PriceBreakdown,
  type Contact,
  type PaymentMethod,
} from "@/components/checkout/checkout-parts"
import { PaymentStatus } from "@/components/checkout/payment-status"
import { DateBlock } from "@/components/sessions/date-block"
import { LocalTime } from "@/components/sessions/local-time"
import { MeetingCard } from "@/components/sessions/meeting-card"
import { SeatsMeter } from "@/components/sessions/seats-meter"
import { SessionBadge, sessionStatus } from "@/components/sessions/session-badge"
import { useSessionView } from "@/components/sessions/use-session-view"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cancellationTerms } from "@/lib/offers"
import { formatDate, formatDuration, formatPrice, formatTime, timezoneCity, timezoneLabel } from "@/lib/format"
import { payForOrder, type DemoResult } from "@/lib/payment-client"
import { startGroupCheckout, type PaymentOutcome } from "@/lib/payment-service"
import { quote } from "@/lib/pricing"
import { registrationDeadline } from "@/lib/sessions"
import { site } from "@/lib/site"
import { createBookingId, createOrderId, transact } from "@/lib/store"
import type { GroupSession } from "@/lib/types"
import { cn } from "@/lib/utils"

export function JoinPanel({ session: base }: { session: GroupSession }) {
  const view = useSessionView(base)
  const { session, bookings, orders } = view
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState<Contact>({ name: site.learner.name, email: site.learner.email })
  const [payment, setPayment] = useState<PaymentMethod>("bkash")
  const [demoResult, setDemoResult] = useState<DemoResult>("success")
  const [submitting, setSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [failure, setFailure] = useState<Extract<PaymentOutcome, { ok: false }> | null>(null)
  const inFlight = useRef(false)
  const requestId = useRef(createBookingId())

  const heldBooking = bookings.find((booking) => booking.sessionId === session.id && (booking.status === "pending" || booking.status === "confirmed"))
  const order = orders.find((item) => item.id === orderId) ?? (heldBooking && orders.find((item) => item.bookingId === heldBooking.id))
  const { total } = quote(session.price)
  const status = sessionStatus(view)

  const confirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setFailure(null)
    const outcome = await transact((current) =>
      startGroupCheckout(
        current,
        { requestId: requestId.current, bookingId: createBookingId(), orderId: createOrderId(), method: payment, session: base, timezone: session.timezone },
        new Date()
      )
    )
    if (outcome.ok) {
      setOrderId(outcome.order.id)
      await payForOrder(outcome.order.id, payment, demoResult)
    } else setFailure(outcome)
    inFlight.current = false
    setSubmitting(false)
  }

  const restart = () => {
    requestId.current = createBookingId()
    setOrderId(null)
    setFailure(null)
  }

  const closeDialog = (next: boolean) => {
    if (submitting || order?.status === "processing") return
    setOpen(next)
    if (!next && order?.status === "confirmed") setOrderId(null)
  }

  const blockedLabel = !view.check.open && view.check.reason === "full" ? "Fully booked" : !view.check.open && view.check.reason === "closed" ? "Registration closed" : "Not available"
  const action =
    view.learner === "enrolled" || view.learner === "completed" ? (
      <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
        View in my sessions
      </Link>
    ) : view.learner === "pending" ? (
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        Finish payment
      </Button>
    ) : view.phase === "cancelled" ? (
      <Button size="lg" className="w-full" disabled>
        Session cancelled
      </Button>
    ) : view.phase === "completed" ? (
      <Button size="lg" className="w-full" disabled>
        Session ended
      </Button>
    ) : view.check.open ? (
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        Reserve seat · {formatPrice(session.price)}
      </Button>
    ) : (
      <Button size="lg" className="w-full" disabled>
        {blockedLabel}
      </Button>
    )

  const deadline = `${formatDate(registrationDeadline(session), session.timezone)}, ${formatTime(registrationDeadline(session), session.timezone)}`

  return (
    <>
      <div className="hidden surface p-5 shadow-card lg:block">
        <div className="flex items-center gap-4">
          <DateBlock iso={session.startsAt} timeZone={session.timezone} />
          <div>
            <p className="font-medium">{formatDate(session.startsAt, session.timezone)}</p>
            <p className="text-sm text-muted-foreground">
              {formatTime(session.startsAt, session.timezone)} {timezoneCity(session.timezone)} time · {formatDuration(session.durationMinutes)}
              <LocalTime iso={session.startsAt} timeZone={session.timezone} />
            </p>
          </div>
        </div>
        {view.phase === "scheduled" && (
          <>
            <SeatsMeter seats={{ total: session.seats.total, taken: session.seats.total - view.left }} className="mt-5" />
            <p className="mt-3 text-xs text-muted-foreground">Registration closes {deadline}</p>
          </>
        )}
        <p className="mt-5 text-2xl font-semibold">
          {formatPrice(session.price)}
          <span className="text-sm font-normal text-muted-foreground"> / seat</span>
        </p>
        <SessionNotice view={view} />
        <div className="mt-4">{action}</div>
        <p className="mt-3 text-xs text-muted-foreground">{cancellationTerms.group}</p>
      </div>

      <div data-mobile-bar className="mobile-bar">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          {status ? (
            <SessionBadge view={view} className="shrink-0 py-1 text-sm" />
          ) : (
            <p className="shrink-0 text-sm">
              <span className="font-semibold">{formatPrice(session.price)}</span>
              <span className="text-muted-foreground"> / seat</span>
            </p>
          )}
          <div className="flex-1">{action}</div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogContent className="max-h-dvh gap-5 overflow-y-auto p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Reserve your seat</DialogTitle>
            <DialogDescription>
              {session.title} · {formatDate(session.startsAt, session.timezone)}, {formatTime(session.startsAt, session.timezone)}{" "}
              {timezoneLabel(session.timezone, session.startsAt)}
            </DialogDescription>
          </DialogHeader>
          {order?.status === "confirmed" ? (
            <div className="py-6 text-center">
              <SuccessHero
                compact
                heading="h3"
                title="You're in!"
                description={`Order ${order.id} · ${formatPrice(order.quote.total, order.quote.currency)} (demo payment). The session link appears here 30 minutes before the start.`}
              />
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
                  View in my sessions
                </Link>
                <AddToCalendar
                  event={{
                    uid: order.bookingId,
                    start: session.startsAt,
                    durationMinutes: session.durationMinutes,
                    title: session.title,
                    description: `MentorBridge group session (order ${order.id}). The session link appears on the session page 30 minutes before the start.`,
                    location: `${window.location.origin}/sessions/${session.id}`,
                  }}
                />
              </div>
            </div>
          ) : order ? (
            <PaymentStatus order={order} onRestart={restart} />
          ) : (
            <>
              <DemoNotice />
              {failure && <CheckoutError title="We couldn't reserve your seat." message={failure.message} action={<RecoveryAction failure={failure} />} />}
              <ContactFields value={contact} onChange={setContact} />
              <PaymentMethodPicker value={payment} onChange={setPayment} />
              <DemoResultPicker value={demoResult} onChange={setDemoResult} />
              <PriceBreakdown price={session.price} label="1 seat" className="rounded-xl bg-muted/60 p-4" />
              <p className="text-xs text-muted-foreground">{cancellationTerms.group}</p>
              <Button size="lg" onClick={confirm} disabled={!isValidContact(contact) || submitting}>
                {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
                {submitting ? "Processing…" : `Pay ${formatPrice(total)}`}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function RecoveryAction({ failure }: { failure: Extract<PaymentOutcome, { ok: false }> }) {
  if (failure.code === "learner-busy") {
    return (
      <Link href="/dashboard" className="font-medium underline underline-offset-4">
        Check my sessions
      </Link>
    )
  }
  return (
    <Link href="/sessions" className="font-medium underline underline-offset-4">
      Browse other sessions
    </Link>
  )
}

// Seats, deadline and status for phones, where the sticky panel is replaced by the bottom bar.
export function SessionStatusMobile({ session: base }: { session: GroupSession }) {
  const view = useSessionView(base)
  const { session } = view
  const closes = registrationDeadline(session)

  return (
    <div className="mt-6 lg:hidden">
      {view.phase === "scheduled" && (
        <>
          <SeatsMeter seats={{ total: session.seats.total, taken: session.seats.total - view.left }} />
          <p className="mt-2 text-xs text-muted-foreground">
            Registration closes {formatDate(closes, session.timezone)}, {formatTime(closes, session.timezone)}. {cancellationTerms.group}
          </p>
        </>
      )}
      <SessionNotice view={view} />
    </div>
  )
}

function SessionNotice({ view }: { view: ReturnType<typeof useSessionView> }) {
  const { session } = view
  if (view.phase === "cancelled") {
    return (
      <div role="status" className="mt-3 flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p>
          <span className="font-medium">This session was cancelled.</span> {session.cancellationReason}{" "}
          {view.learner === "cancelled" ? "Your payment is refunded in full." : "Anyone who paid is refunded in full."}
        </p>
      </div>
    )
  }
  if (view.learner === "enrolled") {
    return (
      <div className="mt-3 space-y-3">
        <p className="flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm font-medium text-success">
          <CheckCircle2Icon className="size-4" aria-hidden="true" />
          You&apos;re in. See you there!
        </p>
        <MeetingCard session={session} bookings={view.bookings} />
      </div>
    )
  }
  if (view.learner === "pending") {
    return <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">Your seat is held for a few minutes. Finish payment to keep it.</p>
  }
  if (!view.check.open && view.check.reason === "full") {
    return <p className="mt-3 rounded-xl bg-warning-soft p-3 text-sm text-warning">This session is full.</p>
  }
  if (!view.check.open && view.check.reason === "closed") {
    return <p className="mt-3 rounded-xl bg-muted p-3 text-sm">Registration for this session has closed.</p>
  }
  return null
}
