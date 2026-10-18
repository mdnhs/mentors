import type { Metadata } from "next"

import { RequireSignIn } from "@/components/auth/require-sign-in"
import { LearnerOverview } from "@/components/dashboard/learner-overview"

export const metadata: Metadata = {
  title: "Overview",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function DashboardPage() {
  return (
    <RequireSignIn role="learner">
      <LearnerOverview />
    </RequireSignIn>
  )
}
