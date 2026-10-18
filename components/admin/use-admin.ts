"use client"

import { useAppState } from "@/lib/store"
import type { AdminSource } from "@/lib/admin-selectors"

// Flattens the store into the shape the admin selectors expect, so each module reads one object.
export function useAdminSource(): AdminSource {
  const state = useAppState()
  return {
    bookings: state.bookings,
    orders: state.orders,
    incoming: state.incoming,
    payouts: state.payouts,
    applications: state.applications,
    admin: state.admin,
    profile: state.profile,
    workspace: state.workspace,
  }
}
