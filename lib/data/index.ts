import { demoBookings, reviewedBookings } from "@/lib/data/bookings"
import { mentors } from "@/lib/data/mentors"
import { reviews } from "@/lib/data/reviews"
import { groupSessions } from "@/lib/data/sessions"
import type { Mentor, Review, ReviewedBooking } from "@/lib/types"

// Single access layer so the demo data can later be swapped for API calls.
export function getMentors() {
  return mentors
}

export function getMentor(slug: string) {
  return mentors.find((mentor) => mentor.slug === slug)
}

// A review counts only when it comes from a completed booking with the same mentor.
export function eligibleReviews(list: Review[], bookings: ReviewedBooking[]) {
  const byId = new Map(bookings.map((booking) => [booking.id, booking]))
  return list.flatMap((review) => {
    const booking = byId.get(review.bookingId)
    if (!booking || booking.status !== "completed" || booking.mentorSlug !== review.mentorSlug) return []
    return [{ ...review, offerType: booking.kind }]
  })
}

const publishedReviews = eligibleReviews(reviews, [...reviewedBookings, ...demoBookings])

export function getReviews(slug: string) {
  return publishedReviews
    .filter((review) => review.mentorSlug === slug)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getRating(slug: string) {
  const list = publishedReviews.filter((review) => review.mentorSlug === slug)
  if (list.length === 0) return null
  const average = list.reduce((sum, review) => sum + review.rating, 0) / list.length
  return { average: Math.round(average * 10) / 10, count: list.length }
}

export function getLocation(mentor: Mentor) {
  return mentor.city === mentor.country ? mentor.city : `${mentor.city}, ${mentor.country}`
}

// Plain-language availability derived from the weekly schedule (0 = Sunday; Fri/Sat is the Bangladeshi weekend).
export function availabilityLabel(mentor: Mentor) {
  const { days, times } = mentor.availability
  if (days.length === 0 || times.length === 0) return "No open times"
  const weekend = days.every((day) => day === 5 || day === 6)
  const weekday = days.every((day) => day !== 5 && day !== 6)
  const period = times.every((t) => t >= "17:00") ? "evenings" : times.every((t) => t < "12:00") ? "mornings" : "daytime"
  if (weekend) return `Weekend ${period}`
  if (weekday) return `Weekday ${period}`
  return `Most days, ${period}`
}

export function getSessions() {
  return [...groupSessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function getSession(id: string) {
  return groupSessions.find((session) => session.id === id)
}

export function getMentorSessions(slug: string) {
  return getSessions().filter((session) => session.mentorSlug === slug)
}

export const SERVICE_FEE_RATE = 0.05

export function priceBreakdown(price: number) {
  const fee = Math.round(price * SERVICE_FEE_RATE)
  return { price, fee, total: price + fee }
}
