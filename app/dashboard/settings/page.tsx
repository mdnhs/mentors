import type { Metadata } from "next"

import { RequireSignIn } from "@/components/auth/require-sign-in"
import { SettingsPanel } from "@/components/dashboard/settings-panel"

export const metadata: Metadata = {
  title: "Settings",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function SettingsPage() {
  return (
    <RequireSignIn>
      <SettingsPanel />
    </RequireSignIn>
  )
}
