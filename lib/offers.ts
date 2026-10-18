import { getMentors, getSession } from "@/lib/data"
import { registrationDeadline } from "@/lib/sessions"
import type { CancellationPolicy, GroupOffer, Mentor, Offer } from "@/lib/types"

export const cancellationTerms: Record<CancellationPolicy, string> = {
  flexible: "Free cancellation or one free reschedule up to 24 hours before the call.",
  standard: "Full refund up to 48 hours before the call, 50% after that.",
  group: "Full refund up to 24 hours before the session starts.",
  review: "Full refund until the mentor starts reviewing.",
  monthly: "Cancel any time before your next month starts. The current month isn't refunded.",
}

export type OfferAvailability = { bookable: true } | { bookable: false; reason: string }

const open: OfferAvailability = { bookable: true }
const closed = (reason: string): OfferAvailability => ({ bookable: false, reason })

function hasWeeklySchedule(mentor: Mentor) {
  return mentor.availability.days.length > 0 && mentor.availability.times.length > 0
}

// Pass `now` to also rule out sessions that have started. Static rendering omits it, since prerendered pages can't read the clock.
export function getOfferAvailability(mentor: Mentor, offer: Offer, now?: Date): OfferAvailability {
  if (offer.status !== "published") return closed("This offer isn't open for booking.")

  switch (offer.type) {
    case "group": {
      const session = getSession(offer.sessionId)
      if (!session) return closed("This session is no longer scheduled.")
      if (session.status === "cancelled") return closed("This session was cancelled.")
      if (now && new Date(session.startsAt) <= now) return closed("This session has already started.")
      if (now && new Date(registrationDeadline(session)) <= now) return closed("Registration for this session has closed.")
      if (session.seats.taken >= session.seats.total) return closed("This session is fully booked.")
      return open
    }
    case "mentorship":
      if (offer.openSpots <= 0) return closed("No mentee spots are open right now.")
      return hasWeeklySchedule(mentor) ? open : closed("No call times are open right now.")
    case "one-on-one":
      return hasWeeklySchedule(mentor) ? open : closed("No call times are open right now.")
    case "review":
      return open
  }
}

export function getPublishedOffers(mentor: Mentor) {
  return mentor.offers.filter((offer) => offer.status === "published")
}

export function getBookableOffers(mentor: Mentor, now?: Date) {
  return mentor.offers.filter((offer) => getOfferAvailability(mentor, offer, now).bookable)
}

// Mentors appear in listings only while they have something a learner can actually book.
export function getListedMentors(now?: Date) {
  return getMentors().filter((mentor) => getBookableOffers(mentor, now).length > 0)
}

// Group prices are per seat, so they're only the headline price when nothing else is bookable.
export function getStartingPrice(mentor: Mentor, now?: Date) {
  const bookable = getBookableOffers(mentor, now)
  const individual = bookable.filter((offer) => offer.type !== "group")
  const pool = individual.length > 0 ? individual : bookable
  return pool.length > 0 ? Math.min(...pool.map((offer) => offer.price)) : null
}

export function offerHref(mentor: Mentor, offer: Offer) {
  return offer.type === "group" ? `/sessions/${offer.sessionId}` : `/mentors/${mentor.slug}/book?offer=${offer.id}`
}

export const offerActionLabels: Record<Offer["type"], string> = {
  "one-on-one": "Book session",
  group: "Reserve a seat",
  mentorship: "Start mentorship",
  review: "Request review",
}

export type RequestedOffer =
  | { kind: "none" }
  | { kind: "ok"; offer: Offer }
  | { kind: "group"; offer: GroupOffer }
  | { kind: "unavailable"; offer: Offer; reason: string }
  | { kind: "missing" }

// Unpublished offers resolve as "missing" so draft details never leak through a guessed link.
export function resolveRequestedOffer(mentor: Mentor, offerId: string | null, now?: Date): RequestedOffer {
  if (!offerId) return { kind: "none" }
  const offer = mentor.offers.find((item) => item.id === offerId)
  if (!offer || offer.status !== "published") return { kind: "missing" }
  if (offer.type === "group") return { kind: "group", offer }
  const availability = getOfferAvailability(mentor, offer, now)
  return availability.bookable ? { kind: "ok", offer } : { kind: "unavailable", offer, reason: availability.reason }
}
