import type { Metadata } from "next"
import { Suspense } from "react"

import { MentorExplorer } from "@/components/mentors/mentor-explorer"
import { MentorGridSkeleton } from "@/components/mentors/mentor-grid-skeleton"
import { Container } from "@/components/site/container"

export const metadata: Metadata = {
  title: "Find a mentor",
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
