import type { Metadata } from "next"

import { SessionExplorer } from "@/components/sessions/session-explorer"
import { Container } from "@/components/site/container"

export const metadata: Metadata = {
  title: "Live group sessions",
}

export default function SessionsPage() {
  return (
    <Container className="pt-8 pb-16 sm:pt-12 sm:pb-24">
      <h1 className="text-title">Live group sessions</h1>
      <p className="mt-2 text-muted-foreground">Learn with others, ask questions live, pay for just one seat.</p>
      <SessionExplorer />
    </Container>
  )
}
