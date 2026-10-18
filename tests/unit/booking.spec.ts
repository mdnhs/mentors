import { expect, test } from "@playwright/test"

import { bookingRules, getBusyIntervals, getSlots, holdsSlot, slotsByDay, validateSlot } from "@/lib/availability"
import { cancelDecision, effectiveStatus, rescheduleDecision } from "@/lib/booking-policy"
import { cancelBooking, confirmedStatus, HOLD_MINUTES, placeBooking, rescheduleBooking, type BookingRequest } from "@/lib/booking-service"
import { getMentor } from "@/lib/data"
import { dateKeyInZone, isDateKey, timeKeyInZone, zonedTimeToUtc } from "@/lib/timezone"
import type { Booking, Mentor, OneOnOneOffer } from "@/lib/types"

const NOW = new Date("2026-10-18T06:00:00Z")
const mentor = (slug: string) => getMentor(slug)!
const callOffer = (slug: string) => mentor(slug).offers.find((offer): offer is OneOnOneOffer => offer.type === "one-on-one" && offer.status === "published")!
const iso = (ms: number) => new Date(ms).toISOString()

function slotsFor(slug: string, bookings: Booking[] = [], now = NOW) {
  const m = mentor(slug)
  return getSlots(m, callOffer(slug).durationMinutes, getBusyIntervals(m, bookings, now), now)
}

let counter = 0
function request(slug: string, startsAt: string | undefined, overrides: Partial<BookingRequest> = {}): BookingRequest {
  counter += 1
  return {
    requestId: `req-${counter}`,
    bookingId: `bk-test-${counter}`,
    mentor: mentor(slug),
    offer: callOffer(slug),
    startsAt,
    timezone: "Asia/Dhaka",
    ...overrides,
  }
}

// Places a booking and settles it as a paid checkout would; payment itself is covered in payments.spec.ts.
function book(bookings: Booking[], req: BookingRequest) {
  const change = placeBooking(bookings, req, NOW)
  if (!change.outcome.ok) throw new Error(`booking failed: ${change.outcome.message}`)
  const booking: Booking = { ...change.outcome.booking, status: confirmedStatus(change.outcome.booking.kind) }
  return { bookings: change.bookings.map((item) => (item.id === booking.id ? booking : item)), booking }
}

test.describe("timezone conversion", () => {
  test("converts wall-clock times across daylight saving changes", () => {
    // Berlin leaves summer time on 2026-10-25.
    expect(iso(zonedTimeToUtc("2026-10-24", "10:00", "Europe/Berlin")!)).toBe("2026-10-24T08:00:00.000Z")
    expect(iso(zonedTimeToUtc("2026-10-26", "10:00", "Europe/Berlin")!)).toBe("2026-10-26T09:00:00.000Z")
    expect(iso(zonedTimeToUtc("2026-10-24", "20:00", "Asia/Dhaka")!)).toBe("2026-10-24T14:00:00.000Z")
  })

  test("skips times that daylight saving removes and takes the first of repeated times", () => {
    expect(zonedTimeToUtc("2026-03-08", "02:30", "America/New_York")).toBeNull()
    expect(iso(zonedTimeToUtc("2026-11-01", "01:30", "America/New_York")!)).toBe("2026-11-01T05:30:00.000Z")
  })

  test("reads the local date and time of an instant", () => {
    const instant = new Date("2026-10-24T20:00:00Z").getTime()
    expect(dateKeyInZone(instant, "Asia/Dhaka")).toBe("2026-10-25")
    expect(timeKeyInZone(instant, "Asia/Dhaka")).toBe("02:00")
    expect(dateKeyInZone(instant, "America/Chicago")).toBe("2026-10-24")
  })

  test("rejects impossible calendar dates", () => {
    expect(isDateKey("2026-02-29")).toBe(false)
    expect(isDateKey("2026-13-01")).toBe(false)
    expect(isDateKey("tomorrow")).toBe(false)
    expect(isDateKey("2026-02-28")).toBe(true)
  })
})

test.describe("slot generation", () => {
  test("slots follow the mentor's own timezone, not Dhaka", () => {
    const tanvir = mentor("tanvir-rahman")
    const slots = slotsFor("tanvir-rahman")
    expect(slots.length).toBeGreaterThan(0)
    for (const slot of slots) {
      const start = new Date(slot.startsAt).getTime()
      expect(tanvir.availability.days).toContain(new Date(`${dateKeyInZone(start, "Asia/Singapore")}T00:00:00Z`).getUTCDay())
      expect(tanvir.availability.times).toContain(timeKeyInZone(start, "Asia/Singapore"))
    }
  })

  test("a mentor's local hour shifts for the learner when daylight saving changes", () => {
    const slots = slotsFor("arif-hossain")
    const dhakaTimeOn = (date: string) =>
      timeKeyInZone(new Date(slots.find((slot) => dateKeyInZone(new Date(slot.startsAt).getTime(), "Europe/Berlin") === date)!.startsAt).getTime(), "Asia/Dhaka")
    expect(dhakaTimeOn("2026-10-24")).toBe("14:00")
    expect(dhakaTimeOn("2026-10-31")).toBe("15:00")
  })

  test("specific unavailable dates produce no slots", () => {
    const dates = slotsFor("tanvir-rahman").map((slot) => dateKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Singapore"))
    expect(dates).not.toContain("2026-10-27")
    expect(dates).toContain("2026-10-29")
  })

  test("slots inside the minimum notice are listed but unavailable", () => {
    // Tanvir needs 24 hours; Tuesday 20:00 in Singapore is 22 hours after this Monday afternoon.
    const now = new Date("2026-10-19T14:00:00Z")
    const tooSoon = slotsFor("tanvir-rahman", [], now).filter((slot) => slot.reason === "too-soon")
    expect(tooSoon.length).toBeGreaterThan(0)
    for (const slot of tooSoon) expect(new Date(slot.startsAt).getTime()).toBeLessThan(now.getTime() + 24 * 3_600_000)
  })

  test("same-day times that have passed are marked past", () => {
    const now = new Date("2026-10-19T13:30:00Z")
    const monday = slotsFor("nusrat-jahan", [], now).filter((slot) => dateKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Dhaka") === "2026-10-19")
    expect(monday.map((slot) => [timeKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Dhaka"), slot.reason])).toEqual([
      ["19:00", "past"],
      ["20:00", "too-soon"],
      ["21:00", "too-soon"],
    ])
  })

  test("nothing is offered beyond the advance-booking limit", () => {
    const last = slotsFor("nusrat-jahan").at(-1)!
    expect(new Date(last.startsAt).getTime()).toBeLessThanOrEqual(NOW.getTime() + bookingRules(mentor("nusrat-jahan")).maxAdvanceDays * 86_400_000)
    expect(slotsFor("tanvir-rahman").at(-1)!.startsAt > slotsFor("nusrat-jahan").at(-1)!.startsAt).toBe(true)
  })

  test("existing bookings block their slot and the buffer around it", () => {
    const find = (m: Mentor, start: string, bookings: Booking[] = []) =>
      getSlots(m, 45, getBusyIntervals(m, bookings, NOW), NOW).find((slot) => slot.startsAt === new Date(start).toISOString())!
    const tanvir = mentor("tanvir-rahman")
    // ob-1 holds 20:00-20:45 SGT on Oct 24; with a 15 minute buffer 21:00 is still free.
    expect(find(tanvir, "2026-10-24T20:00:00+08:00")).toMatchObject({ available: false, reason: "booked" })
    expect(find(tanvir, "2026-10-24T21:00:00+08:00").available).toBe(true)
    const wideBuffer = { ...tanvir, availability: { ...tanvir.availability, bufferMinutes: 30 } }
    expect(find(wideBuffer, "2026-10-24T21:00:00+08:00")).toMatchObject({ available: false, reason: "booked" })
  })

  test("a longer session blocks the neighbouring start times", () => {
    const m = mentor("nusrat-jahan")
    const busy = getBusyIntervals(m, [], NOW)
    const sixty = getSlots(m, 60, busy, NOW)
    const sunday = sixty.filter((slot) => dateKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Dhaka") === "2026-10-25")
    // ob-2 holds 19:00-19:45; a 60 minute session at 20:00 is fine, the 19:00 start is taken.
    expect(sunday.find((slot) => timeKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Dhaka") === "19:00")?.available).toBe(false)
    expect(sunday.find((slot) => timeKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Dhaka") === "20:00")?.available).toBe(true)
  })

  test("a mentor's own group sessions keep them busy", () => {
    // Nusrat's group session starts 2026-11-02 20:00 Dhaka (a Monday) for 90 minutes.
    const monday = slotsFor("nusrat-jahan").filter((slot) => dateKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Dhaka") === "2026-11-02")
    expect(monday.find((slot) => timeKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Dhaka") === "20:00")).toMatchObject({ available: false, reason: "booked" })
  })

  test("learner days follow the learner's timezone", () => {
    const saturday = slotsFor("tanvir-rahman").filter((slot) => timeKeyInZone(new Date(slot.startsAt).getTime(), "Asia/Singapore") === "22:00" && slot.available)[0]
    const sgDay = dateKeyInZone(new Date(saturday.startsAt).getTime(), "Asia/Singapore")
    const auckland = [...slotsByDay([saturday], "Pacific/Auckland").keys()][0]
    expect(auckland).not.toBe(sgDay)
    expect([...slotsByDay([saturday], "Asia/Singapore").keys()][0]).toBe(sgDay)
  })

  test("a mentor with no weekly schedule has no slots", () => {
    expect(getSlots(mentor("tahmina-sultana"), 30, [], NOW)).toEqual([])
  })
})

test.describe("slot validation", () => {
  const m = mentor("nusrat-jahan")
  const check = (startsAt: string, bookings: Booking[] = [], now = NOW) =>
    validateSlot(m, 45, startsAt, getBusyIntervals(m, bookings, now), now)
  const open = slotsFor("nusrat-jahan").find((slot) => slot.available)!

  test("accepts an open slot", () => {
    expect(check(open.startsAt)).toEqual({ ok: true })
  })

  test("rejects malformed, impossible and unoffered times", () => {
    expect(check("not a date")).toMatchObject({ reason: "invalid" })
    expect(check("2026-02-30T10:00:00+06:00")).toMatchObject({ reason: "invalid" })
    expect(check("2026-10-25T19:00")).toMatchObject({ reason: "invalid" })
    expect(check("2026-10-27T19:00:00+06:00")).toMatchObject({ reason: "not-offered" })
    expect(check("2026-10-25T19:30:00+06:00")).toMatchObject({ reason: "not-offered" })
  })

  test("rejects past, too-soon, far-future and blocked-date times", () => {
    expect(check("2026-10-12T19:00:00+06:00")).toMatchObject({ reason: "past" })
    expect(check("2026-10-18T19:00:00+06:00", [], new Date("2026-10-18T10:00:00Z"))).toMatchObject({ reason: "too-soon" })
    expect(check("2027-03-01T19:00:00+06:00")).toMatchObject({ reason: "too-far" })
    expect(check("2026-10-26T19:00:00+06:00")).toMatchObject({ reason: "unavailable-date" })
  })

  test("rejects a slot that another learner already holds", () => {
    expect(check("2026-10-25T19:00:00+06:00")).toMatchObject({ reason: "booked" })
  })

  test("a time that daylight saving removes can't be booked", () => {
    const newYork: Mentor = { ...m, timezone: "America/New_York", availability: { days: [0], times: ["02:30"], maxAdvanceDays: 400 } }
    const now = new Date("2027-03-01T00:00:00Z")
    expect(getSlots(newYork, 30, [], now).some((slot) => dateKeyInZone(new Date(slot.startsAt).getTime(), "America/New_York") === "2027-03-14")).toBe(false)
  })
})

test.describe("placing bookings", () => {
  const slug = "nusrat-jahan"
  const first = () => slotsFor(slug).find((slot) => slot.available)!.startsAt

  test("holds an open slot until payment, with the mentor's policy and timestamps in UTC", () => {
    const change = placeBooking([], request(slug, first(), { timezone: "Europe/Berlin" }), NOW)
    const booking = change.outcome.ok ? change.outcome.booking : null
    expect(booking).toMatchObject({ status: "pending", mentorSlug: slug, timezone: "Europe/Berlin", cancellation: callOffer(slug).cancellation })
    expect(booking!.date.endsWith("Z")).toBe(true)
    expect(booking!.expiresAt).toBe(iso(NOW.getTime() + HOLD_MINUTES * 60_000))
  })

  test("the booking total comes from the offer price plus the platform fee, never from the caller", () => {
    const change = placeBooking([], request(slug, first(), { total: 1 } as Partial<BookingRequest>), NOW)
    const price = callOffer(slug).price
    expect(change.outcome.ok && change.outcome.booking.total).toBe(price + Math.round(price * 0.05))
  })

  test("a repeated submission returns the original booking instead of a second one", () => {
    const req = request(slug, first())
    const once = book([], req)
    const twice = placeBooking(once.bookings, req, NOW)
    expect(twice.bookings).toHaveLength(1)
    expect(twice.outcome).toMatchObject({ ok: true, duplicate: true, booking: { id: once.booking.id } })
  })

  test("two learners racing for one slot: the second is refused", () => {
    const slot = first()
    const winner = book([], request(slug, slot))
    // The second learner's state already includes the winner, since both run against fresh storage.
    const loser = placeBooking(winner.bookings, request(slug, slot), NOW)
    expect(loser.outcome).toMatchObject({ ok: false, code: "booked" })
    expect(loser.bookings).toHaveLength(1)
  })

  test("overlapping sessions are refused even when they start at different times", () => {
    const m = mentor(slug)
    const slot = slotsFor(slug).find((item) => item.available)!
    const placed = book([], request(slug, slot.startsAt)).bookings
    const overlapping = { ...m, availability: { ...m.availability, times: [...m.availability.times, timeKeyInZone(new Date(slot.startsAt).getTime() + 15 * 60_000, "Asia/Dhaka")] } }
    const startsAt = iso(new Date(slot.startsAt).getTime() + 15 * 60_000)
    const result = placeBooking(placed, request(slug, startsAt, { mentor: overlapping }), NOW)
    expect(result.outcome).toMatchObject({ ok: false, code: "booked" })
  })

  test("rejects stale, past and malformed selections at confirmation", () => {
    expect(placeBooking([], request(slug, "2026-10-12T19:00:00+06:00"), NOW).outcome).toMatchObject({ ok: false, code: "past" })
    expect(placeBooking([], request(slug, "garbage"), NOW).outcome).toMatchObject({ ok: false, code: "invalid" })
    expect(placeBooking([], request(slug, undefined), NOW).outcome).toMatchObject({ ok: false, code: "invalid" })
  })

  test("refuses an offer the learner could not see", () => {
    const hidden = mentor("farhan-kabir").offers.find((offer) => offer.status !== "published")!
    const result = placeBooking([], request("farhan-kabir", first(), { offer: hidden, mentor: mentor("farhan-kabir") }), NOW)
    expect(result.outcome).toMatchObject({ ok: false, code: "offer-unavailable" })
  })

  test("a learner can't hold two sessions at the same time with different mentors", () => {
    // Nusrat and Shafiq are both free on Sundays at 21:00 Dhaka time.
    const sunday = "2026-10-25T21:00:00+06:00"
    const placed = book([], request("nusrat-jahan", sunday)).bookings
    const result = placeBooking(placed, request("shafiq-uddin", sunday), NOW)
    expect(result.outcome).toMatchObject({ ok: false, code: "learner-busy" })
  })

  test("a review needs no slot and is delivered after its turnaround", () => {
    const m = mentor("tanvir-rahman")
    const review = m.offers.find((offer) => offer.type === "review")!
    const { booking } = book([], request("tanvir-rahman", undefined, { offer: review, mentor: m }))
    expect(booking.status).toBe("in-review")
    expect(booking.durationMinutes).toBeUndefined()
  })
})

test.describe("status lifecycle", () => {
  const base: Booking = {
    id: "b",
    kind: "one-on-one",
    mentorSlug: "nusrat-jahan",
    title: "t",
    date: "2026-10-25T13:00:00Z",
    durationMinutes: 45,
    timezone: "Asia/Dhaka",
    total: 1,
    status: "confirmed",
  }

  test("pending holds a slot only until it expires", () => {
    const pending: Booking = { ...base, status: "pending", expiresAt: "2026-10-18T06:10:00Z" }
    expect(holdsSlot(pending, new Date("2026-10-18T06:05:00Z"))).toBe(true)
    expect(holdsSlot(pending, new Date("2026-10-18T06:10:00Z"))).toBe(false)
    expect(effectiveStatus(pending, new Date("2026-10-18T06:10:00Z"))).toBe("expired")
  })

  test("confirmed becomes completed once the session has ended; cancelled never holds a slot", () => {
    expect(effectiveStatus(base, new Date("2026-10-25T13:44:00Z"))).toBe("confirmed")
    expect(effectiveStatus(base, new Date("2026-10-25T13:45:00Z"))).toBe("completed")
    expect(holdsSlot({ ...base, status: "cancelled" }, NOW)).toBe(false)
  })

  test("an expired pending booking frees its slot for someone else", () => {
    const slot = slotsFor("nusrat-jahan").find((item) => item.available)!.startsAt
    const held: Booking = { ...base, id: "held", status: "pending", date: slot, expiresAt: "2026-10-18T06:10:00Z" }
    expect(validateSlot(mentor("nusrat-jahan"), 45, slot, getBusyIntervals(mentor("nusrat-jahan"), [held], new Date("2026-10-18T06:05:00Z")), new Date("2026-10-18T06:05:00Z"))).toMatchObject({ reason: "booked" })
    expect(validateSlot(mentor("nusrat-jahan"), 45, slot, getBusyIntervals(mentor("nusrat-jahan"), [held], new Date("2026-10-18T06:11:00Z")), new Date("2026-10-18T06:11:00Z"))).toEqual({ ok: true })
  })
})

test.describe("cancellation and rescheduling", () => {
  const confirmed = (slug: string, startsAt: string) => book([], request(slug, startsAt))

  // Nusrat's offers are flexible; Sadia's first call offer is flexible too, so a standard one is built by hand.
  const openLater = () =>
    slotsFor("nusrat-jahan").filter((slot) => slot.available && new Date(slot.startsAt).getTime() > NOW.getTime() + 72 * 3_600_000)
  const flexibleStart = openLater()[2].startsAt

  test("flexible bookings refund in full more than 24 hours out and nothing after", () => {
    const { booking } = confirmed("nusrat-jahan", flexibleStart)
    const start = new Date(booking.date).getTime()
    expect(cancelDecision(booking, new Date(start - 25 * 3_600_000))).toEqual({ allowed: true, refundPercent: 100 })
    expect(cancelDecision(booking, new Date(start - 23 * 3_600_000))).toEqual({ allowed: true, refundPercent: 0 })
  })

  test("standard bookings refund half inside 48 hours", () => {
    const { booking } = confirmed("nusrat-jahan", flexibleStart)
    const standard = { ...booking, cancellation: "standard" as const }
    const start = new Date(booking.date).getTime()
    expect(cancelDecision(standard, new Date(start - 49 * 3_600_000))).toEqual({ allowed: true, refundPercent: 100 })
    expect(cancelDecision(standard, new Date(start - 47 * 3_600_000))).toEqual({ allowed: true, refundPercent: 50 })
  })

  test("cancelling frees the slot and can't be repeated", () => {
    const { booking, bookings } = confirmed("nusrat-jahan", flexibleStart)
    const cancelled = cancelBooking(bookings, booking.id, NOW)
    expect(cancelled.outcome).toMatchObject({ ok: true, booking: { status: "cancelled", refundPercent: 100 } })
    expect(slotsFor("nusrat-jahan", cancelled.bookings).find((slot) => slot.startsAt === booking.date)?.available).toBe(true)
    expect(cancelBooking(cancelled.bookings, booking.id, NOW).outcome).toMatchObject({ ok: false, code: "not-allowed" })
    expect(cancelBooking(bookings, "missing", NOW).outcome).toMatchObject({ ok: false, code: "not-found" })
  })

  test("a started session can't be cancelled", () => {
    const { booking } = confirmed("nusrat-jahan", flexibleStart)
    expect(cancelDecision(booking, new Date(new Date(booking.date).getTime() + 60_000))).toMatchObject({ allowed: false })
  })

  test("a session can be rescheduled once, to another open slot", () => {
    const open = openLater()
    const { booking, bookings } = confirmed("nusrat-jahan", open[2].startsAt)
    const moved = rescheduleBooking(bookings, booking.id, mentor("nusrat-jahan"), open[4].startsAt, NOW)
    expect(moved.outcome).toMatchObject({ ok: true, booking: { rescheduleCount: 1 } })
    expect(moved.bookings).toHaveLength(1)
    expect(new Date(moved.bookings[0].date).toISOString()).toBe(open[4].startsAt)
    const again = rescheduleBooking(moved.bookings, booking.id, mentor("nusrat-jahan"), open[5].startsAt, NOW)
    expect(again.outcome).toMatchObject({ ok: false, code: "not-allowed" })
  })

  test("rescheduling is refused inside the policy window, onto a taken slot, and for non-call bookings", () => {
    const open = openLater()
    const { booking, bookings } = confirmed("nusrat-jahan", open[2].startsAt)
    const lateNow = new Date(new Date(booking.date).getTime() - 3_600_000)
    expect(rescheduleDecision(booking, lateNow)).toMatchObject({ allowed: false })
    const taken = rescheduleBooking(bookings, booking.id, mentor("nusrat-jahan"), "2026-10-25T19:00:00+06:00", NOW)
    expect(taken.outcome).toMatchObject({ ok: false, code: "booked" })
    expect(rescheduleDecision({ ...booking, kind: "group" }, NOW)).toMatchObject({ allowed: false })
  })

  test("a session can be moved onto the time directly after its own", () => {
    const m = mentor("nusrat-jahan")
    const open = openLater()
    const { booking, bookings } = confirmed("nusrat-jahan", open[0].startsAt)
    const moved = rescheduleBooking(bookings, booking.id, m, open[1].startsAt, NOW)
    expect(moved.outcome.ok).toBe(true)
  })
})
