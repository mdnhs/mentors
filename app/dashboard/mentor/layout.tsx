import type { Metadata } from "next"

import { RequireRole } from "@/components/auth/require-role"
import { UnsavedChangesDialog } from "@/components/mentor/unsaved-guard"

export const metadata: Metadata = {
  title: "Mentor workspace",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function MentorLayout({ children }: LayoutProps<"/dashboard/mentor">) {
  return (
    <RequireRole role="mentor">
      {children}
      <UnsavedChangesDialog />
    </RequireRole>
  )
}
