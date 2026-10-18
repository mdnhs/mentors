import { expect, test } from "@playwright/test"

import { HOLD_MINUTES } from "@/lib/booking-service"
import { getMentor, getSession, getSessions } from "@/lib/data"
import { ledger, type Order } from "@/lib/orders"
import { applyPaymentEvent, beginPayment, cancelSession, startGroupCheckout, type Commerce } from "@/lib/payment-service"
import {
  applyCancellation,
  checkEnrollment,
  learnerState,
  meetingAccess,
  registrationDeadline,
  seatsLeft,
  seatsTaken,
  sessionPhase,
} from "@/lib/sessions"
import type { Actor } from "@/lib/permissions"
import { searchSessions } from "@/lib/session-search"
import type { Booking, GroupSession } from "@/lib/types"

const NOW = new Date("2026-10-18T06:00:00Z")
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)
const empty: Commerce = { bookings: [], orders: [], cancelledSessions: {}, sessionCapacity: {} }
const session = (id: string) => getSession(id)!
const make = (patch: Partial<GroupSession>): GroupSession => ({ ...session("sql-analytics-interview-prep"), ...patch })

let counter = 0
const request = (target: GroupSession, overrides = {}) => {
  counter += 1
  return { requestId: `r${counter}`, bookingId: `b${counter}`, orderId: `o${counter}`, method: "bkash" as const, session: target, timezone: "Asia/Dhaka", ...overrides }
}

function enroll(state: Commerce, target: GroupSession, now = NOW) {
  const change = startGroupCheckout(state, request(target), now)
  return { change, ok: change.outcome.ok }
}

function paidEnrollment(target: GroupSession, now = NOW) {
  const first = startGroupCheckout(empty, request(target), now)
  if (!first.outcome.ok) throw new Error(first.outcome.message)
  const order = first.outcome.order
  let state = beginPayment(first, order.id, "bkash", later(1)) as Commerce
  state = applyPaymentEvent(state, { id: `e${++counter}`, type: "payment.succeeded", orderId: order.id, amount: order.quote.total, currency: "BDT" }, later(1)) as Commerce
  return { state, order, booking: state.bookings[0] }
}

test.describe("session data", () => {
  test("every session is complete and consistent", () => {
    const ids = new Set<string>()
    for (const item of getSessions()) {
      expect(ids.has(item.id), item.id).toBe(false)
      ids.add(item.id)
      expect(getMentor(item.mentorSlug), item.id).toBeTruthy()
      expect(item.expertise.length, item.id).toBeGreaterThan(0)
      expect(item.seats.total, item.id).toBeGreaterThan(0)
      expect(item.seats.taken, item.id).toBeLessThanOrEqual(item.seats.total)
      expect(item.price, item.id).toBeGreaterThan(0)
      expect(() => new Intl.DateTimeFormat("en", { timeZone: item.timezone })).not.toThrow()
      expect(new Date(registrationDeadline(item)).getTime(), item.id).toBeLessThanOrEqual(new Date(item.startsAt).getTime())
    }
  })

  test("the demo data includes a full, a closed and a cancelled session", () => {
    const states = getSessions().map((item) => [item.id, checkEnrollment(item, [], NOW), sessionPhase(item, NOW)] as const)
    const find = (id: string) => states.find((entry) => entry[0] === id)!
    expect(find("resume-teardown-clinic")[1]).toMatchObject({ open: false, reason: "full" })
    expect(find("product-metrics-crash-course")[1]).toMatchObject({ open: false, reason: "closed" })
    expect(find("frontend-performance-clinic")[1]).toMatchObject({ open: false, reason: "cancelled" })
    expect(sessionPhase(session("funded-masters-programs"), new Date("2026-11-01T00:00:00Z"))).toBe("completed")
  })
})

test.describe("enrollment rules", () => {
  test("an open session accepts a seat", () => {
    expect(checkEnrollment(session("sql-analytics-interview-prep"), [], NOW)).toEqual({ open: true })
  })

  test("registration closes at the deadline, or at the start when none is set", () => {
    const target = make({ registrationClosesAt: "2026-10-18T07:00:00Z" })
    expect(checkEnrollment(target, [], new Date("2026-10-18T06:59:59Z")).open).toBe(true)
    expect(checkEnrollment(target, [], new Date("2026-10-18T07:00:00Z"))).toMatchObject({ open: false, reason: "closed" })
    const noDeadline = make({ registrationClosesAt: undefined })
    expect(registrationDeadline(noDeadline)).toBe(noDeadline.startsAt)
    expect(checkEnrollment(noDeadline, [], new Date(new Date(noDeadline.startsAt).getTime() + 1))).toMatchObject({ open: false, reason: "ended" })
  })

  test("checkout is refused after registration closes, and nothing is created", () => {
    const closed = session("product-metrics-crash-course")
    const { change } = enroll(empty, closed)
    expect(change.outcome).toMatchObject({ ok: false, code: "registration-closed" })
    expect(change.bookings).toHaveLength(0)
    expect(change.orders).toHaveLength(0)
  })

  test("a full session can't be joined, and the last seat can", () => {
    expect(enroll(empty, make({ seats: { total: 10, taken: 10 } })).change.outcome).toMatchObject({ ok: false, code: "session-full" })
    expect(enroll(empty, make({ seats: { total: 10, taken: 9 } })).ok).toBe(true)
  })

  test("a seat held by a pending checkout counts until the hold expires", () => {
    const target = make({ seats: { total: 10, taken: 9 } })
    const { change } = enroll(empty, target)
    const bookings = change.bookings
    expect(seatsLeft(target, bookings, later(1))).toBe(0)
    expect(seatsLeft(target, bookings, later(HOLD_MINUTES + 1))).toBe(1)
  })

  test("seats taken never exceed capacity", () => {
    const target = make({ seats: { total: 5, taken: 5 } })
    const hold = { id: "x", kind: "group", sessionId: target.id, status: "confirmed" } as Booking
    expect(seatsTaken(target, [hold], NOW)).toBe(5)
  })

  test("the same learner can't enrol twice, even with a new request id", () => {
    const target = session("sql-analytics-interview-prep")
    const first = enroll(empty, target).change
    const again = startGroupCheckout(first, request(target), later(1))
    expect(again.outcome).toMatchObject({ ok: false, code: "already-enrolled" })
    expect(again.bookings).toHaveLength(1)
  })

  test("a repeated request id returns the same order instead of a second seat", () => {
    const target = session("sql-analytics-interview-prep")
    const req = request(target)
    const first = startGroupCheckout(empty, req, NOW)
    const again = startGroupCheckout(first, req, later(1))
    expect(again.outcome).toMatchObject({ ok: true, duplicate: true })
    expect(again.orders).toHaveLength(1)
  })

  test("a cancelled learner booking frees the way to enrol again", () => {
    const target = session("sql-analytics-interview-prep")
    const first = enroll(empty, target).change
    const cancelled = { ...first, bookings: first.bookings.map((item) => ({ ...item, status: "cancelled" as const })) }
    expect(startGroupCheckout(cancelled, request(target), later(1)).outcome.ok).toBe(true)
  })

  test("a cancelled session accepts no enrollment", () => {
    expect(enroll(empty, session("frontend-performance-clinic")).change.outcome).toMatchObject({ ok: false, code: "session-cancelled" })
    const target = session("sql-analytics-interview-prep")
    const cancelled: Commerce = { ...empty, cancelledSessions: { [target.id]: NOW.toISOString() } }
    expect(startGroupCheckout(cancelled, request(target), later(1)).outcome).toMatchObject({ ok: false, code: "session-cancelled" })
  })

  test("the server decides the price, not the request", () => {
    const target = session("sql-analytics-interview-prep")
    const forged = { ...target, price: 1 }
    const change = startGroupCheckout(empty, request(forged), NOW)
    expect(change.outcome.ok && change.outcome.order.quote.base).toBe(1)
  })
})

test.describe("learner state", () => {
  const target = session("sql-analytics-interview-prep")

  test("moves from none to pending to enrolled to completed", () => {
    expect(learnerState(target, [], NOW)).toBe("none")
    const pending = enroll(empty, target).change
    expect(learnerState(target, pending.bookings, later(1))).toBe("pending")
    expect(learnerState(target, pending.bookings, later(HOLD_MINUTES + 1))).toBe("none")
    const { state } = paidEnrollment(target)
    expect(learnerState(target, state.bookings, later(2))).toBe("enrolled")
    expect(learnerState(target, state.bookings, new Date(new Date(target.startsAt).getTime() + target.durationMinutes * 60_000))).toBe("completed")
  })

  test("a cancelled booking shows as cancelled", () => {
    const { state } = paidEnrollment(target)
    const cancelled = state.bookings.map((item) => ({ ...item, status: "cancelled" as const }))
    expect(learnerState(target, cancelled, later(2))).toBe("cancelled")
  })
})

test.describe("meeting details", () => {
  const target = session("sql-analytics-interview-prep")
  const start = new Date(target.startsAt).getTime()

  test("are denied to anyone who isn't a confirmed attendee", () => {
    expect(meetingAccess(target, [], new Date(start))).toEqual({ access: "denied", reason: "not-enrolled" })
    const pending = enroll(empty, target).change.bookings
    expect(meetingAccess(target, pending, new Date(start))).toEqual({ access: "denied", reason: "not-enrolled" })
  })

  test("unlock for attendees 30 minutes before the start and close when it ends", () => {
    const { state } = paidEnrollment(target)
    expect(meetingAccess(target, state.bookings, new Date(start - 31 * 60_000))).toMatchObject({ access: "locked" })
    const open = meetingAccess(target, state.bookings, new Date(start - 30 * 60_000))
    expect(open).toMatchObject({ access: "granted", details: { url: expect.stringContaining(target.id) } })
    expect(meetingAccess(target, state.bookings, new Date(start + target.durationMinutes * 60_000))).toEqual({ access: "denied", reason: "ended" })
  })

  test("are never given for a cancelled session", () => {
    const { state } = paidEnrollment(target)
    expect(meetingAccess(applyCancellation(target, { [target.id]: "x" }), state.bookings, new Date(start))).toEqual({ access: "denied", reason: "cancelled" })
  })
})

test.describe("session cancellation and refunds", () => {
  const target = session("sql-analytics-interview-prep")
  const owner: Actor = { role: "mentor", mentorSlug: target.mentorSlug }

  test("refunds a paid attendee in full and closes the booking", () => {
    const { state, order, booking } = paidEnrollment(target)
    const result = cancelSession(state, target.id, later(3), owner)
    expect(result.outcome).toMatchObject({ ok: true, refundOrderIds: [order.id] })
    expect(result.orders[0]).toMatchObject({ status: "refund-pending", refundPercent: 100, refundAmount: order.quote.total })
    expect(result.bookings.find((item) => item.id === booking.id)).toMatchObject({ status: "cancelled", refundPercent: 100 })
    expect(result.cancelledSessions[target.id]).toBeTruthy()
  })

  test("closes an unpaid hold without any refund", () => {
    const held = startGroupCheckout(empty, request(target), NOW)
    const result = cancelSession(held, target.id, later(3), owner)
    expect(result.outcome).toMatchObject({ ok: true, refundOrderIds: [] })
    expect(result.orders[0].status).toBe("cancelled")
    expect(result.orders[0].refundAmount).toBeUndefined()
    expect(result.bookings[0].status).toBe("cancelled")
    expect(result.bookings[0].refundPercent).toBeUndefined()
  })

  test("refunds ignore the attendee's own refund window", () => {
    const { state, order } = paidEnrollment(target, NOW)
    const lateNow = new Date(new Date(target.startsAt).getTime() - 60_000)
    const result = cancelSession(state, target.id, lateNow, owner)
    expect(result.orders.find((item) => item.id === order.id)!.refundAmount).toBe(order.quote.total)
  })

  test("is idempotent and blocks new enrollment afterwards", () => {
    const { state } = paidEnrollment(target)
    const once = cancelSession(state, target.id, later(3), owner)
    const twice = cancelSession(once, target.id, later(4), owner)
    expect(twice.orders).toBe(once.orders)
    expect(twice.outcome).toMatchObject({ ok: true, refundOrderIds: [] })
    expect(startGroupCheckout(twice, request(target), later(5)).outcome).toMatchObject({ ok: false, code: "session-cancelled" })
  })

  test("a payment still in flight when the session is cancelled ends up refunded, not confirmed", () => {
    const first = startGroupCheckout(empty, request(target), NOW)
    if (!first.outcome.ok) throw new Error("setup")
    const order = first.outcome.order
    const processing = beginPayment(first, order.id, "bkash", later(1)) as Commerce
    const cancelled = cancelSession(processing, target.id, later(2), owner)
    const settled = applyPaymentEvent(cancelled, { id: "late", type: "payment.succeeded", orderId: order.id, amount: order.quote.total, currency: "BDT" }, later(3)) as Commerce
    const final = settled.orders.find((item) => item.id === order.id) as Order
    expect(final).toMatchObject({ status: "refund-pending", refundAmount: order.quote.total })
    expect(settled.bookings[0].status).toBe("cancelled")
  })

  test("can't be cancelled once it has started or ended, so nobody is refunded after the fact", () => {
    const { state, order } = paidEnrollment(target)
    const start = new Date(target.startsAt).getTime()
    for (const at of [new Date(start), new Date(start + target.durationMinutes * 60_000 + 60_000)]) {
      const result = cancelSession(state, target.id, at, owner)
      expect(result.outcome).toMatchObject({ ok: false, code: "not-allowed", message: expect.stringContaining("already started") })
      expect(result.orders).toBe(state.orders)
      expect(result.cancelledSessions[target.id]).toBeUndefined()
      expect(result.orders.find((item) => item.id === order.id)!.refundAmount).toBeUndefined()
    }
  })

  test("only the mentor who runs the session can cancel it", () => {
    const { state } = paidEnrollment(target)
    for (const actor of [null, { role: "learner" } as Actor, { role: "admin" } as Actor, { role: "mentor", mentorSlug: "someone-else" } as Actor]) {
      const result = cancelSession(state, target.id, later(3), actor)
      expect(result.outcome).toMatchObject({ ok: false, code: "not-allowed" })
      expect(result.bookings).toBe(state.bookings)
    }
    expect(cancelSession(state, "no-such-session", later(3), owner).outcome).toMatchObject({ ok: false, code: "not-found" })
  })

  test("a refunded session leaves the ledger with no revenue and no earnings", () => {
    const { state, order } = paidEnrollment(target)
    const cancelled = cancelSession(state, target.id, later(3), owner)
    const pending = cancelled.orders.find((item) => item.id === order.id) as Order
    const refunded = applyPaymentEvent(
      cancelled,
      { id: "rf", type: "refund.succeeded", orderId: order.id, amount: pending.refundAmount!, currency: "BDT" },
      later(4)
    ) as Commerce
    const final = refunded.orders.find((item) => item.id === order.id)!
    expect(final.status).toBe("refunded")
    expect(ledger(final)).toMatchObject({ refunded: order.quote.total, platformRevenue: 0, mentorEarnings: 0, paidOut: 0 })
  })
})

test.describe("search", () => {
  test("matches title, mentor, expertise tags, category and language", () => {
    const ids = (query: string, category: Parameters<typeof searchSessions>[2] = "all") => searchSessions(getSessions(), query, category).map((item) => item.id)
    expect(ids("sql")).toContain("sql-analytics-interview-prep")
    expect(ids("farzana")).toContain("sql-analytics-interview-prep")
    expect(ids("core web vitals")).toEqual(["frontend-performance-clinic"])
    expect(ids("", "phd-research").every((id) => getSession(id)!.category === "phd-research")).toBe(true)
    expect(ids("zzzz")).toEqual([])
  })
})
