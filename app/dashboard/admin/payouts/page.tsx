import type { Metadata } from "next"

import { PayoutCenter } from "@/components/admin/payout-center"

export const metadata: Metadata = {
  title: "Payouts",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminPayoutsPage() {
  return <PayoutCenter />
}
