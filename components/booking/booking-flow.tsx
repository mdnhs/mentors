"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRef, useState } from "react"
import { CalendarDaysIcon, CalendarOffIcon, CheckIcon, CircleAlertIcon, ClockIcon, Loader2Icon, PencilIcon, UploadIcon } from "lucide-react"

import { BookingSuccess } from "@/components/booking/booking-success"
import { RescheduleFlow } from "@/components/booking/reschedule-flow"
import { SchedulePicker } from "@/components/booking/schedule-picker"
import {
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
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { offerIcons, offerMeta } from "@/components/mentors/offer-meta"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { offerTypeLabels } from "@/lib/categories"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import { cancellationTerms, getBookableOffers, resolveRequestedOffer, type RequestedOffer } from "@/lib/offers"
import { payForOrder, type DemoResult } from "@/lib/payment-client"
import { startCheckout, type PaymentOutcome } from "@/lib/payment-service"
import { quote } from "@/lib/pricing"
import { site } from "@/lib/site"
import { createBookingId, createOrderId, transact, useAppState, useIsClient, useManagedMentor } from "@/lib/store"
import type { Mentor, Offer, ReviewOffer } from "@/lib/types"
import { cn } from "@/lib/utils"

type Step = "offer" | "schedule" | "goals" | "review"

const MIN_GOALS = 10

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
  const { bookings, orders } = useAppState()
  const firstName = mentor.name.split(" ")[0]

  const [now] = useState(() => new Date())
  const [step, setStep] = useState<Step>(initialOffer ? "schedule" : "offer")
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

  const offer = offers.find((item) => item.id === offerId) ?? offers[0]
  const isReview = offer.type === "review"
  const learnerTimezone = timezone ?? (isClient ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Dhaka")

  const steps: { id: Step; label: string }[] = isReview
    ? [
        { id: "offer", label: "Session" },
        { id: "schedule", label: "Details" },
        { id: "review", label: "Review" },
      ]
    : [
        { id: "offer", label: "Session" },
        { id: "schedule", label: "Date & time" },
        { id: "goals", label: "Goals" },
        { id: "review", label: "Review" },
      ]
  const stepIndex = steps.findIndex((item) => item.id === step)

  const goalsReady = note.trim().length >= MIN_GOALS
  const canContinue =
    step === "offer" ||
    (step === "schedule" && (isReview ? goalsReady : Boolean(slot))) ||
    (step === "goals" && goalsReady) ||
    (step === "review" && isValidContact(contact))

  const goTo = (next: Step) => {
    setStep(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
    if (step === "offer") goTo("schedule")
    else if (step === "schedule") goTo(isReview ? "review" : "goals")
    else if (step === "goals") goTo("review")
    else confirm()
  }

  const previous = (): Step | null => {
    const index = steps.findIndex((item) => item.id === step)
    return index > 0 ? steps[index - 1].id : null
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

  const nextLabel = step === "review" ? `Pay ${formatPrice(quote(offer.price).total)}` : "Continue"
  const back = previous()

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="lg:col-span-2">
          <h1 className="text-title">Book {firstName}</h1>

          <ol className="mt-5 flex items-center gap-2 text-sm" aria-label="Booking steps">
            {steps.map((item, index) => {
              const done = index < stepIndex
              const current = index === stepIndex
              return (
                <li key={item.id} className="flex items-center gap-2">
                  {index > 0 && <span className="h-px w-4 bg-border sm:w-8" aria-hidden="true" />}
                  <button
                    type="button"
                    disabled={!done || submitting}
                    onClick={() => goTo(item.id)}
                    aria-current={current ? "step" : undefined}
                    className="flex items-center gap-2 rounded-md px-2 py-2 focus-ring disabled:cursor-default"
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                        done && "bg-success text-success-foreground",
                        current && "bg-primary text-primary-foreground",
                        !done && !current && "bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? <CheckIcon className="size-3.5" aria-hidden="true" /> : index + 1}
                    </span>
                    <span className={cn(current ? "font-medium" : "text-muted-foreground", !current && "hidden sm:inline")}>
                      {item.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {step === "offer" && <RequestNotice requested={requested} firstName={firstName} />}

          <MobileSummary mentor={mentor} offer={offer} slot={slot} timezone={learnerTimezone} className="mt-5 lg:hidden" />

          <div className="mt-5 surface p-4 shadow-card sm:p-6">
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

            {step === "schedule" && !isReview && !isClient && <ScheduleSkeleton />}
            {step === "schedule" && !isReview && isClient && "durationMinutes" in offer && (
              <SchedulePicker
                mentor={mentor}
                durationMinutes={offer.durationMinutes}
                bookings={bookings}
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
                onPickAnother={() => goTo("schedule")}
              />
            )}
          </div>

          <div className="mt-4 hidden items-center justify-between sm:flex">
            <StepBack back={back} onBack={goTo} disabled={submitting} />
            <Button onClick={handleNext} disabled={!canContinue || submitting} size="lg" className="min-w-40">
              {submitting ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
              {submitting ? "Processing…" : nextLabel}
            </Button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Summary mentor={mentor} offer={offer} slot={slot} timezone={learnerTimezone} />
          </div>
        </aside>
      </div>

      <div data-mobile-bar className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-card/95 px-4 py-3 backdrop-blur sm:hidden">
        <StepBack back={back} onBack={goTo} disabled={submitting} />
        <Button onClick={handleNext} disabled={!canContinue || submitting} size="lg" className="flex-1">
          {submitting ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Processing…" : nextLabel}
        </Button>
      </div>
    </>
  )
}

function StepBack({ back, onBack, disabled }: { back: Step | null; onBack: (step: Step) => void; disabled: boolean }) {
  if (!back) return <span />
  return (
    <Button variant="ghost" size="lg" disabled={disabled} onClick={() => onBack(back)}>
      Back
    </Button>
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

function GoalsStep({ firstName, note, onNote }: { firstName: string; note: string; onNote: (value: string) => void }) {
  const remaining = Math.max(MIN_GOALS - note.trim().length, 0)

  return (
    <div className="grid gap-1.5">
      <h2 className="text-subheading" id="goals-heading">
        What do you want from this session?
      </h2>
      <Label htmlFor="session-goals" className="mt-3">
        Your goals
      </Label>
      <Textarea
        id="session-goals"
        rows={5}
        value={note}
        onChange={(event) => onNote(event.target.value)}
        placeholder={`Share your background and what you'd like ${firstName} to help with, so the session starts fast.`}
        aria-describedby="session-goals-hint"
        className="bg-card"
      />
      <p id="session-goals-hint" className="text-xs text-muted-foreground">
        {remaining > 0 ? `${remaining} more characters needed` : "Looks good"}
      </p>
    </div>
  )
}

type ReviewStepProps = {
  mentor: Mentor
  offer: Offer
  slot: string | null
  timezone: string
  note: string
  contact: Contact
  payment: PaymentMethod
  demoResult: DemoResult
  failure: Extract<PaymentOutcome, { ok: false }> | null
  onContact: (value: Contact) => void
  onPayment: (value: PaymentMethod) => void
  onDemoResult: (value: DemoResult) => void
  onEdit: (step: Step) => void
  onPickAnother: () => void
}

function ReviewStep({ mentor, offer, slot, timezone, note, contact, payment, demoResult, failure, onContact, onPayment, onDemoResult, onEdit, onPickAnother }: ReviewStepProps) {
  const firstName = mentor.name.split(" ")[0]
  const isReview = offer.type === "review"
  const end = slot && "durationMinutes" in offer ? new Date(new Date(slot).getTime() + offer.durationMinutes * 60_000) : null

  const rows = [
    { label: "Session", value: `${offer.title} · ${offerMeta(offer)}`, edit: "offer" as const },
    slot && end
      ? {
          label: "When",
          value: `${formatDate(slot, timezone)}, ${formatTime(slot, timezone)} – ${formatTime(end, timezone)}`,
          detail: mentor.timezone !== timezone ? `${formatTime(slot, mentor.timezone)} for ${firstName} in ${mentor.city}` : undefined,
          edit: "schedule" as const,
        }
      : null,
    { label: "Goals", value: note.trim(), edit: (isReview ? "schedule" : "goals") as Step },
  ].filter(Boolean) as { label: string; value: string; detail?: string; edit: Step }[]

  return (
    <div className="space-y-6">
      <h2 className="text-subheading">Review your booking</h2>

      {failure && (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-warning-soft p-4 text-sm text-warning ring-1 ring-warning/20">
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">We couldn&apos;t book that.</p>
            <p>{failure.message}</p>
            {failure.code !== "offer-unavailable" && (
              <button type="button" onClick={onPickAnother} className="mt-2 font-medium underline underline-offset-4">
                Choose another time
              </button>
            )}
          </div>
        </div>
      )}

      <dl className="divide-y rounded-xl border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 p-3 text-sm sm:p-4">
            <div className="min-w-0">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="mt-0.5 font-medium wrap-break-word">{row.value}</dd>
              {row.detail && <dd className="mt-0.5 text-muted-foreground">{row.detail}</dd>}
            </div>
            <button
              type="button"
              onClick={() => onEdit(row.edit)}
              aria-label={`Change ${row.label.toLowerCase()}`}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-ring"
            >
              <PencilIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </dl>

      <DemoNotice />
      <ContactFields value={contact} onChange={onContact} />
      <PaymentMethodPicker value={payment} onChange={onPayment} />
      <DemoResultPicker value={demoResult} onChange={onDemoResult} />
      <PriceBreakdown price={offer.price} label={offer.title} className="rounded-xl bg-muted/60 p-4 lg:hidden" />
      <p className="text-sm text-muted-foreground">{cancellationTerms[offer.cancellation]}</p>
    </div>
  )
}

function OfferStep({
  offers,
  value,
  onChange,
  mentor,
}: {
  offers: Offer[]
  value: string
  onChange: (id: string) => void
  mentor: Mentor
}) {
  const groupOffer = mentor.offers.find((offer) => offer.type === "group")

  return (
    <div>
      <h2 className="text-subheading" id="offer-step">
        Choose a session
      </h2>
      <div role="radiogroup" aria-labelledby="offer-step" className="mt-4 grid gap-2">
        {offers.map((offer) => {
          const Icon = offerIcons[offer.type]
          return (
            <label
              key={offer.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition sm:p-4 hover:border-foreground/20 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="booking-offer"
                checked={offer.id === value}
                onChange={() => onChange(offer.id)}
                className="sr-only"
              />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{offer.title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{offer.description}</span>
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  {offerTypeLabels[offer.type]} · {offerMeta(offer)}
                </span>
              </span>
              <span className="font-semibold">{formatPrice(offer.price)}</span>
            </label>
          )
        })}
      </div>
      {groupOffer?.sessionId && (
        <p className="mt-4 text-sm text-muted-foreground">
          Prefer a group session?{" "}
          <Link href={`/sessions/${groupOffer.sessionId}`} className="link">
            Join {groupOffer.title}
          </Link>
        </p>
      )}
    </div>
  )
}

function ReviewDetailsStep({
  offer,
  firstName,
  note,
  documentLink,
  onNote,
  onDocumentLink,
}: {
  offer: ReviewOffer
  firstName: string
  note: string
  documentLink: string
  onNote: (value: string) => void
  onDocumentLink: (value: string) => void
}) {
  const remaining = Math.max(10 - note.trim().length, 0)

  return (
    <div className="space-y-6">
      <h2 className="text-subheading">What should {firstName} review?</h2>
      <div className="grid gap-1.5">
        <Label htmlFor="review-goals">Your goals</Label>
        <Textarea
          id="review-goals"
          rows={4}
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="E.g. I'm applying for a funded master's in Germany and want my SOP to sound more specific."
          aria-describedby="review-goals-hint"
          className="bg-card"
        />
        <p id="review-goals-hint" className="text-xs text-muted-foreground">
          {remaining > 0 ? `${remaining} more characters needed` : "Looks good"}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="review-link">
          Document link <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="review-link"
          type="url"
          inputMode="url"
          value={documentLink}
          onChange={(event) => onDocumentLink(event.target.value)}
          placeholder="https://drive.google.com/…"
        />
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <UploadIcon className="size-4 shrink-0" aria-hidden="true" />
          Send: {offer.learnerProvides}
        </li>
        <li className="flex items-center gap-2">
          <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
          Written feedback within {offer.deliveryDays} days.
        </li>
      </ul>
    </div>
  )
}

function MobileSummary({ mentor, offer, slot, timezone, className }: { mentor: Mentor; offer: Offer; slot: string | null; timezone: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 surface p-3", className)}>
      <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-11" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{offer.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {mentor.name} · {offerMeta(offer)}
        </p>
        {slot && (
          <p className="truncate text-xs font-medium">
            {formatDate(slot, timezone)}, {formatTime(slot, timezone)}
          </p>
        )}
      </div>
      <p className="text-sm font-semibold">{formatPrice(offer.price)}</p>
    </div>
  )
}

function Summary({ mentor, offer, slot, timezone }: { mentor: Mentor; offer: Offer; slot: string | null; timezone: string }) {
  const Icon = offerIcons[offer.type]

  return (
    <div className="surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-12" />
        <div className="min-w-0">
          <p className="font-medium">{mentor.name}</p>
          <p className="truncate text-sm text-muted-foreground">{mentor.role}</p>
        </div>
      </div>
      <div className="mt-5 space-y-2 border-t pt-5 text-sm">
        <p className="font-medium">{offer.title}</p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
          {offerTypeLabels[offer.type]} · {offerMeta(offer)}
        </p>
        {slot && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <CalendarDaysIcon className="size-4" aria-hidden="true" />
            {formatDate(slot, timezone)}, {formatTime(slot, timezone)}
          </p>
        )}
        {offer.type !== "review" && !slot && (
          <p className="text-muted-foreground">Pick a date and time to continue.</p>
        )}
      </div>
      <PriceBreakdown price={offer.price} label={offer.type === "mentorship" ? "First month" : "Session price"} className="mt-5 border-t pt-5" />
      <p className="mt-4 text-xs text-muted-foreground">{cancellationTerms[offer.cancellation]}</p>
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
