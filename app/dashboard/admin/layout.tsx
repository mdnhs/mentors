import type { Metadata } from "next"

import { RequireRole } from "@/components/auth/require-role"

export const metadata: Metadata = {
  title: "Admin",
}

// The workspace sits behind a client-side gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminLayout({ children }: LayoutProps<"/dashboard/admin">) {
  return <RequireRole role="admin">{children}</RequireRole>
}
