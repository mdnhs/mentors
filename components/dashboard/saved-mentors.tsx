"use client"

import Link from "next/link"
import { HeartIcon } from "lucide-react"

import { MentorTileRow } from "@/components/dashboard/mentor-tile"
import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { Rating } from "@/components/mentors/rating"
import { SaveButton } from "@/components/mentors/save-button"
import { DateBlock } from "@/components/sessions/date-block"
import { PageHeader, Panel, PanelLink, PortalEmpty } from "@/components/portal/ui"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { mentorUpdates, recommendedMentors, type LearnerData } from "@/lib/dashboard"
import { getMentor } from "@/lib/data"
import { formatPrice, formatTime } from "@/lib/format"
import { getStartingPrice } from "@/lib/offers"
import { useAppState, useNow } from "@/lib/store"
import type { Mentor } from "@/lib/types"

export function SavedMentors() {
  const state = useAppState()
  const now = useNow()

  const header = (
    <PageHeader
      title="Saved mentors"
      actions={
        <Link href="/mentors" className={buttonVariants({ variant: "outline" })}>
          Browse mentors
        </Link>
      }
    />
  )
  if (!now) {
    return (
      <>
        {header}
        <Skeleton aria-label="Loading saved mentors" className="h-48 rounded-2xl" />
      </>
    )
  }

  const data: LearnerData = { bookings: state.bookings, orders: state.orders, saved: state.saved, notes: state.notes, cancelledSessions: state.cancelledSessions, sessionCapacity: state.sessionCapacity }
  const mentors = state.saved.map((slug) => getMentor(slug)).filter((mentor) => mentor !== undefined)
  const updates = state.notifications.mentorActivity ? mentorUpdates(data, now) : []
  const picks = recommendedMentors(data, now, 6)

  return (
    <>
      {header}
      <div className="space-y-8">
        <section aria-labelledby="saved">
          <h2 id="saved" className="sr-only">
            Your saved mentors
          </h2>
          {mentors.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mentors.map((mentor) => (
                <li key={mentor.slug}>
                  <SavedCard mentor={mentor} price={getStartingPrice(mentor, now)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border bg-card">
              <PortalEmpty icon={HeartIcon} title="No saved mentors" description="Save mentors you like to compare them later.">
                <Link href="/mentors" className={buttonVariants()}>
                  Browse mentors
                </Link>
              </PortalEmpty>
            </div>
          )}
        </section>

        {updates.length > 0 && (
          <Panel id="mentor-updates" title="Live sessions from your mentors">
            <ul className="-my-1 divide-y">
              {updates.map(({ session, mentor }) => (
                <li key={session.id}>
                  <Link href={`/sessions/${session.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60 focus-ring">
                    <DateBlock iso={session.startsAt} timeZone={state.profile.timezone} className="w-12 py-1.5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{session.title}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {mentor.name}, {formatTime(session.startsAt, state.profile.timezone)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{formatPrice(session.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {picks.length > 0 && (
          <section aria-labelledby="recommended-heading">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 id="recommended-heading" className="text-base font-semibold">
                Recommended for you
              </h2>
              <PanelLink href="/mentors">Browse all</PanelLink>
            </div>
            <MentorTileRow mentors={picks} now={now} label="Recommended mentors" />
          </section>
        )}
      </div>
    </>
  )
}

function SavedCard({ mentor, price }: { mentor: Mentor; price: number | null }) {
  return (
    <article className="relative flex h-full gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
        <MentorPhoto src={mentor.photo} name={mentor.name} alt="" sizes="64px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate pr-10 font-semibold">
          <Link href={`/mentors/${mentor.slug}`} className="rounded-sm outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
            {mentor.name}
          </Link>
        </h3>
        <p className="truncate text-sm text-muted-foreground">{mentor.role}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <Rating slug={mentor.slug} />
          {price !== null && <span className="text-sm font-medium tabular-nums">From {formatPrice(price)}</span>}
        </div>
      </div>
      <SaveButton slug={mentor.slug} name={mentor.name} className="absolute top-3 right-3 z-10 border bg-card shadow-none" />
    </article>
  )
}
