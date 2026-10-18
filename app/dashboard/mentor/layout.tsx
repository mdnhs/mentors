import type { Metadata } from "next"

import { RequireRole } from "@/components/auth/require-role"
import { MentorShell } from "@/components/mentor/mentor-shell"
import { Container } from "@/components/site/container"

export const metadata: Metadata = {
  title: "Mentor workspace",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function MentorLayout({ children }: LayoutProps<"/dashboard/mentor">) {
  return (
    <Container className="max-w-5xl pt-8 pb-16 sm:pt-12 sm:pb-24">
      <RequireRole role="mentor">
        <MentorShell>{children}</MentorShell>
      </RequireRole>
    </Container>
  )
}
