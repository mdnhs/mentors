import type { Metadata } from "next"

import { AvailabilityEditor } from "@/components/mentor/availability-editor"

export const metadata: Metadata = { title: "Availability" }

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AvailabilityPage() {
  return <AvailabilityEditor />
}
