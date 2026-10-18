import { effectiveStatus, isActive } from "@/lib/booking-policy"
import type { MentorBooking, MentorTask } from "@/lib/mentor-dashboard"
import type { MonthlyEarnings } from "@/lib/mentor-finance"
import type { BookingStatus, GroupSession } from "@/lib/types"

export const MENTOR_BOOKINGS_HREF = "/dashboard/mentor/bookings"

export type StatusTone = "success" | "accent" | "warning" | "danger" | "neutral"

export const bookingTone: Record<BookingStatus, StatusTone> = {
  completed: "success",
  confirmed: "accent",
  pending: "warning",
  "in-review": "warning",
  cancelled: "neutral",
  expired: "neutral",
}

// Booking lists moved off the overview, so tasks that pointed at its #bookings anchor now open the Bookings page.
export function withBookingsPage(tasks: MentorTask[]): MentorTask[] {
  return tasks.map((task) => (task.href.startsWith("#") ? { ...task, href: MENTOR_BOOKINGS_HREF } : task))
}

export type MonthTrend = { current: number; previous: number; delta: number | null; trend: number[] }

// This month against last month; no delta when last month had nothing to compare with.
export function monthTrend(monthly: MonthlyEarnings[]): MonthTrend {
  const trend = monthly.map((item) => item.earnings)
  const current = trend.at(-1) ?? 0
  const previous = trend.at(-2) ?? 0
  return { current, previous, delta: previous > 0 ? (current - previous) / previous : null, trend }
}

// Active and completed bookings per offer, so the catalogue shows which offers learners actually book.
export function bookingsPerOffer(items: MentorBooking[], now: Date): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const { booking } of items) {
    const status = effectiveStatus(booking, now)
    if (!booking.offerId || !(isActive(status) || status === "completed")) continue
    counts[booking.offerId] = (counts[booking.offerId] ?? 0) + 1
  }
  return counts
}

export function seatShare(taken: number, total: number) {
  if (total <= 0) return 0
  return Math.min(Math.max(taken / total, 0), 1)
}

export type GroupSplit = { upcoming: GroupSession[]; past: GroupSession[] }

export function splitSessions(sessions: GroupSession[], now: Date): GroupSplit {
  const upcoming = sessions.filter((session) => session.status !== "cancelled" && new Date(session.startsAt) > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const past = sessions.filter((session) => !upcoming.includes(session)).sort((a, b) => b.startsAt.localeCompare(a.startsAt))
  return { upcoming, past }
}

export type PayoutInput = { ok: true; amount: number } | { ok: false; message: string }

// Mirrors requestPayout's rules so the form can explain a bad amount before the confirmation opens; blank means everything available.
export function parsePayoutInput(input: string, available: number, minimum: number): PayoutInput {
  const trimmed = input.trim()
  if (trimmed !== "" && !/^\d+$/.test(trimmed)) return { ok: false, message: "Enter the amount in whole taka." }
  const amount = trimmed === "" ? available : Number(trimmed)
  if (amount < minimum) return { ok: false, message: trimmed === "" ? `You need at least ৳${minimum} ready to pay out.` : `The smallest payout is ৳${minimum}.` }
  if (amount > available) return { ok: false, message: "That is more than your available balance." }
  return { ok: true, amount }
}
