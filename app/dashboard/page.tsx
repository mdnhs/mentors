import type { Metadata } from "next"
import Link from "next/link"

import { DashboardGreeting, LearnerDashboard } from "@/components/dashboard/learner-dashboard"
import { Container } from "@/components/site/container"

export const metadata: Metadata = {
  title: "My sessions",
}

export default function DashboardPage() {
  return (
    <Container className="max-w-5xl pt-8 pb-16 sm:pt-12 sm:pb-24">
      <DashboardGreeting />
      <LearnerDashboard />
      <p className="mt-12 text-sm text-muted-foreground">
        Are you a mentor?{" "}
        <Link href="/dashboard/mentor" className="link">
          Open the mentor dashboard
        </Link>
      </p>
    </Container>
  )
}
