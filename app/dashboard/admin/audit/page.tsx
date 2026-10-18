import type { Metadata } from "next"

import { AuditLog } from "@/components/admin/audit-log"

export const metadata: Metadata = {
  title: "Audit log",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminAuditPage() {
  return <AuditLog />
}
