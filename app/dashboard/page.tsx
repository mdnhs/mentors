import type { Metadata } from "next"

import { RequireSignIn } from "@/components/auth/require-sign-in"
import { DashboardGreeting, LearnerDashboard } from "@/components/dashboard/learner-dashboard"
import { WorkspaceLink } from "@/components/dashboard/workspace-link"
import { Container } from "@/components/site/container"

export const metadata: Metadata = {
  title: "My sessions",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function DashboardPage() {
  return (
    <Container className="max-w-5xl pt-8 pb-16 sm:pt-12 sm:pb-24">
      <RequireSignIn role="learner">
        <DashboardGreeting />
        <LearnerDashboard />
        <WorkspaceLink />
      </RequireSignIn>
    </Container>
  )
}
