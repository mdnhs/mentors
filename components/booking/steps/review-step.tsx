"use client"

import { PencilIcon } from "lucide-react"

import type { Step } from "@/components/booking/steps/flow"
import {
  CheckoutError,
  ContactFields,
  DemoNotice,
  DemoResultPicker,
  PaymentMethodPicker,
  PriceBreakdown,
  type Contact,
  type PaymentMethod,
} from "@/components/checkout/checkout-parts"
import { offerMeta } from "@/components/mentors/offer-meta"
import { formatDate, formatTime, timezoneLabel } from "@/lib/format"
import { cancellationTerms } from "@/lib/offers"
import type { DemoResult } from "@/lib/payment-client"
import type { PaymentOutcome } from "@/lib/payment-service"
import type { Mentor, Offer } from "@/lib/types"

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
}

export function ReviewStep({ mentor, offer, slot, timezone, note, contact, payment, demoResult, failure, onContact, onPayment, onDemoResult, onEdit }: ReviewStepProps) {
  const firstName = mentor.name.split(" ")[0]
  const isReview = offer.type === "review"
  const end = slot && "durationMinutes" in offer ? new Date(new Date(slot).getTime() + offer.durationMinutes * 60_000) : null

  const rows = [
    { label: "Session", value: `${offer.title} · ${offerMeta(offer)}`, edit: "offer" as const },
    slot && end
      ? {
          label: "When",
          value: `${formatDate(slot, timezone)}, ${formatTime(slot, timezone)} – ${formatTime(end, timezone)}`,
          detail: [timezoneLabel(timezone, slot), mentor.timezone !== timezone && `${formatTime(slot, mentor.timezone)} for ${firstName} in ${mentor.city}`]
            .filter(Boolean)
            .join(" · "),
          edit: "schedule" as const,
        }
      : null,
    { label: "Goals", value: note.trim(), edit: (isReview ? "schedule" : "goals") as Step },
  ].filter(Boolean) as { label: string; value: string; detail?: string; edit: Step }[]

  return (
    <div className="space-y-6">
      <h2 tabIndex={-1} className="text-subheading outline-none">
        Review your booking
      </h2>

      {failure && (
        <CheckoutError
          message={failure.message}
          action={
            <button type="button" onClick={() => onEdit("offer")} className="font-medium underline underline-offset-4">
              Choose another session
            </button>
          }
        />
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
