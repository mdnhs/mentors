import Link from "next/link"

import { offerIcons, offerMeta } from "@/components/mentors/offer-meta"
import { offerTypeLabels } from "@/lib/categories"
import { formatPrice } from "@/lib/format"
import type { Mentor, Offer } from "@/lib/types"

type OfferStepProps = {
  offers: Offer[]
  value: string
  onChange: (id: string) => void
  mentor: Mentor
}

export function OfferStep({ offers, value, onChange, mentor }: OfferStepProps) {
  const groupOffer = mentor.offers.find((offer) => offer.type === "group")

  return (
    <div>
      <h2 tabIndex={-1} className="text-subheading outline-none" id="offer-step">
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
              <input type="radio" name="booking-offer" checked={offer.id === value} onChange={() => onChange(offer.id)} className="sr-only" />
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
