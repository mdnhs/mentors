import type { Metadata } from "next"

import { RequireSignIn } from "@/components/auth/require-sign-in"
import { SettingsPanel } from "@/components/dashboard/settings-panel"
import { BackLink } from "@/components/site/back-link"
import { Container } from "@/components/site/container"

export const metadata: Metadata = {
  title: "Settings",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function SettingsPage() {
  return (
    <Container className="max-w-5xl pt-6 pb-16 sm:pt-8 sm:pb-24">
      <BackLink href="/dashboard">My sessions</BackLink>
      <h1 className="mt-4 text-title">Settings</h1>
      <RequireSignIn>
        <SettingsPanel />
      </RequireSignIn>
    </Container>
  )
}
