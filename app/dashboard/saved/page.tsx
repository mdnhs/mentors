import type { Metadata } from "next"

import { RequireSignIn } from "@/components/auth/require-sign-in"
import { SavedMentors } from "@/components/dashboard/saved-mentors"

export const metadata: Metadata = {
  title: "Saved mentors",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function SavedPage() {
  return (
    <RequireSignIn role="learner">
      <SavedMentors />
    </RequireSignIn>
  )
}
