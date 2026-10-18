import type { Metadata } from "next"

import { RequireSignIn } from "@/components/auth/require-sign-in"
import { LearnerBookings } from "@/components/dashboard/learner-bookings"

export const metadata: Metadata = {
  title: "Bookings",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function BookingsPage() {
  return (
    <RequireSignIn role="learner">
      <LearnerBookings />
    </RequireSignIn>
  )
}
