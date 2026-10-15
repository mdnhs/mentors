"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckCircle2Icon, Loader2Icon } from "lucide-react"

import {
  ContactFields,
  DemoNotice,
  isValidContact,
  PaymentMethodPicker,
  PriceBreakdown,
  type Contact,
  type PaymentMethod,
} from "@/components/checkout/checkout-parts"
import { DateBlock } from "@/components/sessions/date-block"
import { SeatsMeter } from "@/components/sessions/seats-meter"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { priceBreakdown } from "@/lib/data"
import { DHAKA_TZ, formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format"
import { site } from "@/lib/site"
import { addBooking, createBookingId, useAppState } from "@/lib/store"
import type { GroupSession } from "@/lib/types"
import { cn } from "@/lib/utils"

export function JoinPanel({ session }: { session: GroupSession }) {
  const { bookings } = useAppState()
  const [open, setOpen] = useState(false)
  const [contact, setContact] = useState<Contact>({ name: site.learner.name, email: site.learner.email })
  const [payment, setPayment] = useState<PaymentMethod>("bkash")
  const [submitting, setSubmitting] = useState(false)

  const joined = bookings.some((booking) => booking.sessionId === session.id)
  const seatsLeft = session.seats ? session.seats.total - session.seats.taken - (joined ? 1 : 0) : null
  const fullyBooked = seatsLeft !== null && seatsLeft <= 0 && !joined
  const { total } = priceBreakdown(session.price)

  const confirm = async () => {
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    addBooking({
      id: createBookingId(),
      kind: "group",
      mentorSlug: session.mentorSlug,
      sessionId: session.id,
      title: session.title,
      date: session.startsAt,
      durationMinutes: session.durationMinutes,
      timezone: DHAKA_TZ,
      total,
      status: "upcoming",
    })
    setSubmitting(false)
    setOpen(false)
  }

  const action = joined ? (
    <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}>
      View in my sessions
    </Link>
  ) : (
    <Button size="lg" className="w-full" disabled={fullyBooked} onClick={() => setOpen(true)}>
      {fullyBooked ? "Fully booked" : `Reserve seat · ${formatPrice(session.price)}`}
    </Button>
  )

  return (
    <>
      <div className="hidden surface p-5 shadow-card lg:block">
        <div className="flex items-center gap-4">
          <DateBlock iso={session.startsAt} />
          <div>
            <p className="font-medium">{formatDate(session.startsAt)}</p>
            <p className="text-sm text-muted-foreground">
              {formatTime(session.startsAt)} Dhaka time · {formatDuration(session.durationMinutes)}
            </p>
          </div>
        </div>
        {session.seats && (
          <SeatsMeter seats={{ total: session.seats.total, taken: session.seats.taken + (joined ? 1 : 0) }} className="mt-5" />
        )}
        <p className="mt-5 text-2xl font-semibold">
          {formatPrice(session.price)}
          <span className="text-sm font-normal text-muted-foreground"> / seat</span>
        </p>
        {joined && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-success-soft p-3 text-sm font-medium text-success">
            <CheckCircle2Icon className="size-4" aria-hidden="true" />
            You&apos;re in. See you there!
          </p>
        )}
        <div className="mt-4">{action}</div>
      </div>

      <div data-mobile-bar className="mobile-bar">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          {joined ? (
            <p className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2Icon className="size-4" aria-hidden="true" />
              You&apos;re in
            </p>
          ) : (
            <p className="shrink-0 text-sm">
              <span className="font-semibold">{formatPrice(session.price)}</span>
              <span className="text-muted-foreground"> / seat</span>
            </p>
          )}
          <div className="flex-1">{action}</div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
        <DialogContent className="max-h-dvh gap-5 overflow-y-auto p-5 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Reserve your seat</DialogTitle>
            <DialogDescription>
              {session.title} · {formatDate(session.startsAt)}, {formatTime(session.startsAt)}
            </DialogDescription>
          </DialogHeader>
          <DemoNotice />
          <ContactFields value={contact} onChange={setContact} />
          <PaymentMethodPicker value={payment} onChange={setPayment} />
          <PriceBreakdown price={session.price} label="1 seat" className="rounded-xl bg-muted/60 p-4" />
          <Button size="lg" onClick={confirm} disabled={!isValidContact(contact) || submitting}>
            {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {submitting ? "Confirming…" : `Confirm · ${formatPrice(total)}`}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
