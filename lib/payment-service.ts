import { holdsSlot } from "@/lib/availability"
import { cancelDecision } from "@/lib/booking-policy"
import {
  confirmedStatus,
  placeBooking,
  placeGroupBooking,
  type BookingFailure,
  type BookingRequest,
  type GroupBookingRequest,
} from "@/lib/booking-service"
import { advance, canTransition, isUnpaid, newOrder, withRefund, type Order, type PaymentMethod, type Transaction } from "@/lib/orders"
import { quote, refundAmount } from "@/lib/pricing"
import { canManageMentor, FORBIDDEN, type Actor } from "@/lib/permissions"
import { resolveSession, type SessionOverrides } from "@/lib/sessions"
import type { Booking } from "@/lib/types"

// All price, fee and state decisions live here and take only ids and provider events from the caller, so
// this module can move behind a server route unchanged when a backend and payment provider exist.

// sessionId -> when the mentor cancelled it; a cancelled session accepts no new enrollment.
export type Commerce = { bookings: Booking[]; orders: Order[] } & SessionOverrides

export type PaymentFailure = BookingFailure | "order-not-found" | "amount-mismatch" | "invalid-state" | "expired"

export type PaymentOutcome =
  | { ok: true; booking: Booking; order: Order; duplicate?: boolean }
  | { ok: false; code: PaymentFailure; message: string }

export type CommerceChange = Commerce & { outcome: PaymentOutcome }

// Seeded demo bookings predate orders, so a cancellation may have no order to refund.
export type CancelChange = Commerce & {
  outcome: { ok: true; booking: Booking; order: Order | null } | { ok: false; code: PaymentFailure; message: string }
}

// What a payment provider reports. The browser never builds these in a real integration.
export type PaymentEvent = {
  id: string
  type: "payment.succeeded" | "payment.failed" | "refund.succeeded"
  orderId: string
  amount: number
  currency: string
}

const fail = (state: Commerce, code: PaymentFailure, message: string): CommerceChange => ({ ...state, outcome: { ok: false, code, message } })

function replace<T extends { id: string }>(list: T[], item: T) {
  return list.map((entry) => (entry.id === item.id ? item : entry))
}

function done(state: Commerce, order: Order, booking: Booking, duplicate = false): CommerceChange {
  return {
    ...state,
    bookings: replace(state.bookings, booking),
    orders: replace(state.orders, order),
    outcome: { ok: true, order, booking, ...(duplicate && { duplicate }) },
  }
}

export type CheckoutRequest = { orderId: string; method: PaymentMethod }

function createOrder(state: Commerce, change: { bookings: Booking[]; booking: Booking }, request: { orderId: string; method: PaymentMethod; requestId: string; price: number }, now: Date): CommerceChange {
  const { booking } = change
  const order = newOrder(
    {
      id: request.orderId,
      bookingId: booking.id,
      requestId: request.requestId,
      mentorSlug: booking.mentorSlug,
      title: booking.title,
      method: request.method,
      quote: quote(request.price),
      expiresAt: booking.expiresAt!,
    },
    now
  )
  return { ...state, bookings: change.bookings, orders: [order, ...state.orders], outcome: { ok: true, order, booking } }
}

export function startCheckout(state: Commerce, request: BookingRequest & CheckoutRequest, now: Date): CommerceChange {
  const existing = state.orders.find((order) => order.requestId === request.requestId)
  const existingBooking = existing && state.bookings.find((booking) => booking.id === existing.bookingId)
  if (existing && existingBooking) return done(state, existing, existingBooking, true)

  const change = placeBooking(state.bookings, request, now)
  if (!change.outcome.ok) return fail(state, change.outcome.code, change.outcome.message)
  return createOrder(state, { bookings: change.bookings, booking: change.outcome.booking }, { ...request, price: request.offer.price }, now)
}

export function startGroupCheckout(state: Commerce, request: GroupBookingRequest & CheckoutRequest, now: Date): CommerceChange {
  const existing = state.orders.find((order) => order.requestId === request.requestId)
  const existingBooking = existing && state.bookings.find((booking) => booking.id === existing.bookingId)
  if (existing && existingBooking) return done(state, existing, existingBooking, true)

  const session = resolveSession(request.session, state)
  const change = placeGroupBooking(state.bookings, { ...request, session }, now)
  if (!change.outcome.ok) return fail(state, change.outcome.code, change.outcome.message)
  return createOrder(state, { bookings: change.bookings, booking: change.outcome.booking }, { ...request, price: session.price }, now)
}

function lookup(state: Commerce, orderId: string) {
  const order = state.orders.find((item) => item.id === orderId)
  const booking = order && state.bookings.find((item) => item.id === order.bookingId)
  return order && booking ? { order, booking } : null
}

function closeUnpaid(state: Commerce, order: Order, booking: Booking, now: Date): CommerceChange {
  const closed = advance(order, "cancelled", now)
  const expired: Booking = { ...booking, status: "expired" }
  return { ...done(state, closed, expired), outcome: { ok: false, code: "expired", message: "This booking hold expired before payment. Choose a time again." } }
}

// Moves an unpaid order to "processing" when the learner hands off to the provider. Repeats are harmless.
export function beginPayment(state: Commerce, orderId: string, method: PaymentMethod, now: Date): CommerceChange {
  const found = lookup(state, orderId)
  if (!found) return fail(state, "order-not-found", "We couldn't find that order.")
  const { order, booking } = found
  if (order.status === "processing") return done(state, order, booking, true)
  if (!canTransition(order.status, "processing")) return fail(state, "invalid-state", "This order can't be paid anymore.")
  if (new Date(order.expiresAt) <= now) return closeUnpaid(state, order, booking, now)
  return done(state, advance({ ...order, method }, "processing", now), booking)
}

function record(order: Order, event: PaymentEvent, kind: Transaction["kind"], status: Transaction["status"], now: Date): Order {
  const transaction: Transaction = {
    id: `${order.id}-${order.transactions.length + 1}`,
    kind,
    amount: event.amount,
    currency: event.currency,
    status,
    eventId: event.id,
    at: now.toISOString(),
    simulated: true,
  }
  return { ...order, transactions: [...order.transactions, transaction], processedEvents: [...order.processedEvents, event.id] }
}

function applySuccess(state: Commerce, order: Order, booking: Booking, event: PaymentEvent, now: Date): CommerceChange {
  if (event.amount !== order.quote.total || event.currency !== order.quote.currency) {
    return fail(state, "amount-mismatch", "The payment amount doesn't match this order.")
  }
  if (order.status === "awaiting-payment" || order.status === "payment-failed") order = advance(order, "processing", now)

  if (order.status === "cancelled") {
    // Money arrived for a closed order, so it goes straight back.
    const late = advance(withRefund(record(order, event, "charge", "succeeded", now), 100), "refund-pending", now)
    return done(state, late, booking)
  }
  if (order.status !== "processing") return fail(state, "invalid-state", "This order has already been paid.")

  const paid = advance(record(order, event, "charge", "succeeded", now), "paid", now)
  if (booking.status === "pending" && holdsSlot(booking, now)) {
    return done(state, advance(paid, "confirmed", now), { ...booking, status: confirmedStatus(booking.kind) })
  }
  // The hold lapsed or the booking was closed while the payment was in flight.
  const refund = advance(withRefund(paid, 100), "refund-pending", now)
  return done(state, refund, booking.status === "pending" ? { ...booking, status: "expired" } : booking)
}

// The only path that changes an order after payment starts, mirroring a provider webhook handler.
export function applyPaymentEvent(state: Commerce, event: PaymentEvent, now: Date): CommerceChange {
  const found = lookup(state, event.orderId)
  if (!found) return fail(state, "order-not-found", "We couldn't find that order.")
  const { order, booking } = found
  if (order.processedEvents.includes(event.id)) return done(state, order, booking, true)

  switch (event.type) {
    case "payment.succeeded":
      return applySuccess(state, order, booking, event, now)
    case "payment.failed": {
      if (order.status !== "processing") return done(state, { ...order, processedEvents: [...order.processedEvents, event.id] }, booking)
      return done(state, advance(record(order, { ...event, amount: 0 }, "charge", "failed", now), "payment-failed", now), booking)
    }
    case "refund.succeeded": {
      if (order.status !== "refund-pending" || event.amount !== order.refundAmount || event.currency !== order.quote.currency) {
        return fail(state, "invalid-state", "There is no matching refund waiting on this order.")
      }
      return done(state, advance(record(order, event, "refund", "succeeded", now), "refunded", now), booking)
    }
  }
}

// Cancels a booking and, if money was taken, opens a refund sized by the booking's policy.
// With `byMentor`, the mentor ends the booking: it must be their own, and the learner is refunded in full.
export function cancelWithRefund(state: Commerce, bookingId: string, now: Date, byMentor?: Actor | null): CancelChange {
  const booking = state.bookings.find((item) => item.id === bookingId)
  if (!booking) return fail(state, "not-found", "We couldn't find that booking.")
  if (byMentor !== undefined && !canManageMentor(byMentor, booking.mentorSlug)) return fail(state, "not-allowed", FORBIDDEN)
  const order = state.orders.find((item) => item.bookingId === bookingId)
  if (order?.status === "processing") return fail(state, "not-allowed", "Payment is still processing. Try again in a moment.")

  const decision = cancelDecision(booking, now)
  if (!decision.allowed) return fail(state, "not-allowed", decision.reason)

  const unpaid = order ? isUnpaid(order.status) : booking.status === "pending"
  const refundPercent = unpaid ? 0 : byMentor ? 100 : decision.refundPercent
  const cancelled: Booking = { ...booking, status: "cancelled", cancelledAt: now.toISOString(), ...(!unpaid && { refundPercent }) }
  if (!order) return { ...state, bookings: replace(state.bookings, cancelled), outcome: { ok: true, booking: cancelled, order: null } }

  let next: Order
  if (unpaid || refundAmount(order.quote.total, refundPercent) === 0) next = advance(order, "cancelled", now)
  else next = advance(withRefund(order, refundPercent), "refund-pending", now)
  return { ...state, bookings: replace(state.bookings, cancelled), orders: replace(state.orders, next), outcome: { ok: true, booking: cancelled, order: next } }
}

export type SessionCancelChange = Commerce & {
  outcome: { ok: true; refundOrderIds: string[] } | { ok: false; code: PaymentFailure; message: string }
}

// A mentor cancelling the session overrides each attendee's own refund window: everyone is refunded in full.
export function cancelSession(state: Commerce, sessionId: string, now: Date): SessionCancelChange {
  if (state.cancelledSessions[sessionId]) return { ...state, outcome: { ok: true, refundOrderIds: [] } }

  const refundOrderIds: string[] = []
  let orders = state.orders
  const bookings = state.bookings.map((booking) => {
    if (booking.sessionId !== sessionId || (booking.status !== "pending" && booking.status !== "confirmed")) return booking
    const order = orders.find((item) => item.bookingId === booking.id)
    const paidFor = order ? !isUnpaid(order.status) : booking.status === "confirmed"
    if (order && order.status !== "processing") {
      const next = isUnpaid(order.status) ? advance(order, "cancelled", now) : advance(withRefund(order, 100), "refund-pending", now)
      if (next.status === "refund-pending") refundOrderIds.push(order.id)
      orders = replace(orders, next)
    }
    return { ...booking, status: "cancelled" as const, cancelledAt: now.toISOString(), ...(paidFor && { refundPercent: 100 }) }
  })
  return { ...state, bookings, orders, cancelledSessions: { ...state.cancelledSessions, [sessionId]: now.toISOString() }, outcome: { ok: true, refundOrderIds } }
}
