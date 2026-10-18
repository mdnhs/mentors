import { otherLearnerBookings } from "@/lib/data/bookings"
import { getSessions } from "@/lib/data"
import { addDays, DAY_MS, dateKeyInZone, isDateKey, isTimeZone, timeKeyInZone, weekdayOf, zonedTimeToUtc } from "@/lib/timezone"
import type { Booking, Mentor } from "@/lib/types"

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

export const bookingDefaults = { bufferMinutes: 0, minNoticeHours: 12, maxAdvanceDays: 30 }

export function bookingRules(mentor: Mentor) {
  const { bufferMinutes, minNoticeHours, maxAdvanceDays } = mentor.availability
  return {
    bufferMinutes: bufferMinutes ?? bookingDefaults.bufferMinutes,
    minNoticeHours: minNoticeHours ?? bookingDefaults.minNoticeHours,
    maxAdvanceDays: maxAdvanceDays ?? bookingDefaults.maxAdvanceDays,
  }
}

export type Interval = { start: number; end: number }

export type SlotReason = "past" | "too-soon" | "booked" | "conflict"
export type Slot = { startsAt: string; endsAt: string; available: boolean; reason?: SlotReason }

export type SlotRejection = SlotReason | "learner-busy" | "invalid" | "too-far" | "not-offered" | "unavailable-date"

export type SlotCheck = { ok: true } | { ok: false; reason: SlotRejection }

export function bookingEnd(booking: Booking) {
  return new Date(booking.date).getTime() + (booking.durationMinutes ?? 0) * MINUTE_MS
}

// Pending bookings hold their slot only until they expire.
export function holdsSlot(booking: Booking, now: Date) {
  if (booking.status === "confirmed") return true
  if (booking.status !== "pending") return false
  return !booking.expiresAt || new Date(booking.expiresAt) > now
}

function toInterval(startIso: string, durationMinutes: number): Interval {
  const start = new Date(startIso).getTime()
  return { start, end: start + durationMinutes * MINUTE_MS }
}

// Everything that keeps the mentor busy: held bookings from any learner and their live group sessions.
export function getBusyIntervals(mentor: Mentor, bookings: Booking[], now: Date, ignoreBookingId?: string): Interval[] {
  const fromBookings = [...bookings, ...otherLearnerBookings]
    .filter((booking) => booking.mentorSlug === mentor.slug && booking.id !== ignoreBookingId)
    .filter((booking) => booking.kind !== "review" && booking.kind !== "group" && booking.durationMinutes && holdsSlot(booking, now))
    .map((booking) => toInterval(booking.date, booking.durationMinutes!))
  const fromSessions = getSessions()
    .filter((session) => session.mentorSlug === mentor.slug)
    .map((session) => toInterval(session.startsAt, session.durationMinutes))
  return [...fromBookings, ...fromSessions]
}

function overlapsBusy(slot: Interval, busy: Interval[], bufferMinutes: number) {
  const buffer = bufferMinutes * MINUTE_MS
  return busy.some((item) => slot.start < item.end + buffer && slot.end + buffer > item.start)
}

// The learner's own held sessions, with any mentor.
export function getLearnerIntervals(bookings: Booking[], now: Date, ignoreBookingId?: string): Interval[] {
  return bookings
    .filter((booking) => booking.id !== ignoreBookingId && booking.kind !== "review" && booking.durationMinutes && holdsSlot(booking, now))
    .map((booking) => toInterval(booking.date, booking.durationMinutes!))
}

function classify(slot: Interval, busy: Interval[], mentor: Mentor, now: Date, learnerBusy: Interval[] = []): SlotReason | undefined {
  const rules = bookingRules(mentor)
  if (slot.start <= now.getTime()) return "past"
  if (slot.start < now.getTime() + rules.minNoticeHours * HOUR_MS) return "too-soon"
  if (overlapsBusy(slot, busy, rules.bufferMinutes)) return "booked"
  if (overlapsBusy(slot, learnerBusy, 0)) return "conflict"
  return undefined
}

// Every weekly slot inside the booking window. Slots that can't be booked stay in the list with the reason.
export function getSlots(mentor: Mentor, durationMinutes: number, busy: Interval[], now: Date, learnerBusy: Interval[] = []): Slot[] {
  const { days, times, unavailableDates = [] } = mentor.availability
  const { maxAdvanceDays } = bookingRules(mentor)
  const latest = now.getTime() + maxAdvanceDays * DAY_MS
  const first = dateKeyInZone(now.getTime(), mentor.timezone)
  const slots: Slot[] = []

  for (let offset = 0; offset <= maxAdvanceDays + 1; offset++) {
    const dateKey = addDays(first, offset)
    if (!days.includes(weekdayOf(dateKey)) || unavailableDates.includes(dateKey)) continue
    for (const time of times) {
      const start = zonedTimeToUtc(dateKey, time, mentor.timezone)
      if (start === null || start > latest) continue
      const interval = { start, end: start + durationMinutes * MINUTE_MS }
      const reason = classify(interval, busy, mentor, now, learnerBusy)
      slots.push({
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(interval.end).toISOString(),
        available: !reason,
        ...(reason ? { reason } : {}),
      })
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

// Re-checks a chosen slot from scratch, so a stale or tampered selection can't get through.
export function validateSlot(mentor: Mentor, durationMinutes: number, startsAt: string, busy: Interval[], now: Date): SlotCheck {
  if (!ISO_INSTANT.test(startsAt) || !isDateKey(startsAt.slice(0, 10)) || !isTimeZone(mentor.timezone)) {
    return { ok: false, reason: "invalid" }
  }
  const start = new Date(startsAt).getTime()
  if (Number.isNaN(start)) return { ok: false, reason: "invalid" }

  const { days, times, unavailableDates = [] } = mentor.availability
  const dateKey = dateKeyInZone(start, mentor.timezone)
  if (!days.includes(weekdayOf(dateKey)) || !times.includes(timeKeyInZone(start, mentor.timezone))) {
    return { ok: false, reason: "not-offered" }
  }
  if (unavailableDates.includes(dateKey)) return { ok: false, reason: "unavailable-date" }

  const { maxAdvanceDays } = bookingRules(mentor)
  if (start > now.getTime() + maxAdvanceDays * DAY_MS) return { ok: false, reason: "too-far" }

  const reason = classify({ start, end: start + durationMinutes * MINUTE_MS }, busy, mentor, now)
  return reason ? { ok: false, reason } : { ok: true }
}

export function slotsByDay(slots: Slot[], timeZone: string) {
  const days = new Map<string, Slot[]>()
  for (const slot of slots) {
    const key = dateKeyInZone(new Date(slot.startsAt).getTime(), timeZone)
    days.set(key, [...(days.get(key) ?? []), slot])
  }
  return days
}

export function slotReasonMessage(reason: SlotRejection, mentor: Mentor) {
  const rules = bookingRules(mentor)
  switch (reason) {
    case "past":
      return "This time has already passed."
    case "too-soon":
      return `${mentor.name.split(" ")[0]} needs at least ${rules.minNoticeHours} hours' notice.`
    case "booked":
      return "This time was just taken. Choose another."
    case "conflict":
    case "learner-busy":
      return "You already have a session at this time."
    case "too-far":
      return `Bookings open up to ${rules.maxAdvanceDays} days ahead.`
    case "unavailable-date":
      return `${mentor.name.split(" ")[0]} isn't available on this date.`
    case "not-offered":
      return "This isn't one of the mentor's open times."
    case "invalid":
      return "That time isn't valid. Choose another."
  }
}
