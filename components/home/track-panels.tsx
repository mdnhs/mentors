import Link from "next/link"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Container } from "@/components/site/container"
import { buttonVariants } from "@/components/ui/button"
import { categories } from "@/lib/categories"
import { getListedMentors } from "@/lib/offers"
import type { Track } from "@/lib/types"

const panels: { track: Track; title: string; text: string }[] = [
  {
    track: "tech",
    title: "Tech career",
    text: "Mock interviews, CV reviews and honest advice from engineers working in Dhaka and abroad.",
  },
  {
    track: "education",
    title: "Higher education",
    text: "Scholarships, applications and research guidance from people who got in.",
  },
]

export function TrackPanels() {
  const mentors = getListedMentors()

  return (
    <section className="border-y bg-card py-16 sm:py-20">
      <Container>
        <h2 className="text-heading">Where do you want to go?</h2>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {panels.map((panel) => {
            const trackMentors = mentors.filter((mentor) => mentor.track === panel.track)
            const topics = categories.filter((category) => category.track === panel.track)
            return (
              <article key={panel.track} className="flex min-w-0 flex-col rounded-3xl bg-background p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-heading">{panel.title}</h3>
                    <p className="mt-2 max-w-sm text-muted-foreground">{panel.text}</p>
                  </div>
                  <div className="hidden shrink-0 -space-x-2 sm:flex" aria-hidden="true">
                    {trackMentors.slice(0, 4).map((mentor) => (
                      <MentorAvatar key={mentor.slug} name={mentor.name} photo={mentor.photo} className="size-10 ring-2 ring-background" />
                    ))}
                  </div>
                </div>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <li key={topic.id}>
                      <Link
                        href={`/mentors?category=${topic.id}`}
                        className="group/topic inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-ring"
                      >
                        <topic.icon className="size-4 text-muted-foreground transition-colors group-hover/topic:text-accent-foreground" aria-hidden="true" />
                        {topic.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">{trackMentors.length} mentors</p>
                  <Link href={`/mentors?track=${panel.track}`} className={buttonVariants({ variant: "outline" })}>
                    Browse mentors<span className="sr-only"> for {panel.title.toLowerCase()}</span>
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
