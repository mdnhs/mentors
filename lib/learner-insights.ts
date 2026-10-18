import { effectiveStatus } from "@/lib/booking-policy"
import { bookingHref } from "@/lib/dashboard"
import { timezoneCity } from "@/lib/format"
import type { Order, OrderStatus } from "@/lib/orders"
import { timeKeyInZone } from "@/lib/timezone"
import type { ActionItem, Booking, BookingNotes, BookingStatus } from "@/lib/types"

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger"

export const bookingTone: Record<BookingStatus, BadgeTone> = {
  pending: "warning",
  confirmed: "accent",
  "in-review": "warning",
  completed: "success",
  cancelled: "neutral",
  expired: "neutral",
}

export const orderTone: Record<OrderStatus, BadgeTone> = {
  "awaiting-payment": "warning",
  processing: "warning",
  paid: "success",
  confirmed: "success",
  "payment-failed": "danger",
  cancelled: "neutral",
  "refund-pending": "warning",
  refunded: "danger",
}

export function greeting(now: Date, timeZone: string) {
  const hour = Number(timeKeyInZone(now.getTime(), timeZone).slice(0, 2))
  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 17) return "Good afternoon"
  return "Good evening"
}

export const zoneName = (timeZone: string) => `${timezoneCity(timeZone)} time`

export type OpenStep = { booking: Booking; item: ActionItem }

const byNewest = (bookings: Booking[]) => [...bookings].sort((a, b) => b.date.localeCompare(a.date))

// Steps still to do across every session's plan, newest session first.
export function openSteps(bookings: Booking[], notes: Record<string, BookingNotes>): OpenStep[] {
  return byNewest(bookings).flatMap((booking) => (notes[booking.id]?.actions ?? []).filter((item) => !item.done).map((item) => ({ booking, item })))
}

export function stepProgress(notes?: BookingNotes) {
  const total = notes?.actions.length ?? 0
  const done = notes?.actions.filter((item) => item.done).length ?? 0
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function notedBookings(bookings: Booking[], notes: Record<string, BookingNotes>) {
  return byNewest(bookings).filter((booking) => {
    const entry = notes[booking.id]
    return Boolean(entry && (entry.summary || entry.actions.length > 0 || entry.personal.trim()))
  })
}

export type PaymentEvent = { id: string; bookingId: string; title: string; at: string; status: OrderStatus; label: string; amount?: number; currency: string }

const eventLabels: Partial<Record<OrderStatus, string>> = {
  confirmed: "Paid",
  "payment-failed": "Payment failed",
  cancelled: "Cancelled",
  "refund-pending": "Refund pending",
  refunded: "Refunded",
}

// Money moments from each order's history, newest first.
export function paymentActivity(orders: Order[], bookings: Booking[], limit = 5): PaymentEvent[] {
  const titles = new Map(bookings.map((booking) => [booking.id, booking.title]))
  const events: PaymentEvent[] = []
  for (const order of orders) {
    for (const step of order.history) {
      const label = eventLabels[step.status]
      if (!label) continue
      const refund = step.status === "refund-pending" || step.status === "refunded"
      events.push({
        id: `${order.id}-${step.status}-${step.at}`,
        bookingId: order.bookingId,
        title: titles.get(order.bookingId) ?? order.title,
        at: step.at,
        status: step.status,
        label,
        amount: step.status === "cancelled" ? undefined : refund ? order.refundAmount : order.quote.total,
        currency: order.quote.currency,
      })
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

export function weekEvents(upcoming: Booking[], now: Date) {
  return upcoming
    .filter((booking) => booking.kind !== "review")
    .map((booking) => ({ id: booking.id, startsAt: booking.date, title: booking.title, href: bookingHref(booking), muted: effectiveStatus(booking, now) !== "confirmed" }))
}

export function completedCount(bookings: Booking[], now: Date) {
  return bookings.filter((booking) => effectiveStatus(booking, now) === "completed").length
}
