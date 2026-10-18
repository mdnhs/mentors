import type { Metadata } from "next"

import { EarningsView } from "@/components/mentor/earnings-view"

export const metadata: Metadata = { title: "Earnings" }

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function EarningsPage() {
  return <EarningsView />
}
