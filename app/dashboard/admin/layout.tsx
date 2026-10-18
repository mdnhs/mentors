import type { Metadata } from "next"

import { AdminShell } from "@/components/admin/admin-shell"
import { RequireRole } from "@/components/auth/require-role"
import { Container } from "@/components/site/container"

export const metadata: Metadata = {
  title: "Admin",
}

// The workspace sits behind a client-side gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminLayout({ children }: LayoutProps<"/dashboard/admin">) {
  return (
    <Container className="max-w-6xl pt-8 pb-16 sm:pt-12 sm:pb-24">
      <RequireRole role="admin">
        <AdminShell>{children}</AdminShell>
      </RequireRole>
    </Container>
  )
}
