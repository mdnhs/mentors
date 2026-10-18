"use client"

import { useAuth } from "@/lib/auth"
import { getMentor } from "@/lib/data"
import { summarize } from "@/lib/mentor-finance"
import { mentorBookings } from "@/lib/mentor-dashboard"
import { actorFor, DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { useAppState, useManagedMentor, useNow } from "@/lib/store"

// One read of everything the workspace shows, so screens never re-derive money or bookings differently.
export function useMentorWorkspace() {
  const state = useAppState()
  const now = useNow()
  const auth = useAuth()
  const mentor = useManagedMentor(DEMO_MENTOR_SLUG) ?? getMentor(DEMO_MENTOR_SLUG)!
  const actor = auth.status === "signed-in" ? actorFor(auth.session.role) : null
  const bookings = mentorBookings(state, state.incoming, DEMO_MENTOR_SLUG, state.profile.name)
  const finance = {
    orders: [...state.orders, ...state.incoming.orders],
    bookings: [...state.bookings, ...state.incoming.bookings],
    payouts: state.payouts,
  }
  const summary = now ? summarize(finance, DEMO_MENTOR_SLUG, now) : null

  return { state, now, actor, mentor, bookings, finance, summary }
}
