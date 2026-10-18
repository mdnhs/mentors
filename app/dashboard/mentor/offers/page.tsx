import type { Metadata } from "next"

import { OffersManager } from "@/components/mentor/offers-manager"

export const metadata: Metadata = { title: "Offers" }

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function OffersPage() {
  return <OffersManager />
}
