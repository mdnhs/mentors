import { CalendarDaysIcon } from "lucide-react"

import { PriceBreakdown } from "@/components/checkout/checkout-parts"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { offerIcons, offerMeta } from "@/components/mentors/offer-meta"
import { offerTypeLabels } from "@/lib/categories"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import { cancellationTerms } from "@/lib/offers"
import type { Mentor, Offer } from "@/lib/types"
import { cn } from "@/lib/utils"

type SummaryProps = { mentor: Mentor; offer: Offer; slot: string | null; timezone: string; className?: string }

export function MobileSummary({ mentor, offer, slot, timezone, className }: SummaryProps) {
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

export function Summary({ mentor, offer, slot, timezone, className }: SummaryProps) {
  const Icon = offerIcons[offer.type]

  return (
    <div className={cn("surface p-5 shadow-card", className)}>
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
        {offer.type !== "review" && !slot && <p className="text-muted-foreground">Pick a date and time to continue.</p>}
      </div>
      <PriceBreakdown price={offer.price} label={offer.type === "mentorship" ? "First month" : "Session price"} className="mt-5 border-t pt-5" />
      <p className="mt-4 text-xs text-muted-foreground">{cancellationTerms[offer.cancellation]}</p>
    </div>
  )
}
