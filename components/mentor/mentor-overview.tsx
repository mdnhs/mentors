"use client"

import Link from "next/link"
import { ArrowRightIcon, CheckCircle2Icon, InfoIcon, StarIcon } from "lucide-react"

import { CancelSession } from "@/components/dashboard/cancel-session"
import { MentorBookingCard } from "@/components/mentor/mentor-booking-card"
import { MentorPageHeader } from "@/components/mentor/mentor-shell"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { SessionBadge } from "@/components/sessions/session-badge"
import { DateBlock } from "@/components/sessions/date-block"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getMentorSessions, getReviews } from "@/lib/data"
import { formatDate, formatPrice } from "@/lib/format"
import { mentorTasks, splitMentorBookings } from "@/lib/mentor-dashboard"
import { resolveSession } from "@/lib/sessions"
import { clearSampleData } from "@/lib/store"
import { cn } from "@/lib/utils"

export function MentorOverview() {
  const { state, now, actor, mentor, bookings, summary } = useMentorWorkspace()
  const header = <MentorPageHeader title="Overview" description="What needs your attention, your bookings and your earnings at a glance." />
  if (!now || !summary)
    return (
      <div className="mt-6 space-y-6">
        {header}
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    )

  const { upcoming, completed, closed } = splitMentorBookings(bookings, now)
  const tasks = mentorTasks({ bookings, offers: mentor.offers, availability: mentor.availability, summary, mentorTimezone: mentor.timezone }, now)
  const [top, ...rest] = tasks
  const sessions = getMentorSessions(mentor.slug).map((session) => resolveSession(session, state))
  const reviews = getReviews(mentor.slug).slice(0, 3)
  const hasSamples = bookings.some((item) => item.booking.sample)
  const cur = summary.currency

  const stats = [
    { label: "Estimated earnings", value: summary.estimatedEarnings, hint: "Your share of paid bookings" },
    { label: "Ready to pay out", value: summary.availableForPayout, hint: "From completed sessions" },
    { label: "Payout pending", value: summary.pendingPayouts, hint: "Requested, not yet sent" },
    { label: "Paid out", value: summary.paidOut, hint: "Money actually sent" },
  ]

  return (
    <div className="mt-6 space-y-10">
      {header}
      {hasSamples && (
        <div role="note" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-warning-soft p-3 text-sm text-warning ring-1 ring-warning/20">
          <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <span className="font-medium">Demo workspace.</span> Bookings from other learners and their payments are made-up samples, and payouts are simulated.
          </p>
          <Button variant="outline" size="sm" onClick={clearSampleData}>
            Clear sample data
          </Button>
        </div>
      )}

      <section aria-labelledby="up-next" className="rounded-3xl bg-foreground p-5 text-background sm:p-7">
        <p id="up-next" className="text-sm font-medium text-background/60">
          Up next
        </p>
        {top ? (
          <>
            <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{top.title}</h2>
            <p className="mt-1 max-w-2xl text-background/70">{top.detail}</p>
            <Link href={top.href} className={cn(buttonVariants({ size: "lg" }), "mt-5 bg-background text-foreground hover:bg-background/90 focus-visible:ring-background/60")}>
              {top.cta}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
              <CheckCircle2Icon className="size-6" aria-hidden="true" />
              You&apos;re all set
            </h2>
            <p className="mt-1 text-background/70">Nothing needs your attention right now.</p>
          </>
        )}
        {rest.length > 0 && (
          <ul className="mt-6 divide-y divide-background/10 border-t border-background/10 text-sm">
            {rest.slice(0, 3).map((task) => (
              <li key={task.id}>
                <Link href={task.href} className="flex items-center justify-between gap-3 rounded-md py-3 text-background/80 outline-none hover:text-background focus-visible:ring-3 focus-visible:ring-background/60">
                  <span className="min-w-0 truncate">{task.title}</span>
                  <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="snapshot">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="snapshot" className="text-subheading">
            Earnings snapshot
          </h2>
          <Link href="/dashboard/mentor/earnings" className="link text-sm">
            Details
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="surface p-4">
              <dt className="text-sm text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 text-lg font-semibold">{formatPrice(item.value, cur)}</dd>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">Earnings are not paid out until a payout is sent. Demo mode: no real money moves.</p>
      </section>

      <section aria-labelledby="bookings" id="bookings" className="scroll-mt-24">
        <h2 id="bookings" className="text-subheading">
          Upcoming bookings
        </h2>
        {upcoming.length > 0 ? (
          <ul className="mt-4 divide-y surface">
            {upcoming.map((item) => (
              <MentorBookingCard key={item.booking.id} item={item} now={now} actor={actor} mentorTimezone={mentor.timezone} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No upcoming bookings yet. Published offers appear on your public profile.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Bookings confirm when the learner pays, so there are no requests to approve.</p>
      </section>

      <section aria-labelledby="live-sessions">
        <h2 id="live-sessions" className="text-subheading">
          Live group sessions
        </h2>
        <ul className="mt-4 divide-y surface">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center gap-4 p-4">
              <DateBlock iso={session.startsAt} timeZone={session.timezone} />
              <div className="min-w-0 flex-1">
                <Link href={`/sessions/${session.id}`} className="font-medium hover:underline">
                  {session.title}
                </Link>
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {session.seats.taken} of {session.seats.total} seats taken
                  <SessionBadge view={{ phase: session.status === "cancelled" ? "cancelled" : "scheduled", learner: "none", check: { open: true } }} />
                </p>
              </div>
              {session.status !== "cancelled" && new Date(session.startsAt) > now && <CancelSession session={session} actor={actor} />}
            </li>
          ))}
          {sessions.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No live sessions scheduled.</li>}
        </ul>
      </section>

      <section aria-labelledby="completed">
        <h2 id="completed" className="text-subheading">
          Completed bookings ({completed.length})
        </h2>
        {completed.length > 0 ? (
          <ul className="mt-4 divide-y surface">
            {completed.map((item) => (
              <MentorBookingCard key={item.booking.id} item={item} now={now} actor={actor} mentorTimezone={mentor.timezone} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Finished sessions will show here.</p>
        )}
        {closed.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{closed.length} cancelled or expired {closed.length === 1 ? "booking is" : "bookings are"} not shown.</p>}
      </section>

      <section aria-labelledby="reviews">
        <h2 id="reviews" className="text-subheading">
          Recent verified reviews
        </h2>
        {reviews.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {reviews.map((review) => (
              <li key={review.id} className="surface p-4 text-sm">
                <p className="flex items-center gap-1 font-medium">
                  <StarIcon className="size-4 fill-rating text-rating" aria-hidden="true" />
                  {review.rating.toFixed(1)}
                  <span className="ml-1 font-normal text-muted-foreground">· {formatDate(review.date)}</span>
                </p>
                <p className="mt-2 line-clamp-4">{review.text}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {review.author}, {review.authorRole}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Reviews from learners who completed a booking will appear here.</p>
        )}
      </section>
    </div>
  )
}
