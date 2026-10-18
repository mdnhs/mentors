"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { CalendarOffIcon, CircleAlertIcon } from "lucide-react"

import { BookingSuccess } from "@/components/booking/booking-success"
import { RescheduleFlow } from "@/components/booking/reschedule-flow"
import { SchedulePicker } from "@/components/booking/schedule-picker"
import { blockedReason, nextStep, parseStep, previousStep, resolveStep, stepsFor, type Step } from "@/components/booking/steps/flow"
import { GoalsStep } from "@/components/booking/steps/goals-step"
import { OfferStep } from "@/components/booking/steps/offer-step"
import { ReviewDetailsStep } from "@/components/booking/steps/review-details-step"
import { ReviewStep } from "@/components/booking/steps/review-step"
import { StepActions } from "@/components/booking/steps/step-actions"
import { StepProgress } from "@/components/booking/steps/step-progress"
import { MobileSummary, Summary } from "@/components/booking/steps/summary"
import { CheckoutError, isValidContact, type Contact, type PaymentMethod } from "@/components/checkout/checkout-parts"
import { PaymentStatus } from "@/components/checkout/payment-status"
import { EmptyState } from "@/components/site/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPrice } from "@/lib/format"
import { getBookableOffers, resolveRequestedOffer, type RequestedOffer } from "@/lib/offers"
import { payForOrder, type DemoResult } from "@/lib/payment-client"
import { startCheckout, type PaymentOutcome } from "@/lib/payment-service"
import { quote } from "@/lib/pricing"
import { site } from "@/lib/site"
import { createBookingId, createOrderId, transact, useAppState, useIsClient, useManagedMentor } from "@/lib/store"
import type { Mentor, Offer } from "@/lib/types"

export function BookingFlow({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const mentor = useManagedMentor(slug)!
  const rescheduleId = searchParams.get("reschedule")
  if (rescheduleId) return <RescheduleFlow mentor={mentor} bookingId={rescheduleId} />

  const now = new Date()
  const requested = resolveRequestedOffer(mentor, searchParams.get("offer"), now)
  const offers = getBookableOffers(mentor, now).filter((offer) => offer.type !== "group")
  if (offers.length === 0) return <NoBookableOffers mentor={mentor} />
  const initialOffer = requested.kind === "ok" ? requested.offer : undefined
  return <Flow key={searchParams.get("offer") ?? "none"} mentor={mentor} offers={offers} initialOffer={initialOffer} requested={requested} />
}

type FlowProps = { mentor: Mentor; offers: Offer[]; initialOffer?: Offer; requested: RequestedOffer }

function Flow({ mentor, offers, initialOffer, requested }: FlowProps) {
  const isClient = useIsClient()
  const searchParams = useSearchParams()
  const { bookings, orders, incoming } = useAppState()
  const firstName = mentor.name.split(" ")[0]

  const [now] = useState(() => new Date())
  const [offerId, setOfferId] = useState(initialOffer?.id ?? offers[0].id)
  const [slot, setSlot] = useState<string | null>(null)
  const [timezone, setTimezone] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [documentLink, setDocumentLink] = useState("")
  const [contact, setContact] = useState<Contact>({ name: site.learner.name, email: site.learner.email })
  const [payment, setPayment] = useState<PaymentMethod>("bkash")
  const [submitting, setSubmitting] = useState(false)
  const [demoResult, setDemoResult] = useState<DemoResult>("success")
  const [failure, setFailure] = useState<Extract<PaymentOutcome, { ok: false }> | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const inFlight = useRef(false)
  const requestId = useRef(createBookingId())
  const stepRegion = useRef<HTMLDivElement>(null)
  const shownStep = useRef<Step | null>(null)

  const offer = offers.find((item) => item.id === offerId) ?? offers[0]
  const isReview = offer.type === "review"
  const learnerTimezone = timezone ?? (isClient ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Dhaka")

  const flowState = { isReview, slot, note, documentLink, contactValid: isValidContact(contact) }
  const stepParam = searchParams.get("step")
  // The step lives in the URL so browser Back/Forward move between steps; missing details send the learner back.
  const step = resolveStep(parseStep(stepParam) ?? (initialOffer ? "schedule" : "offer"), flowState)
  const steps = stepsFor(isReview)
  const blocked = blockedReason(step, flowState)

  const writeStep = (next: Step, mode: "push" | "replace") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("step", next)
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", `?${params.toString()}`)
  }

  useEffect(() => {
    if (stepParam !== null && stepParam !== step) writeStep(step, "replace")
  })

  useEffect(() => {
    if (shownStep.current !== null && shownStep.current !== step) {
      stepRegion.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
    shownStep.current = step
  }, [step])

  const goTo = (next: Step) => writeStep(next, "push")

  const confirm = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    setFailure(null)
    const notes = [note.trim(), documentLink.trim() && `Document: ${documentLink.trim()}`].filter(Boolean).join("\n")
    const outcome = await transact((current) =>
      startCheckout(
        current,
        {
          requestId: requestId.current,
          bookingId: createBookingId(),
          orderId: createOrderId(),
          method: payment,
          mentor,
          offer,
          startsAt: slot ?? undefined,
          timezone: learnerTimezone,
          note: notes || undefined,
        },
        new Date()
      )
    )
    if (outcome.ok) {
      setOrderId(outcome.order.id)
      window.scrollTo({ top: 0 })
      await payForOrder(outcome.order.id, payment, demoResult)
    } else {
      setFailure(outcome)
      // Clearing the slot makes resolveStep send the learner back to the schedule step to pick another time.
      if (outcome.code !== "offer-unavailable") setSlot(null)
    }
    inFlight.current = false
    setSubmitting(false)
  }

  const restart = () => {
    requestId.current = createBookingId()
    setOrderId(null)
    setSlot(null)
    setFailure(null)
    goTo("schedule")
  }

  const handleNext = () => {
    const next = nextStep(step, isReview)
    if (next) goTo(next)
    else confirm()
  }

  const order = orderId ? orders.find((item) => item.id === orderId) : undefined
  const booking = order && bookings.find((item) => item.id === order.bookingId)
  if (order?.status === "confirmed" && booking) return <BookingSuccess booking={booking} mentor={mentor} order={order} />
  if (order) {
    return (
      <div className="mx-auto mt-4 max-w-lg surface p-4 shadow-card sm:p-6">
        <PaymentStatus order={order} onRestart={restart} />
      </div>
    )
  }

  const back = previousStep(step, isReview)
  const slotFailure = failure && failure.code !== "offer-unavailable" && !isReview ? failure : null
  const actions = {
    onBack: back ? () => goTo(back) : undefined,
    nextLabel: step === "review" ? `Pay ${formatPrice(quote(offer.price).total)}` : "Continue",
    onNext: handleNext,
    disabled: blocked !== null,
    busy: submitting,
    blockedReason: blocked,
  }

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="lg:col-span-2">
          <h1 className="text-title">Book {firstName}</h1>

          <StepProgress steps={steps} current={step} disabled={submitting} onEdit={goTo} />

          {step === "offer" && <RequestNotice requested={requested} firstName={firstName} />}

          <MobileSummary mentor={mentor} offer={offer} slot={slot} timezone={learnerTimezone} className="mt-5 lg:hidden" />

          <div ref={stepRegion} className="mt-5 surface p-4 shadow-card sm:p-6">
            {step === "offer" && (
              <OfferStep
                offers={offers}
                value={offer.id}
                onChange={(id) => {
                  setOfferId(id)
                  setSlot(null)
                }}
                mentor={mentor}
              />
            )}

            {step === "schedule" && slotFailure && (
              <CheckoutError
                title={slotFailure.code === "booked" ? "That time was just taken — pick another" : "That time can't be booked — pick another"}
                message={slotFailure.message}
                className="mb-6"
              />
            )}
            {step === "schedule" && !isReview && !isClient && <ScheduleSkeleton />}
            {step === "schedule" && !isReview && isClient && "durationMinutes" in offer && (
              <SchedulePicker
                mentor={mentor}
                durationMinutes={offer.durationMinutes}
                bookings={bookings}
                otherBookings={incoming.bookings}
                now={now}
                timezone={learnerTimezone}
                onTimezone={setTimezone}
                value={slot}
                onChange={(next) => {
                  setSlot(next)
                  setFailure(null)
                }}
              />
            )}

            {step === "schedule" && offer.type === "review" && (
              <ReviewDetailsStep
                offer={offer}
                firstName={firstName}
                note={note}
                documentLink={documentLink}
                onNote={setNote}
                onDocumentLink={setDocumentLink}
              />
            )}

            {step === "goals" && <GoalsStep firstName={firstName} note={note} onNote={setNote} />}

            {step === "review" && (
              <ReviewStep
                mentor={mentor}
                offer={offer}
                slot={slot}
                timezone={learnerTimezone}
                note={note}
                contact={contact}
                payment={payment}
                demoResult={demoResult}
                failure={failure}
                onContact={setContact}
                onPayment={setPayment}
                onDemoResult={setDemoResult}
                onEdit={goTo}
              />
            )}
          </div>

          <StepActions variant="desktop" {...actions} />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Summary mentor={mentor} offer={offer} slot={slot} timezone={learnerTimezone} />
          </div>
        </aside>
      </div>

      <StepActions variant="mobile" {...actions} />
    </>
  )
}

function ScheduleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading available times">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="mt-4 h-72 rounded-xl" />
    </div>
  )
}

function RequestNotice({ requested, firstName }: { requested: RequestedOffer; firstName: string }) {
  if (requested.kind === "none" || requested.kind === "ok") return null

  const message =
    requested.kind === "missing"
      ? `That offer isn't available. Choose one of ${firstName}'s current offers below.`
      : requested.kind === "unavailable"
        ? `${requested.offer.title} isn't available. ${requested.reason}`
        : `${requested.offer.title} is a group session with its own sign-up.`

  return (
    <div role="status" className="mt-5 flex items-start gap-3 rounded-xl bg-warning-soft p-4 text-sm text-warning">
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        {message}
        {requested.kind === "group" && (
          <>
            {" "}
            <Link href={`/sessions/${requested.offer.sessionId}`} className="font-medium underline underline-offset-4">
              Reserve a seat
            </Link>
          </>
        )}
      </p>
    </div>
  )
}

function NoBookableOffers({ mentor }: { mentor: Mentor }) {
  const firstName = mentor.name.split(" ")[0]
  return (
    <div className="mt-4 max-w-2xl">
      <h1 className="text-title">Book {firstName}</h1>
      <EmptyState
        icon={CalendarOffIcon}
        title={`${firstName} isn't taking bookings right now`}
        description="Save their profile to come back later, or find another mentor with open times."
        className="mt-6"
      >
        <Link href={`/mentors/${mentor.slug}`} className={buttonVariants({ variant: "outline" })}>
          Back to profile
        </Link>
        <Link href="/mentors" className={buttonVariants()}>
          Find a mentor
        </Link>
      </EmptyState>
    </div>
  )
}
