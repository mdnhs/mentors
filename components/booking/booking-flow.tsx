"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"
import { CalendarDaysIcon, CalendarOffIcon, CheckIcon, CircleAlertIcon, ClockIcon, Loader2Icon, UploadIcon } from "lucide-react"

import {
  ContactFields,
  DemoNotice,
  isValidContact,
  PaymentMethodPicker,
  PriceBreakdown,
  type Contact,
  type PaymentMethod,
} from "@/components/checkout/checkout-parts"
import { BookingSuccess } from "@/components/booking/booking-success"
import { FilterSelect } from "@/components/filters/filter-select"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { offerIcons, offerMeta } from "@/components/mentors/offer-meta"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { offerTypeLabels } from "@/lib/categories"
import { getMentor, priceBreakdown } from "@/lib/data"
import { DHAKA_TZ, formatDate, formatDateParts, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import { cancellationTerms, getBookableOffers, resolveRequestedOffer, type RequestedOffer } from "@/lib/offers"
import { site } from "@/lib/site"
import { daysFromNow, slotIso, upcomingDays } from "@/lib/slots"
import { addBooking, createBookingId, useIsClient } from "@/lib/store"
import type { Booking, Mentor, Offer, ReviewOffer } from "@/lib/types"
import { cn } from "@/lib/utils"

type Step = "offer" | "schedule" | "checkout"

export function BookingFlow({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const mentor = getMentor(slug)!
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
  const firstName = mentor.name.split(" ")[0]

  const [step, setStep] = useState<Step>(initialOffer ? "schedule" : "offer")
  const [offerId, setOfferId] = useState(initialOffer?.id ?? offers[0].id)
  const [day, setDay] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [timezone, setTimezone] = useState(DHAKA_TZ)
  const [note, setNote] = useState("")
  const [documentLink, setDocumentLink] = useState("")
  const [contact, setContact] = useState<Contact>({ name: site.learner.name, email: site.learner.email })
  const [payment, setPayment] = useState<PaymentMethod>("bkash")
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState<Booking | null>(null)

  const offer = offers.find((item) => item.id === offerId) ?? offers[0]
  const isReview = offer.type === "review"
  const slot = day && time ? slotIso(day, time) : null

  const steps: { id: Step; label: string }[] = [
    { id: "offer", label: "Session" },
    { id: "schedule", label: isReview ? "Details" : "Date & time" },
    { id: "checkout", label: "Checkout" },
  ]
  const stepIndex = steps.findIndex((item) => item.id === step)

  const canContinue =
    step === "offer" ||
    (step === "schedule" && (isReview ? note.trim().length >= 10 : Boolean(slot))) ||
    (step === "checkout" && isValidContact(contact))

  const goTo = (next: Step) => {
    setStep(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const confirm = async () => {
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const created: Booking = {
      id: createBookingId(),
      kind: offer.type,
      mentorSlug: mentor.slug,
      offerId: offer.id,
      title: offer.title,
      date: offer.type === "review" ? daysFromNow(offer.deliveryDays) : slot!,
      durationMinutes: offer.type === "review" ? undefined : offer.durationMinutes,
      timezone,
      total: priceBreakdown(offer.price).total,
      status: isReview ? "in-review" : "upcoming",
      note: note.trim() || undefined,
    }
    addBooking(created)
    setBooking(created)
    setSubmitting(false)
    window.scrollTo({ top: 0 })
  }

  const handleNext = () => {
    if (step === "offer") goTo("schedule")
    else if (step === "schedule") goTo("checkout")
    else confirm()
  }

  if (booking) return <BookingSuccess booking={booking} mentor={mentor} />

  const nextLabel =
    step === "checkout" ? `Confirm · ${formatPrice(priceBreakdown(offer.price).total)}` : "Continue"

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
                    disabled={!done}
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

          <MobileSummary mentor={mentor} offer={offer} className="mt-5 lg:hidden" />

          <div className="mt-5 surface p-4 shadow-card sm:p-6">
            {step === "offer" && (
              <OfferStep offers={offers} value={offer.id} onChange={setOfferId} mentor={mentor} />
            )}

            {step === "schedule" && !isReview && (
              <ScheduleStep
                mentor={mentor}
                isClient={isClient}
                day={day}
                time={time}
                timezone={timezone}
                note={note}
                onDay={(value) => {
                  setDay(value)
                  setTime(null)
                }}
                onTime={setTime}
                onTimezone={setTimezone}
                onNote={setNote}
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

            {step === "checkout" && (
              <div className="space-y-6">
                <h2 className="text-subheading">Checkout</h2>
                <DemoNotice />
                <ContactFields value={contact} onChange={setContact} />
                <PaymentMethodPicker value={payment} onChange={setPayment} />
                <PriceBreakdown price={offer.price} label={offer.title} className="rounded-xl bg-muted/60 p-4 lg:hidden" />
                <p className="text-sm text-muted-foreground lg:hidden">{cancellationTerms[offer.cancellation]}</p>
              </div>
            )}
          </div>

          <div className="mt-4 hidden items-center justify-between sm:flex">
            <StepBack step={step} onBack={goTo} />
            <Button onClick={handleNext} disabled={!canContinue || submitting} size="lg" className="min-w-40">
              {submitting ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
              {submitting ? "Confirming…" : nextLabel}
            </Button>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Summary mentor={mentor} offer={offer} slot={slot} timezone={timezone} />
          </div>
        </aside>
      </div>

      <div data-mobile-bar className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-card/95 px-4 py-3 backdrop-blur sm:hidden">
        <StepBack step={step} onBack={goTo} />
        <Button onClick={handleNext} disabled={!canContinue || submitting} size="lg" className="flex-1">
          {submitting ? <Loader2Icon className="animate-spin" aria-hidden="true" /> : null}
          {submitting ? "Confirming…" : nextLabel}
        </Button>
      </div>
    </>
  )
}

function StepBack({ step, onBack }: { step: Step; onBack: (step: Step) => void }) {
  if (step === "offer") return <span />
  return (
    <Button variant="ghost" size="lg" onClick={() => onBack(step === "checkout" ? "schedule" : "offer")}>
      Back
    </Button>
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

type ScheduleStepProps = {
  mentor: Mentor
  isClient: boolean
  day: string | null
  time: string | null
  timezone: string
  note: string
  onDay: (value: string) => void
  onTime: (value: string) => void
  onTimezone: (value: string) => void
  onNote: (value: string) => void
}

function ScheduleStep({ mentor, isClient, day, time, timezone, note, onDay, onTime, onTimezone, onNote }: ScheduleStepProps) {
  if (!isClient) {
    return (
      <div aria-busy="true" aria-label="Loading available times">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 flex gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const days = upcomingDays(mentor.availability.days)
  const reference = days[0] ? slotIso(days[0], "12:00") : new Date()
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezones = [...new Set([DHAKA_TZ, mentor.timezone, deviceTz])].map((value) => ({
    value,
    label: timezoneLabel(value, reference),
  }))

  return (
    <div>
      <h2 className="text-subheading">Pick a date</h2>
      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Available dates">
        {days.map((value) => {
          const parts = formatDateParts(slotIso(value, "12:00"))
          return (
            <button
              key={value}
              type="button"
              aria-pressed={day === value}
              onClick={() => onDay(value)}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 transition focus-ring",
                day === value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/30"
              )}
            >
              <span className="text-xs">{parts.weekday}</span>
              <span className="text-lg leading-tight font-semibold">{parts.day}</span>
              <span className="text-xs">{parts.month}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-subheading">Pick a time</h2>
        <FilterSelect label="Timezone" value={timezone} options={timezones} onChange={onTimezone} className="min-w-52" />
      </div>
      {day ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Available times">
          {mentor.availability.times.map((value) => {
            const iso = slotIso(day, value)
            return (
              <button
                key={value}
                type="button"
                aria-pressed={time === value}
                onClick={() => onTime(value)}
                className={cn(
                  "h-11 rounded-xl border text-sm font-medium transition focus-ring",
                  time === value ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:border-foreground/30"
                )}
              >
                {formatTime(iso, timezone)}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <CalendarDaysIcon className="size-4" aria-hidden="true" />
          Choose a date to see available times.
        </p>
      )}
      {day && time && (
        <p className="mt-3 text-sm text-muted-foreground">
          {formatDate(slotIso(day, time), timezone)} at {formatTime(slotIso(day, time), timezone)}
          {mentor.timezone !== timezone &&
            ` · ${formatTime(slotIso(day, time), mentor.timezone)} for ${mentor.name.split(" ")[0]} in ${mentor.city}`}
        </p>
      )}

      <div className="mt-8 grid gap-1.5">
        <Label htmlFor="session-note">
          What would you like to discuss? <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="session-note"
          rows={3}
          value={note}
          onChange={(event) => onNote(event.target.value)}
          placeholder="Share your background and goals so the session starts fast."
          className="bg-card"
        />
      </div>
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

function MobileSummary({ mentor, offer, className }: { mentor: Mentor; offer: Offer; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 surface p-3", className)}>
      <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-11" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{offer.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {mentor.name} · {offerMeta(offer)}
        </p>
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
