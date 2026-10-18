import { expect, test } from "@playwright/test"

import { holdsSlot } from "@/lib/availability"
import { getSlots, getBusyIntervals } from "@/lib/availability"
import { HOLD_MINUTES, type BookingRequest } from "@/lib/booking-service"
import { getMentor, getSession } from "@/lib/data"
import { advance, canTransition, ledger, orderTransitions, sumLedgers, type Order, type OrderStatus } from "@/lib/orders"
import {
  applyPaymentEvent,
  beginPayment,
  cancelWithRefund,
  startCheckout,
  startGroupCheckout,
  type Commerce,
  type PaymentEvent,
} from "@/lib/payment-service"
import { isValidAmount, quote, refundAmount } from "@/lib/pricing"
import type { OneOnOneOffer } from "@/lib/types"

const NOW = new Date("2026-10-18T06:00:00Z")
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)
const empty: Commerce = { bookings: [], orders: [], cancelledSessions: {}, sessionCapacity: {} }

const mentor = getMentor("nusrat-jahan")!
const offer = mentor.offers.find((item): item is OneOnOneOffer => item.type === "one-on-one" && item.status === "published")!
const slots = getSlots(mentor, offer.durationMinutes, getBusyIntervals(mentor, [], NOW), NOW).filter((slot) => slot.available)

let counter = 0
function checkoutRequest(overrides: Partial<BookingRequest> = {}) {
  counter += 1
  return {
    requestId: `req-${counter}`,
    bookingId: `bk-${counter}`,
    orderId: `or-${counter}`,
    method: "bkash" as const,
    mentor,
    offer,
    startsAt: slots[counter + 3].startsAt,
    timezone: "Asia/Dhaka",
    ...overrides,
  }
}

function must<T extends { outcome: { ok: boolean } }>(change: T): T & { outcome: { ok: true } } {
  if (!change.outcome.ok) throw new Error(`expected success: ${JSON.stringify(change.outcome)}`)
  return change as T & { outcome: { ok: true } }
}

const orderOf = (state: Commerce, id: string) => state.orders.find((item) => item.id === id)!
const bookingOf = (state: Commerce, id: string) => state.bookings.find((item) => item.id === id)!

let eventCounter = 0
const event = (order: Order, type: PaymentEvent["type"], overrides: Partial<PaymentEvent> = {}): PaymentEvent => {
  eventCounter += 1
  return { id: `evt-${eventCounter}`, type, orderId: order.id, amount: order.quote.total, currency: order.quote.currency, ...overrides }
}

function placed(overrides: Partial<BookingRequest> = {}, state = empty, now = NOW) {
  const request = checkoutRequest(overrides)
  const change = must(startCheckout(state, request, now))
  return { state: change as Commerce, request, order: orderOf(change, request.orderId) }
}

function paid(state: Commerce, orderId: string, now = later(1)) {
  let current = must(beginPayment(state, orderId, "bkash", now)) as Commerce
  current = must(applyPaymentEvent(current, event(orderOf(current, orderId), "payment.succeeded"), now)) as Commerce
  return current
}

test.describe("pricing", () => {
  test("adds a disclosed platform fee and splits the total without losing a taka", () => {
    for (const base of [1, 7, 10, 99, 630, 1890, 3000, 3333, 12_345]) {
      const q = quote(base)
      expect(q.total).toBe(q.base + q.platformFee)
      expect(q.mentorEarnings + q.platformRevenue).toBe(q.total)
      expect(q.platformRevenue).toBe(q.platformFee + q.mentorCommission)
    }
    expect(quote(3000)).toMatchObject({ currency: "BDT", platformFee: 150, total: 3150, mentorCommission: 300, mentorEarnings: 2700, platformRevenue: 450 })
  })

  test("rejects invalid, fractional and absurd amounts", () => {
    for (const bad of [0, -5, 10.5, Number.NaN, Number.POSITIVE_INFINITY, 1e12]) {
      expect(isValidAmount(bad)).toBe(false)
      expect(() => quote(bad)).toThrow(RangeError)
    }
    expect(() => quote("100" as unknown as number)).toThrow(RangeError)
  })

  test("refunds are a rounded share of the total and reject impossible percentages", () => {
    expect(refundAmount(3150, 100)).toBe(3150)
    expect(refundAmount(3150, 50)).toBe(1575)
    expect(refundAmount(631, 50)).toBe(316)
    expect(refundAmount(3150, 0)).toBe(0)
    expect(() => refundAmount(3150, 101)).toThrow(RangeError)
    expect(() => refundAmount(3150, -1)).toThrow(RangeError)
  })
})

test.describe("order state machine", () => {
  const statuses = Object.keys(orderTransitions) as OrderStatus[]

  test("terminal states have no way out and every transition target is a real state", () => {
    expect(orderTransitions.refunded).toEqual([])
    for (const from of statuses) for (const to of orderTransitions[from]) expect(statuses).toContain(to)
  })

  test("contradictory jumps are refused", () => {
    const forbidden: [OrderStatus, OrderStatus][] = [
      ["awaiting-payment", "paid"],
      ["awaiting-payment", "confirmed"],
      ["awaiting-payment", "refunded"],
      ["processing", "confirmed"],
      ["payment-failed", "paid"],
      ["paid", "cancelled"],
      ["confirmed", "refunded"],
      ["confirmed", "processing"],
      ["cancelled", "confirmed"],
      ["refunded", "confirmed"],
      ["refunded", "refund-pending"],
      ["refund-pending", "confirmed"],
    ]
    for (const [from, to] of forbidden) expect(canTransition(from, to), `${from} -> ${to}`).toBe(false)
    const { order } = placed()
    expect(() => advance(order, "paid", NOW)).toThrow()
  })

  test("every step is recorded in the order history", () => {
    const { state, order } = placed()
    const done = orderOf(paid(state, order.id), order.id)
    expect(done.history.map((entry) => entry.status)).toEqual(["awaiting-payment", "processing", "paid", "confirmed"])
  })
})

test.describe("checkout", () => {
  test("creates a pending booking and an awaiting-payment order priced by the server", () => {
    const { state, order, request } = placed()
    expect(order.status).toBe("awaiting-payment")
    expect(order.quote).toEqual(quote(offer.price))
    expect(bookingOf(state, request.bookingId)).toMatchObject({ status: "pending", total: order.quote.total })
    expect(order.expiresAt).toBe(bookingOf(state, request.bookingId).expiresAt)
  })

  test("a client-submitted price or commission is ignored", () => {
    const request = { ...checkoutRequest(), total: 1, price: 1, platformFee: 0, mentorEarnings: 99_999 }
    const change = must(startCheckout(empty, request, NOW))
    expect(orderOf(change, request.orderId).quote).toEqual(quote(offer.price))
    expect(bookingOf(change, request.bookingId).total).toBe(quote(offer.price).total)
  })

  test("a repeated request returns the same order instead of charging twice", () => {
    const { state, request, order } = placed()
    const again = must(startCheckout(state, { ...request, orderId: "different", bookingId: "different" }, NOW))
    expect(again.orders).toHaveLength(1)
    expect(again.outcome).toMatchObject({ duplicate: true, order: { id: order.id } })
  })

  test("a slot held by an unpaid order can't be sold twice, and frees after the hold", () => {
    const { state, request } = placed()
    const clash = startCheckout(state, checkoutRequest({ startsAt: request.startsAt }), later(1))
    expect(clash.outcome).toMatchObject({ ok: false, code: "booked" })
    const after = startCheckout(state, checkoutRequest({ startsAt: request.startsAt }), later(HOLD_MINUTES + 1))
    expect(after.outcome.ok).toBe(true)
  })

  test("a group seat gets an order priced from the session", () => {
    const session = getSession("funded-masters-programs")!
    const request = { requestId: "g1", bookingId: "gb1", orderId: "go1", method: "card" as const, session, timezone: "Asia/Dhaka" }
    const change = must(startGroupCheckout(empty, request, NOW))
    expect(orderOf(change, "go1").quote).toEqual(quote(session.price))
    expect(bookingOf(change, "gb1")).toMatchObject({ kind: "group", status: "pending" })
    const second = startGroupCheckout(change, { ...request, requestId: "g2", bookingId: "gb2", orderId: "go2" }, NOW)
    expect(second.outcome).toMatchObject({ ok: false, code: "already-enrolled" })
  })
})

test.describe("payment lifecycle", () => {
  test("a successful provider event pays the order and confirms the booking", () => {
    const { state, order, request } = placed()
    const final = paid(state, order.id)
    expect(orderOf(final, order.id).status).toBe("confirmed")
    expect(bookingOf(final, request.bookingId).status).toBe("confirmed")
    expect(orderOf(final, order.id).transactions).toMatchObject([{ kind: "charge", status: "succeeded", amount: order.quote.total, simulated: true }])
  })

  test("beginning payment alone never confirms anything", () => {
    const { state, order, request } = placed()
    const processing = must(beginPayment(state, order.id, "nagad", later(1)))
    expect(orderOf(processing, order.id)).toMatchObject({ status: "processing", method: "nagad" })
    expect(bookingOf(processing, request.bookingId).status).toBe("pending")
    expect(orderOf(processing, order.id).transactions).toEqual([])
  })

  test("beginning payment twice is a no-op", () => {
    const { state, order } = placed()
    const once = must(beginPayment(state, order.id, "bkash", later(1)))
    const twice = must(beginPayment(once, order.id, "bkash", later(1)))
    expect(orderOf(twice, order.id).history).toHaveLength(2)
  })

  test("a duplicate webhook delivery is applied once", () => {
    const { state, order } = placed()
    const processing = must(beginPayment(state, order.id, "bkash", later(1))) as Commerce
    const hook = event(order, "payment.succeeded")
    const first = must(applyPaymentEvent(processing, hook, later(1))) as Commerce
    const second = must(applyPaymentEvent(first, hook, later(2)))
    expect(second.outcome).toMatchObject({ duplicate: true })
    expect(orderOf(second, order.id)).toEqual(orderOf(first, order.id))
    expect(orderOf(second, order.id).transactions).toHaveLength(1)
  })

  test("a different event id for an already paid order is rejected, not double-recorded", () => {
    const { state, order } = placed()
    const final = paid(state, order.id)
    const again = applyPaymentEvent(final, event(order, "payment.succeeded"), later(3))
    expect(again.outcome).toMatchObject({ ok: false, code: "invalid-state" })
    expect(orderOf(again, order.id).transactions).toHaveLength(1)
  })

  test("an event with the wrong amount or currency changes nothing", () => {
    const { state, order } = placed()
    const processing = must(beginPayment(state, order.id, "bkash", later(1))) as Commerce
    for (const bad of [{ amount: 1 }, { amount: order.quote.base }, { amount: order.quote.total + 1 }, { currency: "USD" }]) {
      const result = applyPaymentEvent(processing, event(order, "payment.succeeded", bad), later(1))
      expect(result.outcome).toMatchObject({ ok: false, code: "amount-mismatch" })
      expect(orderOf(result, order.id)).toEqual(orderOf(processing, order.id))
    }
  })

  test("an event for an unknown order is refused", () => {
    const { order } = placed()
    expect(applyPaymentEvent(empty, event(order, "payment.succeeded"), NOW).outcome).toMatchObject({ ok: false, code: "order-not-found" })
  })

  test("a failed payment keeps the hold, can be retried, and then succeeds", () => {
    const { state, order, request } = placed()
    let current = must(beginPayment(state, order.id, "card", later(1))) as Commerce
    current = must(applyPaymentEvent(current, event(order, "payment.failed"), later(1))) as Commerce
    expect(orderOf(current, order.id).status).toBe("payment-failed")
    expect(bookingOf(current, request.bookingId).status).toBe("pending")
    expect(orderOf(current, order.id).transactions).toMatchObject([{ kind: "charge", status: "failed", amount: 0 }])
    expect(holdsSlot(bookingOf(current, request.bookingId), later(2))).toBe(true)

    current = must(beginPayment(current, order.id, "bkash", later(3))) as Commerce
    current = must(applyPaymentEvent(current, event(order, "payment.succeeded"), later(3))) as Commerce
    expect(orderOf(current, order.id).status).toBe("confirmed")
    expect(ledger(orderOf(current, order.id)).grossBookingValue).toBe(order.quote.total)
  })

  test("a stale failure after payment doesn't undo it", () => {
    const { state, order } = placed()
    const final = paid(state, order.id)
    const stale = must(applyPaymentEvent(final, event(order, "payment.failed"), later(5)))
    expect(orderOf(stale, order.id).status).toBe("confirmed")
  })

  test("payment can't start after the hold has expired, and the order closes", () => {
    const { state, order, request } = placed()
    const result = beginPayment(state, order.id, "bkash", later(HOLD_MINUTES + 1))
    expect(result.outcome).toMatchObject({ ok: false, code: "expired" })
    expect(orderOf(result, order.id).status).toBe("cancelled")
    expect(bookingOf(result, request.bookingId).status).toBe("expired")
  })

  test("a payment that lands after the hold lapsed is refunded in full, not confirmed", () => {
    const { state, order, request } = placed()
    const processing = must(beginPayment(state, order.id, "bkash", later(1))) as Commerce
    const result = must(applyPaymentEvent(processing, event(order, "payment.succeeded"), later(HOLD_MINUTES + 5)))
    expect(orderOf(result, order.id)).toMatchObject({ status: "refund-pending", refundPercent: 100, refundAmount: order.quote.total })
    expect(bookingOf(result, request.bookingId).status).toBe("expired")
  })

  test("a charge that arrives for an already cancelled order goes straight to refund", () => {
    const { state, order } = placed()
    const cancelled = must(cancelWithRefund(state, state.bookings[0].id, later(1))) as Commerce
    expect(orderOf(cancelled, order.id).status).toBe("cancelled")
    const late = must(applyPaymentEvent(cancelled, event(order, "payment.succeeded"), later(2)))
    expect(orderOf(late, order.id)).toMatchObject({ status: "refund-pending", refundAmount: order.quote.total })
  })
})

test.describe("cancellation and refunds", () => {
  test("cancelling an unpaid order closes it with no refund and frees the slot", () => {
    const { state, order, request } = placed()
    const result = must(cancelWithRefund(state, request.bookingId, later(1)))
    expect(orderOf(result, order.id)).toMatchObject({ status: "cancelled" })
    expect(orderOf(result, order.id).refundAmount).toBeUndefined()
    expect(bookingOf(result, request.bookingId)).toMatchObject({ status: "cancelled" })
    expect(bookingOf(result, request.bookingId).refundPercent).toBeUndefined()
  })

  test("cancelling while payment is processing is refused", () => {
    const { state, order, request } = placed()
    const processing = must(beginPayment(state, order.id, "bkash", later(1))) as Commerce
    expect(cancelWithRefund(processing, request.bookingId, later(2)).outcome).toMatchObject({ ok: false, code: "not-allowed" })
  })

  test("a full refund goes pending, then refunded once the provider confirms", () => {
    const { state, order, request } = placed()
    const confirmed = paid(state, order.id)
    const cancelled = must(cancelWithRefund(confirmed, request.bookingId, later(5))) as Commerce
    const pending = orderOf(cancelled, order.id)
    expect(pending).toMatchObject({ status: "refund-pending", refundPercent: 100, refundAmount: order.quote.total })
    expect(ledger(pending).refunded).toBe(0)

    const settled = must(applyPaymentEvent(cancelled, event(pending, "refund.succeeded", { amount: pending.refundAmount }), later(6))) as Commerce
    expect(orderOf(settled, order.id).status).toBe("refunded")
    expect(ledger(orderOf(settled, order.id))).toMatchObject({ grossBookingValue: order.quote.total, refunded: order.quote.total, platformRevenue: 0, mentorEarnings: 0, paidOut: 0 })
  })

  test("a refund event can't be applied twice or for the wrong amount", () => {
    const { state, order, request } = placed()
    const cancelled = must(cancelWithRefund(paid(state, order.id), request.bookingId, later(5))) as Commerce
    const pending = orderOf(cancelled, order.id)
    const wrong = applyPaymentEvent(cancelled, event(pending, "refund.succeeded", { amount: pending.refundAmount! + 1 }), later(6))
    expect(wrong.outcome).toMatchObject({ ok: false })
    expect(orderOf(wrong, order.id).status).toBe("refund-pending")

    const hook = event(pending, "refund.succeeded", { amount: pending.refundAmount })
    const once = must(applyPaymentEvent(cancelled, hook, later(6))) as Commerce
    const twice = must(applyPaymentEvent(once, hook, later(7)))
    expect(orderOf(twice, order.id).transactions.filter((item) => item.kind === "refund")).toHaveLength(1)
  })

  test("a partial refund keeps the right shares of revenue and mentor earnings", () => {
    const { state, order, request } = placed()
    const confirmed = paid(state, order.id)
    // Standard policy refunds half inside 48 hours of the call.
    const standard: Commerce = { ...confirmed, bookings: confirmed.bookings.map((item) => ({ ...item, cancellation: "standard" as const })) }
    const start = new Date(bookingOf(standard, request.bookingId).date).getTime()
    const cancelled = must(cancelWithRefund(standard, request.bookingId, new Date(start - 47 * 3_600_000))) as Commerce
    const pending = orderOf(cancelled, order.id)
    expect(pending.refundPercent).toBe(50)
    const settled = orderOf(must(applyPaymentEvent(cancelled, event(pending, "refund.succeeded", { amount: pending.refundAmount }), later(9))) as Commerce, order.id)
    const books = ledger(settled)
    expect(books.refunded).toBe(refundAmount(order.quote.total, 50))
    expect(books.platformRevenue + books.mentorEarnings).toBe(books.grossBookingValue - books.refunded)
    expect(books.mentorEarnings).toBe(Math.round(order.quote.mentorEarnings / 2))
  })

  test("a no-refund cancellation closes the order as cancelled with the money kept", () => {
    const { state, order, request } = placed()
    const confirmed = paid(state, order.id)
    const start = new Date(bookingOf(confirmed, request.bookingId).date).getTime()
    const cancelled = must(cancelWithRefund(confirmed, request.bookingId, new Date(start - 3_600_000))) as Commerce
    expect(orderOf(cancelled, order.id).status).toBe("cancelled")
    expect(ledger(orderOf(cancelled, order.id))).toMatchObject({ grossBookingValue: order.quote.total, refunded: 0, mentorEarnings: order.quote.mentorEarnings })
  })

  test("a booking that is already cancelled can't be cancelled or refunded again", () => {
    const { state, order, request } = placed()
    const cancelled = must(cancelWithRefund(paid(state, order.id), request.bookingId, later(5))) as Commerce
    expect(cancelWithRefund(cancelled, request.bookingId, later(6)).outcome).toMatchObject({ ok: false, code: "not-allowed" })
  })

  test("seeded bookings without an order still cancel", () => {
    const seeded = { id: "seed", kind: "one-on-one" as const, mentorSlug: mentor.slug, title: "t", date: "2026-10-25T13:00:00Z", durationMinutes: 45, timezone: "Asia/Dhaka", total: 100, status: "confirmed" as const, cancellation: "flexible" as const }
    const result = must(cancelWithRefund({ bookings: [seeded], orders: [], cancelledSessions: {}, sessionCapacity: {} }, "seed", NOW))
    expect(result.outcome).toMatchObject({ order: null, booking: { status: "cancelled", refundPercent: 100 } })
  })
})

test.describe("ledger", () => {
  test("keeps gross value, platform revenue, mentor earnings and payouts separate", () => {
    const { state, order } = placed()
    const final = orderOf(paid(state, order.id), order.id)
    const books = ledger(final)
    expect(books).toMatchObject({
      grossBookingValue: final.quote.total,
      platformRevenue: final.quote.platformRevenue,
      mentorEarnings: final.quote.mentorEarnings,
      refunded: 0,
      paidOut: 0,
    })
    expect(books.platformRevenue + books.mentorEarnings).toBe(books.grossBookingValue)
  })

  test("unpaid and failed orders contribute nothing", () => {
    const { state, order } = placed()
    expect(ledger(order)).toMatchObject({ grossBookingValue: 0, platformRevenue: 0, mentorEarnings: 0 })
    const processing = must(beginPayment(state, order.id, "card", later(1))) as Commerce
    const failed = orderOf(must(applyPaymentEvent(processing, event(order, "payment.failed"), later(1))) as Commerce, order.id)
    expect(ledger(failed).grossBookingValue).toBe(0)
  })

  test("totals add up across orders", () => {
    const first = placed()
    const second = placed({}, first.state)
    const both = paid(paid(second.state, first.order.id), second.order.id)
    const totals = sumLedgers(both.orders, "BDT")
    expect(totals.grossBookingValue).toBe(first.order.quote.total * 2)
    expect(totals.platformRevenue + totals.mentorEarnings).toBe(totals.grossBookingValue)
    expect(totals.paidOut).toBe(0)
  })
})
