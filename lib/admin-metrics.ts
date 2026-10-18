import { effectiveStatus } from "@/lib/booking-policy"
import { ledger, type Order } from "@/lib/orders"
import type { Booking, Mentor } from "@/lib/types"

// Operational metrics are derived from the same records the rest of the app reads — bookings, order
// transactions and the mentor catalogue — never from numbers an administrator types. Every record in this
// demo is flagged `sample`, so the UI labels these as demo figures and shows the real/sample split.

export type MetricSource = {
  bookings: Booking[]
  orders: Order[]
  mentors: Mentor[]
  // Mentors an administrator has suspended are not "active" even while their offers still exist.
  suspendedMentors?: ReadonlySet<string>
}

export type MetricCounts = {
  bookings: number
  sampleBookings: number
  orders: number
  sampleOrders: number
  completedBookings: number
  cancelledBookings: number
  refundedOrders: number
  paidOrders: number
  learners: number
  repeatLearners: number
}

export type BusinessMetrics = {
  completedBookings: number
  grossBookingValue: number
  refundedValue: number
  netBookingValue: number
  platformRevenue: number
  mentorEarnings: number
  // Cancelled bookings as a share of all bookings (0–1). Expired holds are not cancellations.
  cancellationRate: number
  // Refunded value as a share of gross booking value (0–1).
  refundRate: number
  // Learners with two or more bookings as a share of learners with at least one (0–1).
  repeatBookingRate: number
  activeMentors: number
  // Orders that took a payment as a share of orders started (0–1).
  bookingConversion: number
  counts: MetricCounts
  // True when every booking and order behind these figures is demo data.
  demoOnly: boolean
}

const rate = (part: number, whole: number) => (whole === 0 ? 0 : Math.max(0, Math.min(1, part / whole)))

// A learner identity to group repeat bookings by. Sample bookings from other learners carry a name; the
// signed-in account's own bookings are grouped under one key.
const learnerKey = (booking: Booking) => booking.learnerName ?? "__account__"

const isPaid = (order: Order) => order.transactions.some((item) => item.kind === "charge" && item.status === "succeeded")
const isRefunded = (order: Order) => order.transactions.some((item) => item.kind === "refund" && item.status === "succeeded")

export function businessMetrics(source: MetricSource, now: Date): BusinessMetrics {
  const { bookings, orders, mentors, suspendedMentors } = source

  const ledgers = orders.map(ledger)
  const grossBookingValue = ledgers.reduce((total, item) => total + item.grossBookingValue, 0)
  const refundedValue = ledgers.reduce((total, item) => total + item.refunded, 0)
  const platformRevenue = ledgers.reduce((total, item) => total + item.platformRevenue, 0)
  const mentorEarnings = ledgers.reduce((total, item) => total + item.mentorEarnings, 0)

  const statuses = bookings.map((booking) => effectiveStatus(booking, now))
  const completedBookings = statuses.filter((status) => status === "completed").length
  const cancelledBookings = statuses.filter((status) => status === "cancelled").length

  const byLearner = new Map<string, number>()
  for (const booking of bookings) {
    const key = learnerKey(booking)
    byLearner.set(key, (byLearner.get(key) ?? 0) + 1)
  }
  const learners = byLearner.size
  const repeatLearners = [...byLearner.values()].filter((count) => count >= 2).length

  const paidOrders = orders.filter(isPaid).length
  const activeMentors = mentors.filter((mentor) => !suspendedMentors?.has(mentor.slug) && mentor.offers.some((offer) => offer.status === "published")).length

  return {
    completedBookings,
    grossBookingValue,
    refundedValue,
    netBookingValue: grossBookingValue - refundedValue,
    platformRevenue,
    mentorEarnings,
    cancellationRate: rate(cancelledBookings, bookings.length),
    refundRate: rate(refundedValue, grossBookingValue),
    repeatBookingRate: rate(repeatLearners, learners),
    activeMentors,
    bookingConversion: rate(paidOrders, orders.length),
    counts: {
      bookings: bookings.length,
      sampleBookings: bookings.filter((booking) => booking.sample).length,
      orders: orders.length,
      sampleOrders: orders.filter((order) => order.sample).length,
      completedBookings,
      cancelledBookings,
      refundedOrders: orders.filter(isRefunded).length,
      paidOrders,
      learners,
      repeatLearners,
    },
    demoOnly: bookings.every((booking) => booking.sample) && orders.every((order) => order.sample),
  }
}

export const metricDefinitions: { id: keyof BusinessMetrics; label: string; detail: string; kind: "count" | "money" | "rate" }[] = [
  { id: "completedBookings", label: "Completed bookings", detail: "Bookings whose session time has passed, or reviews marked delivered.", kind: "count" },
  { id: "grossBookingValue", label: "Gross booking value", detail: "All successful charges, before refunds.", kind: "money" },
  { id: "netBookingValue", label: "Net booking value", detail: "Charges kept after successful refunds.", kind: "money" },
  { id: "platformRevenue", label: "Platform revenue", detail: "Learner-paid platform fee plus mentor commission on kept value.", kind: "money" },
  { id: "mentorEarnings", label: "Mentor earnings accrued", detail: "Mentors' share of kept value, before any payout.", kind: "money" },
  { id: "cancellationRate", label: "Cancellation rate", detail: "Cancelled bookings as a share of all bookings.", kind: "rate" },
  { id: "refundRate", label: "Refund rate", detail: "Refunded value as a share of gross booking value.", kind: "rate" },
  { id: "repeatBookingRate", label: "Repeat booking rate", detail: "Learners with two or more bookings, of those with at least one.", kind: "rate" },
  { id: "activeMentors", label: "Active mentors", detail: "Mentors with a published offer who are not suspended.", kind: "count" },
  { id: "bookingConversion", label: "Booking conversion", detail: "Orders that took a payment, of all orders started.", kind: "rate" },
]
