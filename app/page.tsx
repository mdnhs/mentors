import { Hero } from "@/components/home/hero"
import { MentorCta } from "@/components/home/mentor-cta"
import { TrackPanels } from "@/components/home/track-panels"
import { UpcomingSessions } from "@/components/home/upcoming-sessions"
import { MentorCard } from "@/components/mentors/mentor-card"
import { Container } from "@/components/site/container"
import { SectionHeading } from "@/components/site/section-heading"
import { getMentor } from "@/lib/data"

const featuredSlugs = ["tanvir-rahman", "arif-hossain", "sadia-islam", "farhan-kabir"]

export default function HomePage() {
  const featured = featuredSlugs.map((slug) => getMentor(slug)!)

  return (
    <>
      <Hero />

      <section className="pb-16 sm:pb-20">
        <Container>
          <SectionHeading title="Featured mentors" action={{ label: "View all", href: "/mentors" }} />
          <div className="scrollbar-none -mx-4 mt-6 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:scroll-px-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {featured.map((mentor) => (
              <MentorCard key={mentor.slug} mentor={mentor} layout="vertical" className="w-64 shrink-0 snap-start sm:w-auto" />
            ))}
          </div>
        </Container>
      </section>

      <TrackPanels />
      <UpcomingSessions />
      <MentorCta />
    </>
  )
}
