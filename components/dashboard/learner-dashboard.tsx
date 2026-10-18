"use client"

import Link from "next/link"
import { ArrowRightIcon, BellIcon, CalendarClockIcon, CalendarPlusIcon, CheckCircle2Icon, CompassIcon, FileTextIcon, HeartIcon, InfoIcon, SettingsIcon } from "lucide-react"

import { BookingRow, SamplePill } from "@/components/dashboard/booking-row"
import { clearSampleDataWithUndo } from "@/components/dashboard/clear-sample-data"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { SaveButton } from "@/components/mentors/save-button"
import { DateBlock } from "@/components/sessions/date-block"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  bookingHref,
  mentorUpdates,
  nextActions,
  nextSession,
  openActions,
  recentActivity,
  recommendedMentors,
  splitBookings,
  type LearnerData,
} from "@/lib/dashboard"
import { getMentor } from "@/lib/data"
import { formatCountdown, formatDate, formatDuration, formatPrice, formatTime } from "@/lib/format"
import { useAppState, useNow } from "@/lib/store"
import { meetingAccess } from "@/lib/sessions"
import { getSession } from "@/lib/data"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DashboardGreeting() {
  const { profile } = useAppState()
  const firstName = profile.name.split(" ")[0]

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <MentorAvatar name={profile.name} className="size-12 sm:size-14" />
        <div>
          <h1 className="text-title">Hi, {firstName}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
        <Link href="/mentors" className={buttonVariants()}>
          Find a mentor
        </Link>
        <Link href="/sessions" className={buttonVariants({ variant: "outline" })}>
          Live sessions
        </Link>
        <Link href="/dashboard/settings" aria-label="Settings" className={buttonVariants({ variant: "outline", size: "icon" })}>
          <SettingsIcon aria-hidden="true" />
        </Link>
      </nav>
    </div>
  )
}

export function LearnerDashboard() {
  const state = useAppState()
  const now = useNow()
  if (!now) return <DashboardSkeleton />

  const { notifications } = state
  const data: LearnerData = { bookings: state.bookings, orders: state.orders, saved: state.saved, notes: state.notes, cancelledSessions: state.cancelledSessions, sessionCapacity: state.sessionCapacity }
  const { upcoming, past } = splitBookings(state.bookings, now)
  const next = nextSession(upcoming, now)
  const hasSamples = state.bookings.some((booking) => booking.sample)

  return (
    <div className="mt-6 space-y-10">
      <DemoBanner hasSamples={hasSamples} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {next ? (
            <NextSession booking={next} now={now} />
          ) : (
            <EmptyState icon={CalendarPlusIcon} title="No sessions booked yet" description="Find a mentor and book your first session." className="h-full justify-center">
              <Link href="/mentors" className={buttonVariants()}>
                Find a mentor
              </Link>
            </EmptyState>
          )}
        </div>
        <NextSteps data={data} now={now} reminders={notifications.reminders} />
      </div>

      <section aria-labelledby="bookings">
        <h2 id="bookings" className="text-subheading">
          Your bookings
        </h2>
        <Tabs defaultValue="upcoming" className="mt-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="upcoming" className="px-3">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="px-3">
              Past ({past.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="mt-3">
            <BookingList bookings={upcoming} empty="Nothing coming up. Book a session or join a live group." />
          </TabsContent>
          <TabsContent value="past" className="mt-3">
            <BookingList bookings={past} empty="Your completed sessions will appear here." />
          </TabsContent>
        </Tabs>
      </section>

      <NotesOverview data={data} />

      {(notifications.bookingUpdates || notifications.mentorActivity) && (
        <div className="grid gap-10 lg:grid-cols-2">
          {notifications.bookingUpdates && <RecentActivity data={data} />}
          {notifications.mentorActivity && <MentorUpdates data={data} now={now} />}
        </div>
      )}

      <SavedMentors saved={state.saved} />
      <Guidance data={data} now={now} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="mt-6 grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-48 rounded-3xl lg:col-span-2" />
      <Skeleton className="h-48 rounded-3xl" />
    </div>
  )
}

function DemoBanner({ hasSamples }: { hasSamples: boolean }) {
  return (
    <div role="note" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-warning-soft p-3 text-sm text-warning ring-1 ring-warning/20">
      <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="font-medium">Demo account.</span>{" "}
        {hasSamples ? "Login is simulated and data stays in this browser. Items marked Sample are made-up examples, not your bookings." : "Login is simulated and data stays in this browser."}
      </p>
      {hasSamples && (
        <Button variant="outline" size="sm" onClick={clearSampleDataWithUndo}>
          Clear sample data
        </Button>
      )}
    </div>
  )
}

function NextSession({ booking, now }: { booking: Booking; now: Date }) {
  const mentor = getMentor(booking.mentorSlug)!
  const session = booking.sessionId ? getSession(booking.sessionId) : undefined
  const access = session ? meetingAccess(session, [booking], now) : null

  return (
    <section aria-labelledby="next-session" className="flex h-full flex-col gap-5 rounded-3xl bg-foreground p-5 text-background sm:flex-row sm:items-center sm:p-6">
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl bg-background/10 sm:w-28">
        <MentorPhoto src={mentor.photo} name={mentor.name} sizes="112px" priority />
      </div>
      <div className="min-w-0 flex-1">
        <p id="next-session" className="flex items-center gap-2 text-sm font-medium text-background/60">
          Next session · {formatCountdown(new Date(booking.date).getTime() - now.getTime())}
          {booking.sample && <SamplePill className="border-background/30 text-background/70" />}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{booking.title}</h2>
        <p className="mt-1 text-background/70">with {mentor.name}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-background/80">
          <span className="flex items-center gap-1.5">
            <CalendarClockIcon className="size-4" aria-hidden="true" />
            {formatDate(booking.date, booking.timezone)}, {formatTime(booking.date, booking.timezone)}
          </span>
          {booking.durationMinutes && <span>{formatDuration(booking.durationMinutes)}</span>}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        {access?.access === "granted" && (
          <a href={access.details.url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "lg" }), "bg-background text-foreground hover:bg-background/90")}>
            Join session
          </a>
        )}
        <Link href={bookingHref(booking)} className={cn(buttonVariants({ size: "lg", variant: access?.access === "granted" ? "ghost" : "default" }), access?.access === "granted" ? "text-background hover:bg-background/10" : "bg-background text-foreground hover:bg-background/90")}>
          View details
        </Link>
        <p className="text-xs text-background/60">
          {access?.access === "locked" ? "Session link opens 30 minutes before" : "Reschedule or cancel from details"}
        </p>
      </div>
    </section>
  )
}

function NextSteps({ data, now, reminders }: { data: LearnerData; now: Date; reminders: boolean }) {
  const actions = nextActions(data, now, { reminders })

  return (
    <section aria-labelledby="next-steps" className="surface p-4 sm:p-5">
      <h2 id="next-steps" className="text-subheading">
        What&apos;s next
      </h2>
      {actions.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {actions.map((action) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className={cn("flex items-center gap-3 rounded-xl border p-3 text-sm transition hover:bg-muted focus-ring", action.tone === "warning" && "border-warning/30 bg-warning-soft")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{action.title}</span>
                  <span className="block truncate text-muted-foreground">{action.detail}</span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 text-sm text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <CheckCircle2Icon className="size-4 text-success" aria-hidden="true" />
            You&apos;re all caught up
          </p>
          <p className="mt-1">Nothing needs your attention. Ready for the next step?</p>
          <Link href="#guidance" className="link mt-2 inline-block">
            See suggested mentors
          </Link>
        </div>
      )}
    </section>
  )
}

function BookingList({ bookings, empty }: { bookings: Booking[]; empty: string }) {
  if (bookings.length === 0) {
    return <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <ul className="divide-y surface">
      {bookings.map((booking) => (
        <BookingRow key={booking.id} booking={booking} />
      ))}
    </ul>
  )
}

function NotesOverview({ data }: { data: LearnerData }) {
  const items = data.bookings.filter((booking) => {
    const notes = data.notes[booking.id]
    return notes && (notes.summary || notes.actions.length > 0 || notes.personal.trim())
  })

  return (
    <section aria-labelledby="notes-overview">
      <h2 id="notes-overview" className="text-subheading">
        Notes &amp; action plans
      </h2>
      {items.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((booking) => {
            const notes = data.notes[booking.id]
            const open = openActions(notes).length
            return (
              <li key={booking.id} className="relative surface p-4 transition hover:shadow-card">
                <p className="flex items-center gap-2 text-sm">
                  <FileTextIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <Link href={`${bookingHref(booking)}#notes`} className="font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
                    {booking.title}
                  </Link>
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{notes.summary ?? notes.personal}</p>
                <p className={cn("mt-2 text-xs font-medium", open > 0 ? "text-warning" : "text-success")}>
                  {notes.actions.length === 0 ? "No action steps" : open > 0 ? `${open} of ${notes.actions.length} steps open` : "All steps done"}
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState icon={FileTextIcon} title="No notes yet" description="After a session, your mentor's summary and action plan appear here. You can add private notes too." className="mt-4" />
      )}
    </section>
  )
}

function RecentActivity({ data }: { data: LearnerData }) {
  const feed = recentActivity(data)

  return (
    <section aria-labelledby="activity">
      <h2 id="activity" className="text-subheading">
        Recent activity
      </h2>
      {feed.length > 0 ? (
        <ul className="mt-4 divide-y surface">
          {feed.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-3 text-sm">
              <BellIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1">{item.text}</span>
              <time dateTime={item.at} className="shrink-0 text-xs text-muted-foreground">
                {formatDate(item.at)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Payments, confirmations and refunds will show here.</p>
      )}
    </section>
  )
}

function MentorUpdates({ data, now }: { data: LearnerData; now: Date }) {
  const updates = mentorUpdates(data, now)

  return (
    <section aria-labelledby="mentor-updates">
      <h2 id="mentor-updates" className="text-subheading">
        From your mentors
      </h2>
      {updates.length > 0 ? (
        <ul className="mt-4 divide-y surface">
          {updates.map(({ session, mentor }) => (
            <li key={session.id} className="relative flex items-center gap-3 p-3 transition hover:bg-muted/60 first:rounded-t-2xl last:rounded-b-2xl">
              <DateBlock iso={session.startsAt} timeZone={session.timezone} className="w-12 py-1.5" />
              <div className="min-w-0 flex-1 text-sm">
                <Link href={`/sessions/${session.id}`} className="font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
                  {session.title}
                </Link>
                <p className="truncate text-muted-foreground">
                  {mentor.name} is hosting · {formatPrice(session.price)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Live sessions from mentors you save or book will show here.</p>
      )}
    </section>
  )
}

function SavedMentors({ saved }: { saved: string[] }) {
  const mentors = saved.map((slug) => getMentor(slug)).filter((mentor) => mentor !== undefined)

  return (
    <section aria-labelledby="saved">
      <div className="flex items-center justify-between gap-4">
        <h2 id="saved" className="text-subheading">
          Saved mentors
        </h2>
        <Link href="/mentors" className="link text-sm">
          Discover more
        </Link>
      </div>
      {mentors.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mentors.map((mentor) => (
            <li key={mentor.slug} className="relative flex items-center gap-3 surface p-3 transition hover:shadow-card">
              <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-12" />
              <div className="min-w-0 flex-1">
                <Link href={`/mentors/${mentor.slug}`} className="font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
                  {mentor.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{mentor.role}</p>
              </div>
              <SaveButton slug={mentor.slug} name={mentor.name} className="relative z-10 border bg-card shadow-none" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={HeartIcon} title="No saved mentors" description="Tap the heart on any mentor to keep them here for later." className="mt-4" />
      )}
    </section>
  )
}

function Guidance({ data, now }: { data: LearnerData; now: Date }) {
  const picks = recommendedMentors(data, now)

  return (
    <section aria-labelledby="guidance-heading" id="guidance" className="scroll-mt-24">
      <div className="flex items-center justify-between gap-4">
        <h2 id="guidance-heading" className="flex items-center gap-2 text-subheading">
          <CompassIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          Find more guidance
        </h2>
        <Link href="/mentors" className="link text-sm">
          Browse all mentors
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{data.saved.length + data.bookings.length > 0 ? "Based on the mentors you saved and booked." : "Popular mentors to start with."}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((mentor) => (
          <li key={mentor.slug} className="relative flex items-center gap-3 surface p-3 transition hover:shadow-card">
            <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-12" />
            <div className="min-w-0 flex-1">
              <Link href={`/mentors/${mentor.slug}`} className="font-medium outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
                {mentor.name}
              </Link>
              <p className="truncate text-sm text-muted-foreground">{mentor.role}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
