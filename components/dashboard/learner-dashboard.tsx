"use client"

import Link from "next/link"
import { CalendarClockIcon, CalendarPlusIcon, HeartIcon, VideoIcon } from "lucide-react"

import { BookingRow } from "@/components/dashboard/booking-row"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { SaveButton } from "@/components/mentors/save-button"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMentor } from "@/lib/data"
import { formatDate, formatDuration, formatTime } from "@/lib/format"
import { site } from "@/lib/site"
import { useAppState } from "@/lib/store"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

export function LearnerDashboard() {
  const { bookings, saved } = useAppState()

  const upcoming = bookings
    .filter((booking) => booking.status !== "completed")
    .sort((a, b) => a.date.localeCompare(b.date))
  const past = bookings
    .filter((booking) => booking.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date))
  const next = upcoming.find((booking) => booking.kind !== "review")
  const savedMentors = saved.map((slug) => getMentor(slug)).filter((mentor) => mentor !== undefined)

  return (
    <div className="mt-6 space-y-12">
      {next ? (
        <NextSession booking={next} />
      ) : (
        <EmptyState icon={CalendarPlusIcon} title="No sessions booked yet" description="Find a mentor and book your first session.">
          <Link href="/mentors" className={buttonVariants()}>
            Find a mentor
          </Link>
        </EmptyState>
      )}

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

      <section aria-labelledby="saved">
        <div className="flex items-center justify-between gap-4">
          <h2 id="saved" className="text-subheading">
            Saved mentors
          </h2>
          <Link href="/mentors" className="link text-sm">
            Discover more
          </Link>
        </div>
        {savedMentors.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {savedMentors.map((mentor) => (
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
          <EmptyState
            icon={HeartIcon}
            title="No saved mentors"
            description="Tap the heart on any mentor to keep them here for later."
            className="mt-4"
          />
        )}
      </section>
    </div>
  )
}

function NextSession({ booking }: { booking: Booking }) {
  const mentor = getMentor(booking.mentorSlug)!

  return (
    <section aria-labelledby="next-session" className="flex flex-col gap-5 rounded-3xl bg-foreground p-5 text-background sm:flex-row sm:items-center sm:p-6">
      <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl bg-white/10 sm:w-28">
        <MentorPhoto src={mentor.photo} name={mentor.name} sizes="112px" priority />
      </div>
      <div className="min-w-0 flex-1">
        <p id="next-session" className="text-sm font-medium text-white/60">
          Next session
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{booking.title}</h2>
        <p className="mt-1 text-white/70">with {mentor.name}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
          <span className="flex items-center gap-1.5">
            <CalendarClockIcon className="size-4" aria-hidden="true" />
            {formatDate(booking.date, booking.timezone)}, {formatTime(booking.date, booking.timezone)}
          </span>
          {booking.durationMinutes && <span>{formatDuration(booking.durationMinutes)}</span>}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:items-end">
        <Button disabled size="lg" className="bg-white/10 text-white disabled:opacity-100 disabled:text-white/60">
          <VideoIcon aria-hidden="true" />
          Join call
        </Button>
        <p className="text-xs text-white/60">Opens 10 minutes before the start</p>
      </div>
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

export function DashboardGreeting() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <MentorAvatar name={site.learner.name} photo={site.learner.photo} className="size-12 sm:size-14" />
        <div>
          <h1 className="text-title">Hi, {site.learner.firstName}</h1>
        </div>
      </div>
      <Link href="/mentors" className={cn(buttonVariants(), "hidden sm:inline-flex")}>
        Find a mentor
      </Link>
    </div>
  )
}
