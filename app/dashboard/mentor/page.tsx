import type { Metadata } from "next"
import Link from "next/link"

import { MentorDashboard } from "@/components/dashboard/mentor-dashboard"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Container } from "@/components/site/container"
import { buttonVariants } from "@/components/ui/button"
import { getMentor } from "@/lib/data"

export const metadata: Metadata = {
  title: "Mentor dashboard",
}

const DEMO_MENTOR = "tanvir-rahman"

export default function MentorDashboardPage() {
  const mentor = getMentor(DEMO_MENTOR)!

  return (
    <Container className="max-w-5xl pt-8 pb-16 sm:pt-12 sm:pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-12 sm:size-14" />
          <div>
            <h1 className="text-title">Mentor dashboard</h1>
            <p className="text-sm text-muted-foreground">Demo view as {mentor.name}</p>
          </div>
        </div>
        <Link href={`/mentors/${mentor.slug}`} className={buttonVariants({ variant: "outline" })}>
          View public profile
        </Link>
      </div>
      <MentorDashboard mentor={mentor} />
    </Container>
  )
}
