"use client"

import { CalendarCheck2Icon, CalendarDaysIcon, EraserIcon, UsersRoundIcon } from "lucide-react"

import { clearSampleDataWithUndo } from "@/components/dashboard/clear-sample-data"
import { GroupSessionRow } from "@/components/mentor/group-session-row"
import { MentorBookingCard } from "@/components/mentor/mentor-booking-card"
import { GuardedLink } from "@/components/mentor/unsaved-guard"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { PageHeader, Panel, PortalEmpty } from "@/components/portal/ui"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMentorSessions } from "@/lib/data"
import { splitMentorBookings } from "@/lib/mentor-dashboard"
import { splitSessions } from "@/lib/mentor-insights"
import { resolveSession, seatsTaken } from "@/lib/sessions"

export function MentorBookings() {
  const { state, now, actor, mentor, bookings } = useMentorWorkspace()
  const hasSamples = bookings.some((item) => item.booking.sample)

  const header = (
    <PageHeader
      title="Bookings"
      description="Every call, review and group session with you."
      actions={
        hasSamples && (
          <ConfirmAction
            trigger={
              <Button variant="outline" size="sm">
                <EraserIcon aria-hidden="true" />
                Clear sample data
              </Button>
            }
            title="Clear sample data?"
            description={<p>Made-up bookings from other learners are removed. Your own records stay, and you can undo right after.</p>}
            confirmLabel="Clear sample data"
            cancelLabel="Keep samples"
            onConfirm={clearSampleDataWithUndo}
          />
        )
      }
    />
  )

  if (!now)
    return (
      <div>
        {header}
        <Skeleton className="h-11 w-80 max-w-full rounded-lg" />
        <Skeleton className="mt-4 h-72 rounded-2xl" />
      </div>
    )

  const { upcoming, completed, closed } = splitMentorBookings(bookings, now)
  const sessions = getMentorSessions(mentor.slug).map((session) => resolveSession(session, state))
  const groups = splitSessions(sessions, now)
  const orderedSessions = [...groups.upcoming, ...groups.past]
  const rowProps = { now, actor, mentorTimezone: mentor.timezone }

  const tabs = [
    { value: "upcoming", label: "Upcoming", count: upcoming.length },
    { value: "completed", label: "Completed", count: completed.length },
    { value: "group", label: "Group sessions", count: groups.upcoming.length },
  ]

  return (
    <div>
      {header}
      <Tabs defaultValue="upcoming" className="gap-4">
        <TabsList variant="line" aria-label="Booking lists" className="scrollbar-none -mx-4 w-auto max-w-none justify-start overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-none px-3">
              {tab.label}
              <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{tab.count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="upcoming">
          <Panel bodyClassName="py-1">
            {upcoming.length > 0 ? (
              <ul aria-label="Upcoming bookings" className="divide-y">
                {upcoming.map((item) => (
                  <MentorBookingCard key={item.booking.id} item={item} {...rowProps} />
                ))}
              </ul>
            ) : (
              <PortalEmpty headingAs="h2" icon={CalendarDaysIcon} title="No upcoming bookings" description="Live offers appear on your public profile.">
                <GuardedLink href="/dashboard/mentor/offers" className={buttonVariants({ variant: "outline" })}>
                  Manage offers
                </GuardedLink>
              </PortalEmpty>
            )}
          </Panel>
          <p className="mt-3 text-xs text-muted-foreground">Bookings confirm when the learner pays, so there&apos;s nothing to approve.</p>
        </TabsContent>

        <TabsContent value="completed">
          <Panel bodyClassName="py-1">
            {completed.length > 0 ? (
              <ul aria-label="Completed bookings" className="divide-y">
                {completed.map((item) => (
                  <MentorBookingCard key={item.booking.id} item={item} {...rowProps} />
                ))}
              </ul>
            ) : (
              <PortalEmpty headingAs="h2" icon={CalendarCheck2Icon} title="Nothing completed yet" description="Finished sessions show up here." />
            )}
          </Panel>
          {closed.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {closed.length} cancelled or expired {closed.length === 1 ? "booking is" : "bookings are"} hidden.
            </p>
          )}
        </TabsContent>

        <TabsContent value="group">
          <Panel bodyClassName="py-1">
            {orderedSessions.length > 0 ? (
              <ul aria-label="Group sessions" className="divide-y">
                {orderedSessions.map((session) => (
                  <GroupSessionRow key={session.id} session={session} taken={seatsTaken(session, state.bookings, now)} {...rowProps} />
                ))}
              </ul>
            ) : (
              <PortalEmpty headingAs="h2" icon={UsersRoundIcon} title="No group sessions" description="Scheduled sessions appear here." />
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
