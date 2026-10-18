import { CheckIcon } from "lucide-react"

import { offerFacts, offerIcons, offerMeta, priceUnits } from "@/components/mentors/offer-meta"
import { Button } from "@/components/ui/button"
import { offerTypeLabels } from "@/lib/categories"
import { formatPrice } from "@/lib/format"
import { cancellationTerms, offerActionLabels } from "@/lib/offers"
import { isValidAmount } from "@/lib/pricing"
import type { Mentor, Offer } from "@/lib/types"

// The offer as a learner sees it in the public panel, without the booking link.
export function OfferPreviewCard({ mentor, offer }: { mentor: Mentor; offer: Offer }) {
  const Icon = offerIcons[offer.type]
  const unit = priceUnits[offer.type]
  const priced = isValidAmount(offer.price)

  return (
    <div className="surface p-4 shadow-card sm:p-5" aria-label="Public preview">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Public preview</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-medium">{offer.title.trim() || "Untitled offer"}</p>
          <p className="text-xs text-muted-foreground">{offerTypeLabels[offer.type]}</p>
        </div>
        <p className="text-right text-sm font-semibold">
          {priced ? formatPrice(offer.price) : "—"}
          {unit && <span className="block text-xs font-normal text-muted-foreground">{unit}</span>}
        </p>
      </div>
      <div className="mt-4 border-t pt-4">
        <p className="text-sm">{offer.description.trim() || "Your description appears here."}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground" aria-label="Details">
          {offerFacts(mentor, offer).map(({ icon: FactIcon, text }) => (
            <li key={text} className="flex gap-2">
              <FactIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {text}
            </li>
          ))}
          {offer.type !== "review" && offer.type !== "group" && <li className="text-xs">{offerMeta(offer)}</li>}
        </ul>
        {offer.includes.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm" aria-label="What's included">
            {offer.includes.map((item) => (
              <li key={item} className="flex gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button size="lg" disabled className="mt-5 w-full">
        {offerActionLabels[offer.type]}
        {priced && ` · ${formatPrice(offer.price)}`}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">{cancellationTerms[offer.cancellation]}</p>
    </div>
  )
}
