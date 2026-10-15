import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { BookingFlow } from "@/components/booking/booking-flow"
import { BackLink } from "@/components/site/back-link"
import { Container } from "@/components/site/container"
import { Skeleton } from "@/components/ui/skeleton"
import { getMentor, getMentors } from "@/lib/data"

export function generateStaticParams() {
  return getMentors().map((mentor) => ({ slug: mentor.slug }))
}

export async function generateMetadata({ params }: PageProps<"/mentors/[slug]/book">): Promise<Metadata> {
  const mentor = getMentor((await params).slug)
  return mentor ? { title: `Book ${mentor.name}` } : {}
}

export default function BookPage({ params }: PageProps<"/mentors/[slug]/book">) {
  return (
    <Container className="pt-6 pb-16 sm:pt-8 sm:pb-24">
      <Suspense fallback={<BookingSkeleton />}>
        <Booking params={params} />
      </Suspense>
    </Container>
  )
}

async function Booking({ params }: Pick<PageProps<"/mentors/[slug]/book">, "params">) {
  const mentor = getMentor((await params).slug)
  if (!mentor) notFound()

  return (
    <>
      <BackLink href={`/mentors/${mentor.slug}`}>Back to {mentor.name}</BackLink>
      <BookingFlow slug={mentor.slug} />
    </>
  )
}

function BookingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading booking">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-6 h-9 w-56" />
      <Skeleton className="mt-6 h-96 rounded-2xl lg:w-2/3" />
    </div>
  )
}
