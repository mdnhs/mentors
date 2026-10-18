import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CalendarIcon, ClockIcon, LanguagesIcon, VideoIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Rating } from "@/components/mentors/rating"
import { JoinPanel, SessionStatusMobile } from "@/components/sessions/join-panel"
import { LocalTime } from "@/components/sessions/local-time"
import { SessionCard } from "@/components/sessions/session-card"
import { BackLink } from "@/components/site/back-link"
import { Container } from "@/components/site/container"
import { Skeleton } from "@/components/ui/skeleton"
import { getCategory } from "@/lib/categories"
import { getMentor, getSession, getSessions } from "@/lib/data"
import { formatDate, formatDuration, formatTime, timezoneLabel } from "@/lib/format"

export function generateStaticParams() {
  return getSessions().map((session) => ({ id: session.id }))
}

export async function generateMetadata({ params }: PageProps<"/sessions/[id]">): Promise<Metadata> {
  const session = getSession((await params).id)
  return session
    ? { title: session.title, description: session.summary, alternates: { canonical: `/sessions/${session.id}` } }
    : {}
}

export default function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  return (
    <Suspense fallback={<SessionSkeleton />}>
      <SessionDetail params={params} />
    </Suspense>
  )
}

function SessionSkeleton() {
  return (
    <Container className="pt-6 sm:pt-8" aria-busy="true" aria-label="Loading session">
      <Skeleton className="h-5 w-28" />
      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </Container>
  )
}

async function SessionDetail({ params }: Pick<PageProps<"/sessions/[id]">, "params">) {
  const session = getSession((await params).id)
  if (!session) notFound()

  const mentor = getMentor(session.mentorSlug)!
  const category = getCategory(session.category)
  const more = getSessions()
    .filter((item) => item.id !== session.id)
    .slice(0, 3)

  const facts = [
    { icon: CalendarIcon, text: formatDate(session.startsAt, session.timezone) },
    {
      icon: ClockIcon,
      text: `${formatTime(session.startsAt, session.timezone)} ${timezoneLabel(session.timezone, session.startsAt)} · ${formatDuration(session.durationMinutes)}`,
      extra: <LocalTime iso={session.startsAt} timeZone={session.timezone} />,
    },
    { icon: VideoIcon, text: `${session.format}, online` },
    { icon: LanguagesIcon, text: session.language },
  ]

  return (
    <Container className="pt-6 pb-16 sm:pt-8 sm:pb-24">
      <BackLink href="/sessions">All sessions</BackLink>

      <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-12">
        <div className="lg:col-span-2">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <category.icon className="size-4" aria-hidden="true" />
            </span>
            {category.label}
          </p>
          <h1 className="mt-3 text-title">{session.title}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{session.summary}</p>

          <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {facts.map(({ icon: Icon, text, extra }) => (
              <li key={text} className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>
                  {text}
                  {extra}
                </span>
              </li>
            ))}
          </ul>

          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Topics covered">
            {session.expertise.map((topic) => (
              <li key={topic} className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {topic}
              </li>
            ))}
          </ul>

          <SessionStatusMobile session={session} />

          <section aria-labelledby="agenda" className="mt-10">
            <h2 id="agenda" className="text-subheading">What we&apos;ll cover</h2>
            <ol className="mt-4 space-y-3">
              {session.agenda.map((item, index) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="host" className="mt-10">
            <h2 id="host" className="text-subheading">Your host</h2>
            <Link
              href={`/mentors/${mentor.slug}`}
              className="mt-4 flex items-center gap-4 surface p-4 transition hover:shadow-card focus-ring"
            >
              <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-14" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{mentor.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {mentor.role} · {mentor.organization}
                </p>
                <Rating slug={mentor.slug} className="mt-1" />
              </div>
              <span className="hidden text-sm font-medium text-primary sm:block">View profile</span>
            </Link>
          </section>
        </div>

        <aside className="lg:col-start-3 lg:row-start-1">
          <div className="lg:sticky lg:top-24">
            <JoinPanel session={session} />
          </div>
        </aside>
      </div>

      <section aria-labelledby="more" className="mt-16">
        <h2 id="more" className="text-xl font-semibold tracking-tight">More live sessions</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {more.map((item) => (
            <SessionCard key={item.id} session={item} />
          ))}
        </div>
      </section>
    </Container>
  )
}
