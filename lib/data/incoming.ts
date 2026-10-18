import type { Order } from "@/lib/orders"
import { quote } from "@/lib/pricing"
import type { Booking } from "@/lib/types"

// Sample bookings other learners made with the demo mentor, with simulated orders to match.
// Everything is flagged `sample` so it is never shown as real activity.
const sample = (id: string, booking: Omit<Booking, "id" | "sample" | "status" | "total" | "timezone">, status: Booking["status"], price: number, createdAt: string): { booking: Booking; order: Order } => {
  const q = quote(price)
  const orderId = `ORD-${id.toUpperCase()}`
  return {
    booking: { ...booking, id, status, total: q.total, timezone: "Asia/Dhaka", sample: true, createdAt },
    order: {
      id: orderId,
      bookingId: id,
      requestId: `req-${id}`,
      mentorSlug: booking.mentorSlug,
      title: booking.title,
      method: "bkash",
      quote: q,
      status: "confirmed",
      createdAt,
      updatedAt: createdAt,
      expiresAt: createdAt,
      history: [
        { status: "awaiting-payment", at: createdAt },
        { status: "processing", at: createdAt },
        { status: "paid", at: createdAt },
        { status: "confirmed", at: createdAt },
      ],
      transactions: [{ id: `${orderId}-1`, kind: "charge", amount: q.total, currency: q.currency, status: "succeeded", eventId: `sample-${id}`, at: createdAt, simulated: true }],
      processedEvents: [`sample-${id}`],
      sample: true,
    },
  }
}

const rows = [
  sample("ib-1", { kind: "one-on-one", mentorSlug: "tanvir-rahman", offerId: "tanvir-mock", title: "System design mock interview", date: "2026-10-08T19:00:00+06:00", durationMinutes: 60, learnerName: "Anika Rahman", note: "Preparing for a staff-level system design loop next month." }, "confirmed", 3000, "2026-10-01T09:00:00Z"),
  sample("ib-2", { kind: "one-on-one", mentorSlug: "tanvir-rahman", offerId: "tanvir-career", title: "Career strategy call", date: "2026-10-12T20:00:00+06:00", durationMinutes: 45, learnerName: "Imtiaz Hossain", note: "Deciding between a promotion and a move to Singapore." }, "confirmed", 2000, "2026-10-05T09:00:00Z"),
  sample("ib-3", { kind: "one-on-one", mentorSlug: "tanvir-rahman", offerId: "tanvir-mock", title: "System design mock interview", date: "2026-10-26T20:00:00+08:00", durationMinutes: 60, learnerName: "Nabila Karim", note: "Want feedback on how I structure trade-offs when designing a payments service." }, "confirmed", 3000, "2026-10-15T09:00:00Z"),
]

export const incomingBookings: Booking[] = rows.map((row) => row.booking)
export const incomingOrders: Order[] = rows.map((row) => row.order)
