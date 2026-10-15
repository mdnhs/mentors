import Link from "next/link"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Container } from "@/components/site/container"
import { buttonVariants } from "@/components/ui/button"
import { getListedMentors } from "@/lib/offers"

export function MentorCta() {
  const mentors = getListedMentors()

  return (
    <section className="border-t bg-card py-16 sm:py-20">
      <Container className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="max-w-lg text-heading">Your experience can open doors for someone else.</h2>
          <p className="mt-3 max-w-md text-muted-foreground">Mentor on your own schedule, from anywhere, and get paid for every completed session.</p>
        </div>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex -space-x-2" aria-hidden="true">
            {mentors.slice(5, 11).map((mentor) => (
              <MentorAvatar key={mentor.slug} name={mentor.name} photo={mentor.photo} className="size-10 ring-2 ring-card" />
            ))}
          </div>
          <Link href="/become-a-mentor" className={buttonVariants({ size: "lg" })}>
            Become a Mentor
          </Link>
        </div>
      </Container>
    </section>
  )
}
