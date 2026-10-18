import { effectiveStatus, isActive } from "@/lib/booking-policy"
import { getMentor, getRating, getSessions } from "@/lib/data"
import { formatCountdown, formatPrice, formatTime } from "@/lib/format"
import { getListedMentors } from "@/lib/offers"
import { isUnpaid, type Order } from "@/lib/orders"
import { checkEnrollment, resolveSession, type SessionOverrides } from "@/lib/sessions"
import type { Booking, BookingNotes, GroupSession, Mentor } from "@/lib/types"

const HOUR_MS = 60 * 60_000

export type LearnerData = {
  bookings: Booking[]
  orders: Order[]
  saved: string[]
  notes: Record<string, BookingNotes>
} & SessionOverrides

export function splitBookings(bookings: Booking[], now: Date) {
  const upcoming = bookings.filter((booking) => isActive(effectiveStatus(booking, now))).sort((a, b) => a.date.localeCompare(b.date))
  const past = bookings.filter((booking) => !upcoming.includes(booking)).sort((a, b) => b.date.localeCompare(a.date))
  return { upcoming, past }
}

export function nextSession(upcoming: Booking[], now: Date) {
  return upcoming.find((booking) => booking.kind !== "review" && effectiveStatus(booking, now) === "confirmed" && new Date(booking.date) > now)
}

export const bookingHref = (booking: Booking) => `/dashboard/bookings/${booking.id}`

export type NextAction = { id: string; title: string; detail: string; href: string; tone: "warning" | "default" }

export const openActions = (notes?: BookingNotes) => notes?.actions.filter((item) => !item.done) ?? []

// What the learner should do next, most urgent first. `reminders` mirrors the learner's notification setting:
// with reminders off, the "get ready" nudge is left out, but nothing about money or their plan is hidden.
export function nextActions(data: LearnerData, now: Date, options: { reminders?: boolean } = {}): NextAction[] {
  const { reminders = true } = options
  const actions: NextAction[] = []
  const byId = new Map(data.bookings.map((booking) => [booking.id, booking]))

  for (const order of data.orders) {
    const booking = byId.get(order.bookingId)
    if (!booking) continue
    if (isUnpaid(order.status) && new Date(order.expiresAt) > now) {
      const failed = order.status === "payment-failed"
      actions.push({
        id: `pay-${order.id}`,
        title: `${failed ? "Retry payment" : "Finish payment"} for ${booking.title}`,
        detail: `Your time is held until ${formatTime(order.expiresAt)}.`,
        href: bookingHref(booking),
        tone: "warning",
      })
    } else if (order.status === "refund-pending") {
      actions.push({
        id: `refund-${order.id}`,
        title: `Refund of ${formatPrice(order.refundAmount ?? 0, order.quote.currency)} is pending`,
        detail: booking.title,
        href: bookingHref(booking),
        tone: "default",
      })
    }
  }

  for (const booking of data.bookings) {
    const start = new Date(booking.date).getTime()
    if (reminders && effectiveStatus(booking, now) === "confirmed" && booking.kind !== "review" && start > now.getTime() && start - now.getTime() <= 48 * HOUR_MS) {
      actions.push({ id: `prep-${booking.id}`, title: `Get ready for ${booking.title}`, detail: `Starts ${formatCountdown(start - now.getTime())}. Add your questions.`, href: bookingHref(booking), tone: "default" })
    }
  }

  for (const booking of data.bookings) {
    const open = openActions(data.notes[booking.id])
    if (open.length > 0) {
      actions.push({
        id: `plan-${booking.id}`,
        title: `${open.length} open ${open.length === 1 ? "step" : "steps"} from ${booking.title}`,
        detail: open[0].text,
        href: `${bookingHref(booking)}#notes`,
        tone: "default",
      })
    }
  }
  return actions.slice(0, 4)
}

export type Activity = { id: string; text: string; at: string }

export function recentActivity(data: Pick<LearnerData, "orders" | "bookings">, limit = 5): Activity[] {
  const byId = new Map(data.bookings.map((booking) => [booking.id, booking]))
  const events: Activity[] = []
  for (const order of data.orders) {
    const title = byId.get(order.bookingId)?.title ?? order.title
    for (const step of order.history) {
      const text = {
        confirmed: `Booking confirmed: ${title}`,
        "payment-failed": `Payment failed for ${title}`,
        cancelled: `Booking cancelled: ${title}`,
        "refund-pending": `Refund started for ${title}`,
        refunded: `Refund of ${formatPrice(order.refundAmount ?? 0, order.quote.currency)} completed for ${title}`,
      }[step.status as string]
      if (text) events.push({ id: `${order.id}-${step.status}-${step.at}`, text, at: step.at })
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
}

const followedSlugs = (data: LearnerData) => new Set([...data.saved, ...data.bookings.filter((booking) => booking.status !== "cancelled" && booking.status !== "expired").map((booking) => booking.mentorSlug)])

export type MentorUpdate = { session: GroupSession; mentor: Mentor }

// Open live sessions hosted by mentors the learner saved or has booked.
export function mentorUpdates(data: LearnerData, now: Date, limit = 3): MentorUpdate[] {
  const followed = followedSlugs(data)
  return getSessions()
    .map((session) => resolveSession(session, data))
    .filter((session) => followed.has(session.mentorSlug) && checkEnrollment(session, data.bookings, now).open)
    .slice(0, limit)
    .map((session) => ({ session, mentor: getMentor(session.mentorSlug)! }))
}

// Mentors in the same fields as the learner's saved and booked mentors; best rated first when there is no history.
export function recommendedMentors(data: LearnerData, now: Date, limit = 3): Mentor[] {
  const taken = new Set([...data.saved, ...data.bookings.map((booking) => booking.mentorSlug)])
  const interests = new Set(
    [...taken].flatMap((slug) => getMentor(slug)?.categories ?? [])
  )
  const score = (mentor: Mentor) => mentor.categories.filter((category) => interests.has(category)).length
  return getListedMentors(now)
    .filter((mentor) => !taken.has(mentor.slug) && (interests.size === 0 || score(mentor) > 0))
    .sort((a, b) => score(b) - score(a) || (getRating(b.slug)?.average ?? 0) - (getRating(a.slug)?.average ?? 0))
    .slice(0, limit)
}
