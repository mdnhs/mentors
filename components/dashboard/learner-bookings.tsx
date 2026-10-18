"use client"

import Link from "next/link"
import { CalendarPlusIcon, EraserIcon, FileTextIcon, HistoryIcon } from "lucide-react"

import { BookingRow } from "@/components/dashboard/booking-row"
import { clearSampleDataWithUndo } from "@/components/dashboard/clear-sample-data"
import { PageHeader, Panel, PortalEmpty } from "@/components/portal/ui"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { bookingHref, splitBookings } from "@/lib/dashboard"
import { notedBookings, stepProgress } from "@/lib/learner-insights"
import { useAppState, useNow } from "@/lib/store"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

export function LearnerBookings() {
  const state = useAppState()
  const now = useNow()
  const hasSamples = state.bookings.some((booking) => booking.sample)

  return (
    <>
      <PageHeader
        title="Bookings"
        actions={
          <>
            {hasSamples && (
              <Button variant="outline" onClick={clearSampleDataWithUndo}>
                <EraserIcon aria-hidden="true" />
                Clear sample data
              </Button>
            )}
            <Link href="/mentors" className={buttonVariants()}>
              Find a mentor
            </Link>
          </>
        }
      />
      {now ? <BookingsBody now={now} /> : <Skeleton aria-label="Loading your bookings" className="h-64 rounded-2xl" />}
    </>
  )
}

function BookingsBody({ now }: { now: Date }) {
  const { bookings, notes, profile } = useAppState()
  const { upcoming, past } = splitBookings(bookings, now)

  return (
    <div className="space-y-8">
      <section aria-labelledby="bookings">
        <h2 id="bookings" className="sr-only">
          Your bookings
        </h2>
        <Tabs defaultValue="upcoming" className="gap-4">
          <TabsList className="h-10 rounded-xl p-1">
            <Segment value="upcoming" label="Upcoming" count={upcoming.length} />
            <Segment value="past" label="Past" count={past.length} />
          </TabsList>
          <TabsContent value="upcoming">
            <BookingList bookings={upcoming} timeZone={profile.timezone} empty={{ icon: CalendarPlusIcon, title: "Nothing coming up", description: "Book a session or join a live group." }} />
          </TabsContent>
          <TabsContent value="past">
            <BookingList bookings={past} timeZone={profile.timezone} empty={{ icon: HistoryIcon, title: "No past sessions yet", description: "Finished sessions land here." }} />
          </TabsContent>
        </Tabs>
      </section>

      <NotesOverview bookings={bookings} notes={notes} />
    </div>
  )
}

function Segment({ value, label, count }: { value: string; label: string; count: number }) {
  return (
    <TabsTrigger value={value} className="gap-2 rounded-lg px-4 focus-ring">
      {label}
      <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{count}</span>
    </TabsTrigger>
  )
}

function BookingList({ bookings, timeZone, empty }: { bookings: Booking[]; timeZone: string; empty: { icon: typeof CalendarPlusIcon; title: string; description: string } }) {
  return (
    <div className="rounded-2xl border bg-card px-5 py-4">
      {bookings.length === 0 ? (
        <PortalEmpty icon={empty.icon} title={empty.title} description={empty.description} className="py-8">
          <Link href="/mentors" className={buttonVariants({ variant: "outline" })}>
            Find a mentor
          </Link>
        </PortalEmpty>
      ) : (
        <ul className="divide-y">
          {bookings.map((booking) => (
            <BookingRow key={booking.id} booking={booking} timeZone={timeZone} />
          ))}
        </ul>
      )}
    </div>
  )
}

function NotesOverview({ bookings, notes }: { bookings: Booking[]; notes: ReturnType<typeof useAppState>["notes"] }) {
  const items = notedBookings(bookings, notes)

  return (
    <Panel id="notes-overview" title="Notes & action plans" className="scroll-mt-24">
      {items.length > 0 ? (
        <ul className="-my-1 divide-y">
          {items.map((booking) => {
            const entry = notes[booking.id]
            const progress = stepProgress(entry)
            return (
              <li key={booking.id}>
                <Link href={`${bookingHref(booking)}#notes`} className="-mx-2 flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60 focus-ring">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <FileTextIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{booking.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">{entry.summary ?? entry.personal}</span>
                  </span>
                  {progress.total > 0 ? (
                    <span className="flex w-24 shrink-0 flex-col items-end gap-1.5 sm:w-32">
                      <span className={cn("text-xs font-medium tabular-nums", progress.done === progress.total ? "text-success" : "text-muted-foreground")}>
                        {progress.done} of {progress.total} done
                      </span>
                      <span
                        role="progressbar"
                        aria-label={`${booking.title} steps done`}
                        aria-valuemin={0}
                        aria-valuemax={progress.total}
                        aria-valuenow={progress.done}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <span className={cn("block h-full rounded-full", progress.done === progress.total ? "bg-success" : "bg-primary")} style={{ width: `${progress.percent}%` }} />
                      </span>
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">No steps</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <PortalEmpty icon={FileTextIcon} title="No notes yet" description="Your mentor's summary and steps appear after a session." className="py-8" />
      )}
    </Panel>
  )
}
