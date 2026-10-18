import type { Metadata } from "next"

import { BookingManager } from "@/components/admin/booking-manager"

export const metadata: Metadata = {
  title: "Bookings",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminBookingsPage() {
  return <BookingManager />
}
