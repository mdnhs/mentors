import { bookingEnd } from "@/lib/availability"
import { getMentor } from "@/lib/data"
import type { Booking, BookingStatus, CancellationPolicy } from "@/lib/types"

const HOUR_MS = 60 * 60_000

type PolicyRule = {
  // Cancelling at least this long before the start earns the full refund.
  fullRefundHours: number
  lateRefundPercent: number
  // Null means the booking can't be moved.
  rescheduleHours: number | null
  maxReschedules: number
}

export const policyRules: Record<CancellationPolicy, PolicyRule> = {
  flexible: { fullRefundHours: 24, lateRefundPercent: 0, rescheduleHours: 24, maxReschedules: 1 },
  standard: { fullRefundHours: 48, lateRefundPercent: 50, rescheduleHours: 48, maxReschedules: 1 },
  group: { fullRefundHours: 24, lateRefundPercent: 0, rescheduleHours: null, maxReschedules: 0 },
  review: { fullRefundHours: 0, lateRefundPercent: 100, rescheduleHours: null, maxReschedules: 0 },
  monthly: { fullRefundHours: 0, lateRefundPercent: 0, rescheduleHours: 24, maxReschedules: 1 },
}

export function policyFor(booking: Booking): CancellationPolicy {
  if (booking.cancellation) return booking.cancellation
  const offer = getMentor(booking.mentorSlug)?.offers.find((item) => item.id === booking.offerId)
  if (offer) return offer.cancellation
  return booking.kind === "group" ? "group" : booking.kind === "review" ? "review" : "standard"
}

// Statuses are stored as they were last set; time-based changes are derived here.
export function effectiveStatus(booking: Booking, now: Date): BookingStatus {
  if (booking.status === "pending" && booking.expiresAt && new Date(booking.expiresAt) <= now) return "expired"
  if (booking.status === "confirmed" && booking.kind !== "review" && bookingEnd(booking) <= now.getTime()) return "completed"
  return booking.status
}

export type CancelDecision = { allowed: true; refundPercent: number } | { allowed: false; reason: string }

export function cancelDecision(booking: Booking, now: Date): CancelDecision {
  const status = effectiveStatus(booking, now)
  if (status !== "pending" && status !== "confirmed" && status !== "in-review") {
    return { allowed: false, reason: `A ${status} booking can't be cancelled.` }
  }
  // Nothing has been paid for a pending hold, so there is nothing to refund.
  if (status === "pending") return { allowed: true, refundPercent: 0 }
  const rule = policyRules[policyFor(booking)]
  if (booking.kind === "review") {
    if (now.getTime() >= new Date(booking.date).getTime()) return { allowed: false, reason: "This review's due date has passed, so it can no longer be cancelled." }
    return { allowed: true, refundPercent: rule.lateRefundPercent }
  }
  const hoursLeft = (new Date(booking.date).getTime() - now.getTime()) / HOUR_MS
  if (hoursLeft <= 0) return { allowed: false, reason: "This session has already started." }
  return { allowed: true, refundPercent: hoursLeft >= rule.fullRefundHours ? 100 : rule.lateRefundPercent }
}

export type RescheduleDecision = { allowed: true } | { allowed: false; reason: string }

export function rescheduleDecision(booking: Booking, now: Date): RescheduleDecision {
  const status = effectiveStatus(booking, now)
  if (status !== "confirmed") return { allowed: false, reason: "Only confirmed sessions can be rescheduled." }
  if (booking.kind === "review" || booking.kind === "group") return { allowed: false, reason: "This booking can't be moved to another time." }
  const rule = policyRules[policyFor(booking)]
  if (rule.rescheduleHours === null) return { allowed: false, reason: "This booking can't be rescheduled." }
  if ((booking.rescheduleCount ?? 0) >= rule.maxReschedules) {
    return { allowed: false, reason: "This session has already been rescheduled once." }
  }
  const hoursLeft = (new Date(booking.date).getTime() - now.getTime()) / HOUR_MS
  if (hoursLeft < rule.rescheduleHours) {
    return { allowed: false, reason: `Rescheduling closes ${rule.rescheduleHours} hours before the call.` }
  }
  return { allowed: true }
}

export function isActive(status: BookingStatus) {
  return status === "pending" || status === "confirmed" || status === "in-review"
}
