import type { Metadata } from "next"

import { AdminOverview } from "@/components/admin/admin-overview"

export const metadata: Metadata = {
  title: "Admin overview",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminOverviewPage() {
  return <AdminOverview />
}
