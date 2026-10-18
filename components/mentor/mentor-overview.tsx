"use client"

import { ArrowRightIcon, CalendarClockIcon, CheckCircle2Icon, FileTextIcon, LayersIcon, MessageSquareQuoteIcon, StarIcon, WalletIcon, type LucideIcon } from "lucide-react"

import { GuardedLink } from "@/components/mentor/unsaved-guard"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { ListRow, PageHeader, Panel, PanelLink, PortalEmpty, Stat, StatStrip } from "@/components/portal/ui"
import { WeekStrip, type WeekEvent } from "@/components/portal/week-strip"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getMentorSessions, getRating, getReviews } from "@/lib/data"
import { formatDate, formatPrice } from "@/lib/format"
import { earningsByMonth } from "@/lib/mentor-finance"
import { mentorTasks, splitMentorBookings, type MentorTask } from "@/lib/mentor-dashboard"
import { MENTOR_BOOKINGS_HREF, monthTrend, splitSessions, withBookingsPage } from "@/lib/mentor-insights"
import { resolveSession } from "@/lib/sessions"
import { cn } from "@/lib/utils"

const taskIcons: Record<"payout" | "reviews" | "offer" | "schedule", LucideIcon> = { payout: WalletIcon, reviews: FileTextIcon, offer: LayersIcon, schedule: CalendarClockIcon }

const taskKind = (task: MentorTask): keyof typeof taskIcons =>
  task.id === "payout" ? "payout" : task.id === "reviews" ? "reviews" : task.id.startsWith("draft") || task.id === "no-live" ? "offer" : "schedule"

const hourIn = (now: Date, timeZone: string) => Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(now))
const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening")

export function MentorOverview() {
  const { state, now, mentor, bookings, summary, finance } = useMentorWorkspace()
  const firstName = mentor.name.split(" ")[0]

  if (!now || !summary)
    return (
      <div>
        <PageHeader title={`Hi, ${firstName}`} />
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    )

  const { upcoming } = splitMentorBookings(bookings, now)
  const tasks = withBookingsPage(mentorTasks({ bookings, offers: mentor.offers, availability: mentor.availability, summary, mentorTimezone: mentor.timezone }, now))
  const [top, ...rest] = tasks
  const sessions = splitSessions(
    getMentorSessions(mentor.slug).map((session) => resolveSession(session, state)),
    now
  ).upcoming
  const reviews = getReviews(mentor.slug).slice(0, 3)
  const rating = getRating(mentor.slug)
  const month = monthTrend(earningsByMonth(finance, mentor.slug, now, 6, mentor.timezone))
  const cur = summary.currency

  const events: WeekEvent[] = [
    ...upcoming.map((item) => ({
      id: item.booking.id,
      startsAt: item.booking.date,
      title: item.booking.kind === "review" ? `Review due: ${item.learner}` : item.learner,
      href: MENTOR_BOOKINGS_HREF,
      muted: item.booking.kind === "review",
    })),
    ...sessions.map((session) => ({ id: session.id, startsAt: session.startsAt, title: session.title, href: MENTOR_BOOKINGS_HREF })),
  ]

  return (
    <div className="space-y-8">
      <PageHeader title={`${greeting(hourIn(now, mentor.timezone))}, ${firstName}`} className="mb-6" />

      <section aria-labelledby="up-next" className="rounded-2xl border border-primary/20 bg-accent/50 p-5 sm:p-6">
        <h2 id="up-next" className="sr-only">
          Up next
        </h2>
        {top ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <TaskIcon task={top} large />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold tracking-tight">{top.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{top.detail}</p>
            </div>
            <GuardedLink href={top.href} className={cn(buttonVariants(), "shrink-0 self-start sm:self-center")}>
              {top.cta}
              <ArrowRightIcon aria-hidden="true" />
            </GuardedLink>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
              <CheckCircle2Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">You&apos;re all set</p>
              <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="week">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="week" className="text-base font-semibold">
            This week
          </h2>
          <PanelLink href={MENTOR_BOOKINGS_HREF}>All bookings</PanelLink>
        </div>
        <WeekStrip events={events} now={now} timeZone={mentor.timezone} />
      </section>

      <StatStrip label="At a glance">
        <Stat label="Earned this month" value={formatPrice(month.current, cur)} delta={month.delta} trend={month.trend} href="/dashboard/mentor/earnings" />
        <Stat label="Ready to pay out" value={formatPrice(summary.availableForPayout, cur)} hint={summary.pendingPayouts > 0 ? `${formatPrice(summary.pendingPayouts, cur)} pending` : "From completed sessions"} href="/dashboard/mentor/earnings" />
        <Stat label="Upcoming bookings" value={upcoming.length} hint={sessions.length > 0 ? `+ ${sessions.length} group ${sessions.length === 1 ? "session" : "sessions"}` : undefined} href={MENTOR_BOOKINGS_HREF} />
        <Stat
          label="Average rating"
          value={
            rating ? (
              <span className="inline-flex items-center gap-1">
                <StarIcon className="size-5 fill-rating text-rating" aria-hidden="true" />
                {rating.average.toFixed(1)}
              </span>
            ) : (
              "—"
            )
          }
          hint={rating ? `${rating.count} ${rating.count === 1 ? "review" : "reviews"}` : "No reviews yet"}
        />
      </StatStrip>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel id="attention" title="Needs attention">
          {rest.length > 0 ? (
            <ul className="divide-y">
              {rest.map((task) => (
                <li key={task.id}>
                  <ListRow
                    leading={<TaskIcon task={task} />}
                    title={task.title}
                    subtitle={task.detail}
                    trailing={
                      <GuardedLink href={task.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {task.cta}
                        <span className="sr-only">: {task.title}</span>
                      </GuardedLink>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <CheckCircle2Icon className="size-4 text-success" aria-hidden="true" />
              Nothing else to do.
            </p>
          )}
        </Panel>

        <Panel id="reviews" title="Recent reviews" action={rating && <span className="text-sm text-muted-foreground tabular-nums">{rating.count} total</span>}>
          {reviews.length > 0 ? (
            <ul className="divide-y">
              {reviews.map((review) => (
                <li key={review.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Stars rating={review.rating} />
                    <span className="text-xs text-muted-foreground">{formatDate(review.date)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm">“{review.text}”</p>
                  <p className="mt-1 text-xs text-muted-foreground">{review.author}</p>
                </li>
              ))}
            </ul>
          ) : (
            <PortalEmpty icon={MessageSquareQuoteIcon} title="No reviews yet" description="Learners review you after a completed booking." className="py-8" />
          )}
        </Panel>
      </div>
    </div>
  )
}

function TaskIcon({ task, large }: { task: MentorTask; large?: boolean }) {
  const Icon = taskIcons[taskKind(task)]
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-xl text-primary", large ? "size-11 bg-card" : "size-9 bg-accent")}>
      <Icon className={large ? "size-5" : "size-4"} aria-hidden="true" />
    </span>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon key={index} className={cn("size-3.5", index < Math.round(rating) ? "fill-rating text-rating" : "text-muted-foreground/40")} aria-hidden="true" />
      ))}
    </span>
  )
}
