"use client"

import { resolveSession, checkEnrollment, learnerState, seatsLeft, sessionPhase } from "@/lib/sessions"
import { useAppState, useNow } from "@/lib/store"
import type { GroupSession } from "@/lib/types"

// Before the clock is known (server render), time-based rules are skipped so markup matches on hydration.
export function useSessionView(base: GroupSession) {
  const { bookings, orders, cancelledSessions, sessionCapacity } = useAppState()
  const clock = useNow()
  const now = clock ?? new Date(0)
  const session = resolveSession(base, { cancelledSessions, sessionCapacity })

  return {
    session,
    bookings,
    orders,
    now,
    phase: clock ? sessionPhase(session, clock) : session.status === "cancelled" ? ("cancelled" as const) : ("scheduled" as const),
    left: seatsLeft(session, bookings, now),
    check: checkEnrollment(session, bookings, now),
    learner: learnerState(session, bookings, now),
  }
}

export type SessionView = ReturnType<typeof useSessionView>
