import { effectiveStatus } from "@/lib/booking-policy"
import { canManageMentor, FORBIDDEN, type Actor } from "@/lib/permissions"
import { ledger, sumLedgers, type Order } from "@/lib/orders"
import type { Booking } from "@/lib/types"

export const MIN_PAYOUT = 500

export type Payout = {
  id: string
  mentorSlug: string
  amount: number
  currency: string
  status: "pending" | "paid"
  requestedAt: string
  paidAt?: string
  // Demo payouts never move real money.
  simulated: true
}

export type FinanceData = { orders: Order[]; bookings: Booking[]; payouts: Payout[] }

export type FinanceSummary = {
  currency: string
  grossBookingValue: number
  refunded: number
  platformFee: number
  commission: number
  // Earned on paid bookings so far, including sessions that haven't happened yet.
  estimatedEarnings: number
  // Earned on completed sessions and not already requested or paid out.
  availableForPayout: number
  pendingPayouts: number
  paidOut: number
  completedBookings: number
}

const mine = (orders: Order[], slug: string) => orders.filter((order) => order.mentorSlug === slug)

// Everything here is read from order transactions and payout records, never from numbers a mentor can type.
export function summarize(data: FinanceData, slug: string, now: Date, currency = "BDT"): FinanceSummary {
  const orders = mine(data.orders, slug)
  const books = sumLedgers(orders, currency)
  const completedIds = new Set(data.bookings.filter((booking) => effectiveStatus(booking, now) === "completed").map((booking) => booking.id))
  const completedOrders = orders.filter((order) => completedIds.has(order.bookingId) && order.quote.currency === currency)
  const earnedOnCompleted = sumLedgers(completedOrders, currency).mentorEarnings

  const payouts = data.payouts.filter((payout) => payout.mentorSlug === slug && payout.currency === currency)
  const sum = (status: Payout["status"]) => payouts.filter((payout) => payout.status === status).reduce((total, payout) => total + payout.amount, 0)
  const pendingPayouts = sum("pending")
  const paidOut = sum("paid")

  return {
    currency,
    grossBookingValue: books.grossBookingValue,
    refunded: books.refunded,
    platformFee: books.platformFee,
    commission: books.commission,
    estimatedEarnings: books.mentorEarnings,
    availableForPayout: Math.max(earnedOnCompleted - pendingPayouts - paidOut, 0),
    pendingPayouts,
    paidOut,
    completedBookings: completedOrders.length,
  }
}

export type PayoutFailure = "forbidden" | "invalid-amount" | "insufficient" | "not-found" | "invalid-state"

export type PayoutResult =
  | { ok: true; payouts: Payout[]; payout: Payout }
  | { ok: false; code: PayoutFailure; message: string }

const refuse = (code: PayoutFailure, message: string): PayoutResult => ({ ok: false, code, message })

export function requestPayout(actor: Actor | null, slug: string, data: FinanceData, input: { id: string; amount?: number }, now: Date): PayoutResult {
  if (!canManageMentor(actor, slug)) return refuse("forbidden", FORBIDDEN)
  const summary = summarize(data, slug, now)
  const amount = input.amount ?? summary.availableForPayout
  if (!Number.isSafeInteger(amount) || amount < MIN_PAYOUT) return refuse("invalid-amount", `The smallest payout is ৳${MIN_PAYOUT}.`)
  if (amount > summary.availableForPayout) return refuse("insufficient", "That is more than your available balance.")
  if (data.payouts.some((payout) => payout.id === input.id)) return refuse("invalid-state", "That payout was already requested.")
  const payout: Payout = { id: input.id, mentorSlug: slug, amount, currency: summary.currency, status: "pending", requestedAt: now.toISOString(), simulated: true }
  return { ok: true, payouts: [payout, ...data.payouts], payout }
}

// The demo stand-in for the payment provider confirming a transfer. Paid payouts can't be changed again.
export function settlePayout(actor: Actor | null, slug: string, payouts: Payout[], id: string, now: Date): PayoutResult {
  if (!canManageMentor(actor, slug)) return refuse("forbidden", FORBIDDEN)
  const payout = payouts.find((item) => item.id === id && item.mentorSlug === slug)
  if (!payout) return refuse("not-found", "We couldn't find that payout.")
  if (payout.status !== "pending") return refuse("invalid-state", "This payout is already paid.")
  const paid: Payout = { ...payout, status: "paid", paidAt: now.toISOString() }
  return { ok: true, payouts: payouts.map((item) => (item.id === id ? paid : item)), payout: paid }
}

export type StatementLine = {
  id: string
  at: string
  kind: "charge" | "refund" | "payout-requested" | "payout-paid"
  label: string
  // Money in or out of the learner's payment for charges and refunds, or out of the mentor's balance for payouts.
  amount: number
  // How the line moved the mentor's estimated earnings; payouts move none, they only settle them.
  earningsEffect: number
}

// An audit trail that can be recomputed from stored records: charges, refund adjustments and payouts.
export function statement(data: Pick<FinanceData, "orders" | "payouts">, slug: string): StatementLine[] {
  const lines: StatementLine[] = []
  for (const order of mine(data.orders, slug)) {
    const earningsAfter = ledger(order).mentorEarnings
    for (const transaction of order.transactions) {
      if (transaction.status !== "succeeded") continue
      lines.push({
        id: transaction.id,
        at: transaction.at,
        kind: transaction.kind,
        label: order.title,
        amount: transaction.kind === "charge" ? transaction.amount : -transaction.amount,
        earningsEffect: transaction.kind === "charge" ? order.quote.mentorEarnings : earningsAfter - order.quote.mentorEarnings,
      })
    }
  }
  for (const payout of data.payouts.filter((item) => item.mentorSlug === slug)) {
    lines.push({ id: `${payout.id}-requested`, at: payout.requestedAt, kind: "payout-requested", label: `Payout ${payout.id}`, amount: -payout.amount, earningsEffect: 0 })
    if (payout.paidAt) lines.push({ id: `${payout.id}-paid`, at: payout.paidAt, kind: "payout-paid", label: `Payout ${payout.id}`, amount: -payout.amount, earningsEffect: 0 })
  }
  return lines.sort((a, b) => b.at.localeCompare(a.at))
}
