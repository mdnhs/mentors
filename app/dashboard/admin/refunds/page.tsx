import type { Metadata } from "next"

import { RefundTracker } from "@/components/admin/refund-tracker"

export const metadata: Metadata = {
  title: "Refunds & disputes",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminRefundsPage() {
  return <RefundTracker />
}
