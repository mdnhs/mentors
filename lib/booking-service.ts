import { getBusyIntervals, holdsSlot, slotReasonMessage, validateSlot, type SlotRejection } from "@/lib/availability"
import { cancelDecision, rescheduleDecision } from "@/lib/booking-policy"
import { getOfferAvailability } from "@/lib/offers"
import { quote } from "@/lib/pricing"
import { checkEnrollment, type EnrollmentBlock } from "@/lib/sessions"
import type { Booking, GroupSession, Mentor, Offer, OfferType } from "@/lib/types"

import { DAY_MS } from "@/lib/timezone"

const MINUTE_MS = 60_000
export const HOLD_MINUTES = 15

export type BookingFailure =
  | SlotRejection
  | "offer-unavailable"
  | "not-found"
  | "not-allowed"
  | "session-cancelled"
  | "registration-closed"
  | "session-full"
  | "already-enrolled"

export type Outcome =
  | { ok: true; booking: Booking; duplicate?: boolean }
  | { ok: false; code: BookingFailure; message: string }

export type Change = { bookings: Booking[]; outcome: Outcome }

export type BookingRequest = {
  requestId: string
  bookingId: string
  mentor: Mentor
  offer: Offer
  startsAt?: string
  timezone: string
  note?: string
}

export type GroupBookingRequest = { requestId: string; bookingId: string; session: GroupSession; timezone: string }

export const confirmedStatus = (kind: OfferType): Booking["status"] => (kind === "review" ? "in-review" : "confirmed")

const enrollmentFailures: Record<EnrollmentBlock, BookingFailure> = {
  cancelled: "session-cancelled",
  ended: "offer-unavailable",
  closed: "registration-closed",
  full: "session-full",
  enrolled: "already-enrolled",
}

const fail = (bookings: Booking[], code: BookingFailure, message: string): Change => ({
  bookings,
  outcome: { ok: false, code, message },
})

function learnerHasSessionAt(bookings: Booking[], start: number, durationMinutes: number, now: Date, ignoreBookingId?: string) {
  const end = start + durationMinutes * MINUTE_MS
  return bookings.some((booking) => {
    if (booking.id === ignoreBookingId || booking.kind === "review" || !booking.durationMinutes || !holdsSlot(booking, now)) return false
    const bookingStart = new Date(booking.date).getTime()
    return start < bookingStart + booking.durationMinutes * MINUTE_MS && end > bookingStart
  })
}

// Pure and synchronous: given the current bookings it either returns the new list or a refusal.
// The caller must run it against freshly read state inside one critical section. The booking is only a
// pending hold: the price comes from the offer, never the caller, and payment confirms it.
export function placeBooking(bookings: Booking[], request: BookingRequest, now: Date): Change {
  const existing = bookings.find((booking) => booking.requestId === request.requestId)
  if (existing) return { bookings, outcome: { ok: true, booking: existing, duplicate: true } }

  const { mentor, offer } = request
  const availability = getOfferAvailability(mentor, offer, now)
  if (!availability.bookable) return fail(bookings, "offer-unavailable", availability.reason)
  if (offer.type === "group") return fail(bookings, "offer-unavailable", "Group sessions are reserved from the session page.")

  const base = {
    id: request.bookingId,
    kind: offer.type,
    mentorSlug: mentor.slug,
    offerId: offer.id,
    title: offer.title,
    timezone: request.timezone,
    total: quote(offer.price).total,
    note: request.note,
    requestId: request.requestId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + HOLD_MINUTES * MINUTE_MS).toISOString(),
    cancellation: offer.cancellation,
  }

  if (offer.type === "review") {
    const booking: Booking = {
      ...base,
      date: new Date(now.getTime() + offer.deliveryDays * DAY_MS).toISOString(),
      status: "pending",
    }
    return { bookings: [booking, ...bookings], outcome: { ok: true, booking } }
  }

  if (!request.startsAt) return fail(bookings, "invalid", slotReasonMessage("invalid", mentor))
  const check = validateSlot(mentor, offer.durationMinutes, request.startsAt, getBusyIntervals(mentor, bookings, now), now)
  if (!check.ok) return fail(bookings, check.reason, slotReasonMessage(check.reason, mentor))
  const start = new Date(request.startsAt).getTime()
  if (learnerHasSessionAt(bookings, start, offer.durationMinutes, now)) {
    return fail(bookings, "learner-busy", "You already have a session at this time.")
  }

  const booking: Booking = {
    ...base,
    date: new Date(start).toISOString(),
    durationMinutes: offer.durationMinutes,
    status: "pending",
  }
  return { bookings: [booking, ...bookings], outcome: { ok: true, booking } }
}

export function placeGroupBooking(bookings: Booking[], request: GroupBookingRequest, now: Date): Change {
  const existing = bookings.find((booking) => booking.requestId === request.requestId)
  if (existing) return { bookings, outcome: { ok: true, booking: existing, duplicate: true } }

  const { session } = request
  const enrollment = checkEnrollment(session, bookings, now)
  if (!enrollment.open) return fail(bookings, enrollmentFailures[enrollment.reason], enrollment.message)
  const start = new Date(session.startsAt).getTime()
  if (learnerHasSessionAt(bookings, start, session.durationMinutes, now)) {
    return fail(bookings, "learner-busy", "You already have a session at this time.")
  }

  const booking: Booking = {
    id: request.bookingId,
    kind: "group",
    mentorSlug: session.mentorSlug,
    sessionId: session.id,
    title: session.title,
    date: new Date(start).toISOString(),
    durationMinutes: session.durationMinutes,
    timezone: request.timezone,
    total: quote(session.price).total,
    status: "pending",
    requestId: request.requestId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + HOLD_MINUTES * MINUTE_MS).toISOString(),
    cancellation: "group",
  }
  return { bookings: [booking, ...bookings], outcome: { ok: true, booking } }
}

export function cancelBooking(bookings: Booking[], bookingId: string, now: Date): Change {
  const booking = bookings.find((item) => item.id === bookingId)
  if (!booking) return fail(bookings, "not-found", "We couldn't find that booking.")
  const decision = cancelDecision(booking, now)
  if (!decision.allowed) return fail(bookings, "not-allowed", decision.reason)
  const cancelled: Booking = {
    ...booking,
    status: "cancelled",
    cancelledAt: now.toISOString(),
    refundPercent: decision.refundPercent,
  }
  return {
    bookings: bookings.map((item) => (item.id === bookingId ? cancelled : item)),
    outcome: { ok: true, booking: cancelled },
  }
}

export function rescheduleBooking(bookings: Booking[], bookingId: string, mentor: Mentor, startsAt: string, now: Date): Change {
  const booking = bookings.find((item) => item.id === bookingId)
  if (!booking || booking.mentorSlug !== mentor.slug || !booking.durationMinutes) {
    return fail(bookings, "not-found", "We couldn't find that booking.")
  }
  const decision = rescheduleDecision(booking, now)
  if (!decision.allowed) return fail(bookings, "not-allowed", decision.reason)

  // Its own current slot must not block the new one, since the sessions can sit back to back.
  const busy = getBusyIntervals(mentor, bookings, now, booking.id)
  const check = validateSlot(mentor, booking.durationMinutes, startsAt, busy, now)
  if (!check.ok) return fail(bookings, check.reason, slotReasonMessage(check.reason, mentor))
  const start = new Date(startsAt).getTime()
  if (learnerHasSessionAt(bookings, start, booking.durationMinutes, now, booking.id)) {
    return fail(bookings, "learner-busy", "You already have a session at this time.")
  }

  const moved: Booking = {
    ...booking,
    date: new Date(start).toISOString(),
    rescheduleCount: (booking.rescheduleCount ?? 0) + 1,
  }
  return {
    bookings: bookings.map((item) => (item.id === bookingId ? moved : item)),
    outcome: { ok: true, booking: moved },
  }
}

