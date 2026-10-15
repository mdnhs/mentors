import type { Metadata } from "next"
import { BanknoteIcon, CalendarCogIcon, LayersIcon } from "lucide-react"

import { MentorApplication } from "@/components/mentors/mentor-application"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Container } from "@/components/site/container"
import { getListedMentors } from "@/lib/offers"

export const metadata: Metadata = {
  title: "Become a mentor",
}

const benefits = [
  { icon: LayersIcon, title: "Choose how you help", text: "1:1 calls, live group sessions, ongoing mentorship or written reviews." },
  { icon: CalendarCogIcon, title: "Your schedule, your price", text: "Open the slots that suit you, from anywhere in the world." },
  { icon: BanknoteIcon, title: "Paid when sessions happen", text: "We take a commission only on completed bookings." },
]

export default function BecomeMentorPage() {
  return (
    <Container className="grid grid-cols-1 gap-12 pt-10 pb-16 sm:pt-16 sm:pb-24 lg:grid-cols-2 lg:gap-16">
      <div>
        <div className="flex -space-x-2">
          {getListedMentors()
            .slice(0, 6)
            .map((mentor) => (
              <MentorAvatar key={mentor.slug} name={mentor.name} photo={mentor.photo} className="size-10 ring-2 ring-background" />
            ))}
        </div>
        <h1 className="mt-6 text-title">Your experience can open doors for someone else.</h1>
        <p className="mt-4 max-w-md text-lg text-muted-foreground">
          Guide the next generation of Bangladeshi engineers and researchers.
        </p>
        <ul className="mt-10 space-y-6">
          {benefits.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:pt-4">
        <MentorApplication />
      </div>
    </Container>
  )
}
