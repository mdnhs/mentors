import {
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  LanguagesIcon,
  RepeatIcon,
  UploadIcon,
  UsersIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react"

import { availabilityLabel, getSession } from "@/lib/data"
import { formatDate, formatDuration, formatTime } from "@/lib/format"
import type { Mentor, Offer, OfferType } from "@/lib/types"

export const offerIcons: Record<OfferType, LucideIcon> = {
  "one-on-one": VideoIcon,
  group: UsersIcon,
  review: FileTextIcon,
  mentorship: RepeatIcon,
}

export const priceUnits: Partial<Record<OfferType, string>> = {
  group: "/ seat",
  mentorship: "/ month",
}

export function offerMeta(offer: Offer) {
  switch (offer.type) {
    case "review":
      return `Delivered in ${offer.deliveryDays} days`
    case "mentorship":
      return `${offer.sessionsPerMonth} calls a month`
    case "group": {
      const session = getSession(offer.sessionId)
      return session ? `${formatDate(session.startsAt)} · ${formatDuration(session.durationMinutes)}` : formatDuration(offer.durationMinutes)
    }
    case "one-on-one":
      return formatDuration(offer.durationMinutes)
  }
}

export type OfferFact = { icon: LucideIcon; text: string }

// Only the details a learner needs to decide on this particular kind of offer.
export function offerFacts(mentor: Mentor, offer: Offer): OfferFact[] {
  const schedule = { icon: CalendarIcon, text: `${availabilityLabel(mentor)}, Dhaka time` }

  switch (offer.type) {
    case "one-on-one":
      return [{ icon: VideoIcon, text: `${formatDuration(offer.durationMinutes)} video call` }, schedule]
    case "mentorship":
      return [
        { icon: RepeatIcon, text: `${offer.sessionsPerMonth} calls a month, ${formatDuration(offer.durationMinutes)} each` },
        schedule,
        {
          icon: UsersIcon,
          text: offer.openSpots > 0 ? `${offer.openSpots} mentee ${offer.openSpots === 1 ? "spot" : "spots"} open` : "No mentee spots open",
        },
      ]
    case "review":
      return [
        { icon: ClockIcon, text: `Written feedback within ${offer.deliveryDays} days` },
        { icon: UploadIcon, text: `You send: ${offer.learnerProvides}` },
      ]
    case "group": {
      const session = getSession(offer.sessionId)
      if (!session) return []
      const facts = [
        { icon: CalendarIcon, text: `${formatDate(session.startsAt)} at ${formatTime(session.startsAt)}, Dhaka time` },
        { icon: ClockIcon, text: `${formatDuration(session.durationMinutes)} live, online` },
        { icon: LanguagesIcon, text: session.language },
      ]
      if (session.seats) {
        facts.push({ icon: UsersIcon, text: `${session.seats.total - session.seats.taken} of ${session.seats.total} seats left` })
      }
      return facts
    }
  }
}
