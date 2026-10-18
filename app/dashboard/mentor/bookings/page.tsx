import type { Metadata } from "next"

import { MentorBookings } from "@/components/mentor/mentor-bookings"

export const metadata: Metadata = { title: "Bookings" }

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function MentorBookingsPage() {
  return <MentorBookings />
}
