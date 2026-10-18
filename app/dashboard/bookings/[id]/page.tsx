import type { Metadata } from "next"
import { Suspense } from "react"

import { RequireSignIn } from "@/components/auth/require-sign-in"
import { BookingDetail } from "@/components/dashboard/booking-detail"
import { BackLink } from "@/components/site/back-link"
import { Container } from "@/components/site/container"
import { Skeleton } from "@/components/ui/skeleton"
import { demoBookings } from "@/lib/data/bookings"

export const metadata: Metadata = {
  title: "Booking details",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

// Bookings are looked up in the browser, so other ids render on demand; these just give the build a path to prerender.
export function generateStaticParams() {
  return demoBookings.map((booking) => ({ id: booking.id }))
}

export default function BookingDetailPage({ params }: PageProps<"/dashboard/bookings/[id]">) {
  return (
    <Container className="max-w-5xl pt-6 pb-16 sm:pt-8 sm:pb-24">
      <BackLink href="/dashboard">My sessions</BackLink>
      <RequireSignIn role="learner">
        <Suspense fallback={<Skeleton className="mt-6 h-64 rounded-2xl" />}>
          <Detail params={params} />
        </Suspense>
      </RequireSignIn>
    </Container>
  )
}

async function Detail({ params }: Pick<PageProps<"/dashboard/bookings/[id]">, "params">) {
  return <BookingDetail id={(await params).id} />
}
