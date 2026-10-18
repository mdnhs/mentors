"use client"

import Link from "next/link"
import { AlertCircleIcon, CalendarClockIcon, CalendarPlusIcon, CheckCircle2Icon, ChevronRightIcon, ReceiptTextIcon, VideoIcon } from "lucide-react"
import { toast } from "sonner"

import { MentorTileRow } from "@/components/dashboard/mentor-tile"
import { SamplePill } from "@/components/dashboard/booking-row"
import { WorkspaceLink } from "@/components/dashboard/workspace-link"
import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { PageHeader, Panel, PanelLink, PortalEmpty, Stat, StatStrip } from "@/components/portal/ui"
import { WeekStrip } from "@/components/portal/week-strip"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { bookingHref, nextActions, nextSession, recommendedMentors, splitBookings, type LearnerData } from "@/lib/dashboard"
import { getMentor, getSession } from "@/lib/data"
import { formatCountdown, formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format"
import { completedCount, greeting, openSteps, orderTone, paymentActivity, weekEvents, zoneName, type OpenStep } from "@/lib/learner-insights"
import { meetingAccess } from "@/lib/sessions"
import { toggleActionItem, useAppState, useNow } from "@/lib/store"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

export function LearnerOverview() {
  const state = useAppState()
  const now = useNow()
  if (!now) return <OverviewSkeleton />

  const { profile, notifications } = state
  const timeZone = profile.timezone
  const data: LearnerData = { bookings: state.bookings, orders: state.orders, saved: state.saved, notes: state.notes, cancelledSessions: state.cancelledSessions, sessionCapacity: state.sessionCapacity }
  const { upcoming } = splitBookings(state.bookings, now)
  const next = nextSession(upcoming, now)
  const steps = openSteps(state.bookings, state.notes)
  const urgent = nextActions(data, now, { reminders: notifications.reminders }).filter((action) => !action.id.startsWith("plan-"))
  const picks = recommendedMentors(data, now, 6)

  return (
    <>
      <PageHeader
        title={`${greeting(now, timeZone)}, ${profile.name.split(" ")[0]}`}
        actions={
          <>
            <Link href="/sessions" className={buttonVariants({ variant: "outline" })}>
              Group sessions
            </Link>
            <Link href="/mentors" className={buttonVariants()}>
              Find a mentor
            </Link>
          </>
        }
      />

      <div className="space-y-8">
        {next ? (
          <NextSession booking={next} now={now} timeZone={timeZone} />
        ) : (
          <section aria-labelledby="next-session" className="rounded-2xl border bg-card">
            <h2 id="next-session" className="sr-only">
              Next session
            </h2>
            <PortalEmpty
              icon={CalendarPlusIcon}
              title={upcoming.length === 0 ? "No sessions booked yet" : "Nothing confirmed yet"}
              description={upcoming.length === 0 ? "Book a mentor to get your first session on the calendar." : "Finish payment to lock in your time."}
            >
              <Link href={upcoming.length === 0 ? "/mentors" : "/dashboard/bookings"} className={buttonVariants()}>
                {upcoming.length === 0 ? "Find a mentor" : "Open bookings"}
              </Link>
            </PortalEmpty>
          </section>
        )}

        <section aria-labelledby="week-heading">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="week-heading" className="text-base font-semibold">
              Your week
            </h2>
            <PanelLink href="/dashboard/bookings">All bookings</PanelLink>
          </div>
          <WeekStrip events={weekEvents(upcoming, now)} now={now} timeZone={timeZone} />
        </section>

        <StatStrip label="Your progress">
          <Stat label="Upcoming sessions" value={upcoming.length} href="/dashboard/bookings" hint={next ? `Next ${formatDate(next.date, timeZone)}` : undefined} />
          <Stat label="Completed sessions" value={completedCount(state.bookings, now)} href="/dashboard/bookings" />
          <Stat label="Open action steps" value={steps.length} href="/dashboard/bookings#notes-overview" />
          <Stat label="Saved mentors" value={state.saved.length} href="/dashboard/saved" />
        </StatStrip>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel id="up-next" title="Up next" action={steps.length > 0 ? <PanelLink href="/dashboard/bookings#notes-overview">All plans</PanelLink> : undefined}>
            {urgent.length === 0 && steps.length === 0 ? (
              <PortalEmpty icon={CheckCircle2Icon} title="You're all caught up" description="New steps from your mentors land here." className="py-8" />
            ) : (
              <ul className="-my-1 divide-y">
                {urgent.map((action) => (
                  <li key={action.id}>
                    <Link href={action.href} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60 focus-ring">
                      <AlertCircleIcon className={cn("size-4 shrink-0", action.tone === "warning" ? "text-warning" : "text-muted-foreground")} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{action.title}</span>
                        <span className="block truncate text-sm text-muted-foreground">{action.detail}</span>
                      </span>
                      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                {steps.slice(0, 5).map((step) => (
                  <StepRow key={`${step.booking.id}-${step.item.id}`} step={step} />
                ))}
              </ul>
            )}
          </Panel>

          {notifications.bookingUpdates && <RecentActivity data={data} timeZone={timeZone} />}
        </div>

        {picks.length > 0 && (
          <section aria-labelledby="picks-heading">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 id="picks-heading" className="text-base font-semibold">
                Mentors for you
              </h2>
              <PanelLink href="/mentors">Browse all</PanelLink>
            </div>
            <MentorTileRow mentors={picks} now={now} label="Suggested mentors" />
          </section>
        )}

        <WorkspaceLink />
      </div>
    </>
  )
}

function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="space-y-8">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  )
}

function NextSession({ booking, now, timeZone }: { booking: Booking; now: Date; timeZone: string }) {
  const mentor = getMentor(booking.mentorSlug)!
  const session = booking.sessionId ? getSession(booking.sessionId) : undefined
  const access = session ? meetingAccess(session, [booking], now) : null

  return (
    <section aria-labelledby="next-session" className="overflow-hidden rounded-2xl border bg-linear-to-br from-accent/70 via-card to-card">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted sm:size-24">
          <MentorPhoto src={mentor.photo} name={mentor.name} sizes="96px" priority />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="next-session" className="text-sm font-medium text-primary">
              Next session
            </h2>
            <Badge tone="accent">{formatCountdown(new Date(booking.date).getTime() - now.getTime())}</Badge>
            {booking.sample && <SamplePill />}
          </div>
          <p className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{booking.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">with {mentor.name}</p>
          <p className="mt-3 flex items-center gap-1.5 text-sm tabular-nums">
            <CalendarClockIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            {formatDate(booking.date, timeZone)}, {formatTime(booking.date, timeZone)} {zoneName(timeZone)}
            {booking.durationMinutes && <span className="text-muted-foreground">{` (${formatDuration(booking.durationMinutes)})`}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
          <Link href={bookingHref(booking)} className={buttonVariants({ size: "lg" })}>
            View details
          </Link>
          {access?.access === "granted" && (
            <a href={access.details.url} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", variant: "outline" })}>
              <VideoIcon aria-hidden="true" />
              Join session
            </a>
          )}
          {access?.access === "locked" && <p className="text-xs text-muted-foreground sm:text-center">Link opens 30 min before</p>}
        </div>
      </div>
    </section>
  )
}

function StepRow({ step }: { step: OpenStep }) {
  const { booking, item } = step
  const id = `step-${booking.id}-${item.id}`

  const complete = () => {
    toggleActionItem(booking.id, item.id)
    toast.success("Step done", {
      description: item.text,
      action: { label: "Undo", onClick: () => toggleActionItem(booking.id, item.id) },
    })
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <input id={id} type="checkbox" checked={false} onChange={complete} className="mt-0.5 size-4 shrink-0 accent-primary focus-ring" />
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm font-medium">
          {item.text}
        </label>
        <Link href={`${bookingHref(booking)}#notes`} className="block truncate rounded-sm text-sm text-muted-foreground hover:text-foreground focus-ring">
          {booking.title}
        </Link>
      </div>
    </li>
  )
}

function RecentActivity({ data, timeZone }: { data: LearnerData; timeZone: string }) {
  const feed = paymentActivity(data.orders, data.bookings)

  return (
    <Panel id="activity" title="Recent activity">
      {feed.length > 0 ? (
        <ul className="-my-1 divide-y" aria-live="polite">
          {feed.map((event) => (
            <li key={event.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <Link href={`/dashboard/bookings/${event.bookingId}`} className="block truncate rounded-sm text-sm font-medium hover:underline focus-ring">
                  {event.title}
                </Link>
                <time dateTime={event.at} className="block text-xs text-muted-foreground">
                  {formatDate(event.at, timeZone)}
                </time>
              </span>
              {event.amount !== undefined && <span className="text-sm font-medium tabular-nums">{formatPrice(event.amount, event.currency)}</span>}
              <Badge tone={orderTone[event.status]}>{event.label}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <PortalEmpty icon={ReceiptTextIcon} title="No payments yet" description="Payments and refunds show up here." className="py-8" />
      )}
    </Panel>
  )
}
