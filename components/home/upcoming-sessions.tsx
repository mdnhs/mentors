"use client"

import Link from "next/link"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { DateBlock } from "@/components/sessions/date-block"
import { SeatsMeter } from "@/components/sessions/seats-meter"
import { Container } from "@/components/site/container"
import { SectionHeading } from "@/components/site/section-heading"
import { buttonVariants } from "@/components/ui/button"
import { getMentor, getSessions } from "@/lib/data"
import { formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format"
import { checkEnrollment, resolveSession, seatsTaken } from "@/lib/sessions"
import { useAppState, useNow } from "@/lib/store"
import { cn } from "@/lib/utils"

export function UpcomingSessions() {
  const { bookings, cancelledSessions, sessionCapacity } = useAppState()
  const now = useNow() ?? new Date(0)
  const open = getSessions()
    .map((session) => resolveSession(session, { cancelledSessions, sessionCapacity }))
    .filter((session) => checkEnrollment(session, bookings, now).open)
  const [next, ...rest] = open
  if (!next) return null
  const nextMentor = getMentor(next.mentorSlug)!

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          title="Upcoming live sessions"
          description="Learn in a small group for a fraction of the price."
          action={{ label: "See all", href: "/sessions" }}
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <article className="relative grid min-w-0 overflow-hidden rounded-3xl bg-accent sm:grid-cols-5 lg:col-span-3">
            <div className="relative aspect-4/3 sm:col-span-2 sm:aspect-auto">
              <MentorPhoto
                src={nextMentor.photo}
                name={nextMentor.name}
                sizes="(min-width: 1024px) 280px, (min-width: 640px) 40vw, 100vw"
              />
            </div>
            <div className="flex flex-col p-6 sm:col-span-3 sm:p-8">
              <p className="text-sm font-medium text-accent-foreground">Next up · {formatDate(next.startsAt)}</p>
              <h3 className="mt-2 text-heading">{next.title}</h3>
              <p className="mt-2 text-muted-foreground">{next.summary}</p>
              <p className="mt-4 text-sm">
                with <span className="font-medium">{nextMentor.name}</span>, {nextMentor.role} · {formatTime(next.startsAt)} ·{" "}
                {formatDuration(next.durationMinutes)}
              </p>
              <SeatsMeter seats={{ total: next.seats.total, taken: seatsTaken(next, bookings, now) }} className="mt-5 max-w-xs" />
              <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                <p>
                  <span className="text-xl font-semibold">{formatPrice(next.price)}</span>
                  <span className="text-sm text-muted-foreground"> / seat</span>
                </p>
                <Link
                  href={`/sessions/${next.id}`}
                  className={cn(buttonVariants(), "after:absolute after:inset-0 after:rounded-3xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50")}
                >
                  Reserve seat<span className="sr-only"> for {next.title}</span>
                </Link>
              </div>
            </div>
          </article>

          <ul className="surface min-w-0 divide-y lg:col-span-2">
            {rest.slice(0, 3).map((session) => {
              const mentor = getMentor(session.mentorSlug)!
              return (
                <li key={session.id} className="relative flex items-center gap-4 p-4 transition-colors hover:bg-muted/60 first:rounded-t-2xl last:rounded-b-2xl">
                  <DateBlock iso={session.startsAt} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium">
                      <Link
                        href={`/sessions/${session.id}`}
                        className="outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                      >
                        {session.title}
                      </Link>
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                      <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-5" />
                      {mentor.name} · {formatTime(session.startsAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{formatPrice(session.price)}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </Container>
    </section>
  )
}
