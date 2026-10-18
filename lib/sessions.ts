import { holdsSlot } from "@/lib/availability"
import { getMeetingDetails, type MeetingDetails } from "@/lib/data/session-meetings"
import type { Booking, GroupSession } from "@/lib/types"

const MINUTE_MS = 60_000
export const MEETING_OPENS_MINUTES = 30

export type Cancellations = Record<string, string>

export function applyCancellation(session: GroupSession, cancellations: Cancellations): GroupSession {
  if (session.status === "cancelled" || !cancellations[session.id]) return session
  return { ...session, status: "cancelled", cancellationReason: session.cancellationReason ?? "The mentor cancelled this session." }
}

export type SessionOverrides = { cancelledSessions: Cancellations; sessionCapacity: Record<string, number> }

// A session as learners see it: with any mentor cancellation or capacity change applied.
export function resolveSession(session: GroupSession, overrides: SessionOverrides): GroupSession {
  const cancelled = applyCancellation(session, overrides.cancelledSessions)
  const total = overrides.sessionCapacity[session.id]
  return total === undefined ? cancelled : { ...cancelled, seats: { ...cancelled.seats, total } }
}

export function registrationDeadline(session: GroupSession) {
  return session.registrationClosesAt ?? session.startsAt
}

export const sessionEnd = (session: GroupSession) => new Date(session.startsAt).getTime() + session.durationMinutes * MINUTE_MS

export type SessionPhase = "scheduled" | "cancelled" | "completed"

export function sessionPhase(session: GroupSession, now: Date): SessionPhase {
  if (session.status === "cancelled") return "cancelled"
  return sessionEnd(session) <= now.getTime() ? "completed" : "scheduled"
}

// Seats other learners hold plus this learner's own booking, so a pending hold counts until it expires.
export function seatsTaken(session: GroupSession, bookings: Booking[], now: Date) {
  const own = bookings.filter((booking) => booking.sessionId === session.id && holdsSlot(booking, now)).length
  return Math.min(session.seats.taken + own, session.seats.total)
}

export const seatsLeft = (session: GroupSession, bookings: Booking[], now: Date) => session.seats.total - seatsTaken(session, bookings, now)

export function ownEnrollment(session: GroupSession, bookings: Booking[]) {
  return bookings.find((booking) => booking.sessionId === session.id && booking.status !== "cancelled" && booking.status !== "expired")
}

export type EnrollmentBlock = "cancelled" | "ended" | "closed" | "full" | "enrolled"

export type EnrollmentCheck = { open: true } | { open: false; reason: EnrollmentBlock; message: string }

const blocked = (reason: EnrollmentBlock, message: string): EnrollmentCheck => ({ open: false, reason, message })

// `seats.taken` is the other learners' seats, so only this learner's own booking is added to it.
export function checkEnrollment(session: GroupSession, bookings: Booking[], now: Date): EnrollmentCheck {
  if (session.status === "cancelled") return blocked("cancelled", "This session was cancelled.")
  if (new Date(session.startsAt) <= now) return blocked("ended", "This session has already started.")
  if (new Date(registrationDeadline(session)) <= now) return blocked("closed", "Registration for this session has closed.")
  if (bookings.some((booking) => booking.sessionId === session.id && holdsSlot(booking, now))) {
    return blocked("enrolled", "You already have a seat in this session.")
  }
  if (seatsLeft(session, bookings, now) <= 0) return blocked("full", "This session is fully booked.")
  return { open: true }
}

export type LearnerState = "none" | "pending" | "enrolled" | "cancelled" | "completed"

export function learnerState(session: GroupSession, bookings: Booking[], now: Date): LearnerState {
  const mine = bookings.filter((booking) => booking.sessionId === session.id)
  if (mine.some((booking) => booking.status === "confirmed")) return sessionPhase(session, now) === "completed" ? "completed" : "enrolled"
  if (mine.some((booking) => booking.status === "completed")) return "completed"
  if (mine.some((booking) => holdsSlot(booking, now))) return "pending"
  if (mine.some((booking) => booking.status === "cancelled")) return "cancelled"
  return "none"
}

export type MeetingAccess =
  | { access: "granted"; details: MeetingDetails }
  | { access: "locked"; opensAt: string }
  | { access: "denied"; reason: "not-enrolled" | "cancelled" | "ended" }

// Only a confirmed attendee sees the link, from shortly before the start until the session ends.
export function meetingAccess(session: GroupSession, bookings: Booking[], now: Date): MeetingAccess {
  if (session.status === "cancelled") return { access: "denied", reason: "cancelled" }
  const confirmed = bookings.some((booking) => booking.sessionId === session.id && (booking.status === "confirmed" || booking.status === "completed"))
  if (!confirmed) return { access: "denied", reason: "not-enrolled" }
  if (sessionEnd(session) <= now.getTime()) return { access: "denied", reason: "ended" }
  const opensAt = new Date(new Date(session.startsAt).getTime() - MEETING_OPENS_MINUTES * MINUTE_MS)
  if (now < opensAt) return { access: "locked", opensAt: opensAt.toISOString() }
  return { access: "granted", details: getMeetingDetails(session.id) }
}
