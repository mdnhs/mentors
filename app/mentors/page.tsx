import type { Metadata } from "next"
import { Suspense } from "react"

import { MentorExplorer } from "@/components/mentors/mentor-explorer"
import { MentorGridSkeleton } from "@/components/mentors/mentor-grid-skeleton"
import { Container } from "@/components/site/container"
import { site } from "@/lib/site"

const description =
  "Browse mentors in tech careers and higher education. Filter by topic, format, price, language and availability, then book a 1:1 call, group session or expert review."

// Child openGraph replaces the layout's rather than merging, so the shared fields are repeated here.
export const metadata: Metadata = {
  title: "Find a mentor",
  description,
  alternates: { canonical: "/mentors" },
  openGraph: { type: "website", siteName: site.name, url: "/mentors", title: "Find a mentor", description },
}

export default function MentorsPage() {
  return (
    <Container className="pt-8 pb-16 sm:pt-12 sm:pb-24">
      <h1 className="text-title">Find your mentor</h1>
      <Suspense fallback={<MentorGridSkeleton />}>
        <MentorExplorer />
      </Suspense>
    </Container>
  )
}
