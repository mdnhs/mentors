import { effectiveStatus, isActive } from "@/lib/booking-policy"
import { hasOpenTimes } from "@/lib/availability-settings"
import { formatCountdown, formatDate, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import { MIN_PAYOUT, type FinanceSummary } from "@/lib/mentor-finance"
import type { Order } from "@/lib/orders"
import type { Booking, MentorAvailability, Offer } from "@/lib/types"

const HOUR_MS = 60 * 60_000

export type MentorBooking = { booking: Booking; order?: Order; learner: string; scope: "learner" | "incoming" }

type Source = { bookings: Booking[]; orders: Order[] }

// The mentor's bookings from both places they live: the signed-in learner's own and other learners' sample bookings.
export function mentorBookings(own: Source, incoming: Source, slug: string, ownLearnerName: string): MentorBooking[] {
  const collect = (source: Source, scope: MentorBooking["scope"]) =>
    source.bookings
      .filter((booking) => booking.mentorSlug === slug && booking.kind !== "group")
      .map((booking) => ({ booking, scope, order: source.orders.find((order) => order.bookingId === booking.id), learner: booking.learnerName ?? ownLearnerName }))
  return [...collect(incoming, "incoming"), ...collect(own, "learner")]
}

export function splitMentorBookings(items: MentorBooking[], now: Date) {
  const status = (item: MentorBooking) => effectiveStatus(item.booking, now)
  const upcoming = items.filter((item) => isActive(status(item))).sort((a, b) => a.booking.date.localeCompare(b.booking.date))
  const completed = items.filter((item) => status(item) === "completed").sort((a, b) => b.booking.date.localeCompare(a.booking.date))
  const closed = items.filter((item) => !upcoming.includes(item) && !completed.includes(item)).sort((a, b) => b.booking.date.localeCompare(a.booking.date))
  return { upcoming, completed, closed }
}

export type MentorTask = { id: string; title: string; detail: string; href: string; cta: string }

export type TaskContext = {
  bookings: MentorBooking[]
  offers: Offer[]
  availability: MentorAvailability
  summary: FinanceSummary
  mentorTimezone: string
}

// What the mentor should do next, most pressing first: a session soon, a payout, unfinished offers, then setup gaps.
export function mentorTasks({ bookings, offers, availability, summary, mentorTimezone }: TaskContext, now: Date): MentorTask[] {
  const tasks: MentorTask[] = []
  const { upcoming } = splitMentorBookings(bookings, now)
  const confirmed = upcoming.filter((item) => effectiveStatus(item.booking, now) === "confirmed" && item.booking.kind !== "review")

  const soon = confirmed.find((item) => new Date(item.booking.date).getTime() - now.getTime() <= 24 * HOUR_MS)
  if (soon) {
    tasks.push({
      id: `prep-${soon.booking.id}`,
      title: `Get ready for ${soon.booking.title}`,
      detail: `${soon.learner}, ${formatCountdown(new Date(soon.booking.date).getTime() - now.getTime())}${soon.booking.note ? `. Goals: ${soon.booking.note}` : ""}`,
      href: "#bookings",
      cta: "View booking",
    })
  }

  const reviews = upcoming.filter((item) => item.booking.kind === "review")
  if (reviews.length > 0) {
    tasks.push({ id: "reviews", title: `${reviews.length} written ${reviews.length === 1 ? "review" : "reviews"} to deliver`, detail: reviews[0].booking.title, href: "#bookings", cta: "View booking" })
  }

  if (summary.availableForPayout >= MIN_PAYOUT && summary.pendingPayouts === 0) {
    tasks.push({ id: "payout", title: `${formatPrice(summary.availableForPayout, summary.currency)} is ready to pay out`, detail: "Earned on completed sessions.", href: "/dashboard/mentor/earnings", cta: "Request payout" })
  }

  for (const offer of offers.filter((item) => item.status === "draft")) {
    tasks.push({ id: `draft-${offer.id}`, title: `Finish and publish “${offer.title}”`, detail: "It's a draft, so learners can't see it yet.", href: `/dashboard/mentor/offers/${offer.id}`, cta: "Open offer" })
  }

  if (!offers.some((offer) => offer.status === "published")) {
    tasks.push({ id: "no-live", title: "Publish an offer so learners can book you", detail: "None of your offers are live.", href: "/dashboard/mentor/offers", cta: "Manage offers" })
  } else if (offers.some((offer) => offer.status === "published" && offer.type !== "review" && offer.type !== "group") && !hasOpenTimes(availability)) {
    tasks.push({ id: "no-times", title: "Open some times for bookings", detail: "Your calls can't be booked without available times.", href: "/dashboard/mentor/availability", cta: "Set availability" })
  }

  const next = confirmed.find((item) => !soon || item.booking.id !== soon.booking.id)
  if (next) {
    tasks.push({ id: `next-${next.booking.id}`, title: `Next up: ${next.booking.title}`, detail: `${next.learner}, ${formatDate(next.booking.date, mentorTimezone)} at ${formatTime(next.booking.date, mentorTimezone)} ${timezoneLabel(mentorTimezone, next.booking.date).split(" ")[0]}`, href: "#bookings", cta: "View booking" })
  }
  return tasks
}
