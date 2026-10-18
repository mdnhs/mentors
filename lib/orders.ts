import { refundAmount, type Quote } from "@/lib/pricing"

export type PaymentMethod = "bkash" | "nagad" | "card"

export type OrderStatus =
  | "awaiting-payment"
  | "processing"
  | "paid"
  | "confirmed"
  | "payment-failed"
  | "cancelled"
  | "refund-pending"
  | "refunded"

// "cancelled" may only reach "refund-pending" when a charge lands after the order was closed.
export const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
  "awaiting-payment": ["processing", "cancelled"],
  processing: ["paid", "payment-failed"],
  "payment-failed": ["processing", "cancelled"],
  paid: ["confirmed", "refund-pending"],
  confirmed: ["cancelled", "refund-pending"],
  cancelled: ["refund-pending"],
  "refund-pending": ["refunded"],
  refunded: [],
}

export type Transaction = {
  id: string
  kind: "charge" | "refund"
  amount: number
  currency: string
  status: "succeeded" | "failed"
  eventId: string
  at: string
  // Demo transactions never moved real money.
  simulated: boolean
}

export type Order = {
  id: string
  bookingId: string
  requestId: string
  mentorSlug: string
  title: string
  method: PaymentMethod
  quote: Quote
  status: OrderStatus
  createdAt: string
  updatedAt: string
  // The booking hold; an unpaid order closes when it passes.
  expiresAt: string
  refundPercent?: number
  refundAmount?: number
  history: { status: OrderStatus; at: string }[]
  transactions: Transaction[]
  // Provider event ids already applied, so redelivered webhooks change nothing.
  processedEvents: string[]
  // Made-up demo order, not a payment this learner made.
  sample?: true
}

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return orderTransitions[from].includes(to)
}

export function advance(order: Order, to: OrderStatus, now: Date): Order {
  if (!canTransition(order.status, to)) throw new Error(`Invalid order transition: ${order.status} -> ${to}`)
  const at = now.toISOString()
  return { ...order, status: to, updatedAt: at, history: [...order.history, { status: to, at }] }
}

export function isUnpaid(status: OrderStatus) {
  return status === "awaiting-payment" || status === "payment-failed"
}

export function newOrder(input: Pick<Order, "id" | "bookingId" | "requestId" | "mentorSlug" | "title" | "method" | "quote" | "expiresAt">, now: Date): Order {
  const at = now.toISOString()
  return { ...input, status: "awaiting-payment", createdAt: at, updatedAt: at, history: [{ status: "awaiting-payment", at }], transactions: [], processedEvents: [] }
}

export function withRefund(order: Order, percent: number): Order {
  return { ...order, refundPercent: percent, refundAmount: refundAmount(order.quote.total, percent) }
}

export type Ledger = {
  currency: string
  // What the learner paid, before any refund.
  grossBookingValue: number
  refunded: number
  // Platform revenue and mentor earnings are accrued from what was kept; neither is a payout.
  platformRevenue: number
  // The platform's two shares of platformRevenue: the learner-paid fee and the commission on the mentor's price.
  platformFee: number
  commission: number
  mentorEarnings: number
  // Only real payout transactions count, and this demo has none.
  paidOut: number
}

export function ledger(order: Order): Ledger {
  const sum = (kind: Transaction["kind"]) =>
    order.transactions.filter((item) => item.kind === kind && item.status === "succeeded").reduce((total, item) => total + item.amount, 0)
  const gross = sum("charge")
  const refunded = sum("refund")
  const retained = gross - refunded
  const mentorEarnings = gross === 0 ? 0 : Math.round((order.quote.mentorEarnings * retained) / order.quote.total)
  const commission = gross === 0 ? 0 : Math.min(Math.round((order.quote.mentorCommission * retained) / order.quote.total), retained - mentorEarnings)
  return {
    currency: order.quote.currency,
    grossBookingValue: gross,
    refunded,
    platformRevenue: retained - mentorEarnings,
    platformFee: retained - mentorEarnings - commission,
    commission,
    mentorEarnings,
    paidOut: 0,
  }
}

export function sumLedgers(orders: Order[], currency: string): Ledger {
  return orders
    .filter((order) => order.quote.currency === currency)
    .map(ledger)
    .reduce(
      (total, item) => ({
        currency,
        grossBookingValue: total.grossBookingValue + item.grossBookingValue,
        refunded: total.refunded + item.refunded,
        platformRevenue: total.platformRevenue + item.platformRevenue,
        platformFee: total.platformFee + item.platformFee,
        commission: total.commission + item.commission,
        mentorEarnings: total.mentorEarnings + item.mentorEarnings,
        paidOut: total.paidOut + item.paidOut,
      }),
      { currency, grossBookingValue: 0, refunded: 0, platformRevenue: 0, platformFee: 0, commission: 0, mentorEarnings: 0, paidOut: 0 }
    )
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  "awaiting-payment": "Awaiting payment",
  processing: "Payment processing",
  paid: "Paid",
  confirmed: "Booking confirmed",
  "payment-failed": "Payment failed",
  cancelled: "Cancelled",
  "refund-pending": "Refund pending",
  refunded: "Refunded",
}
