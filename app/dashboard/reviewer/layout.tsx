import type { Metadata } from "next"

import { RequireRole } from "@/components/auth/require-role"

export const metadata: Metadata = {
  title: "Applications",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function ReviewerLayout({ children }: LayoutProps<"/dashboard/reviewer">) {
  return <RequireRole role="reviewer">{children}</RequireRole>
}
