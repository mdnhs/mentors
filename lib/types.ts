import type { Verification } from "@/lib/verification"

export type Track = "tech" | "education"

export type CategoryId =
  | "software-engineering"
  | "ai-ml"
  | "interview-prep"
  | "career-growth"
  | "study-abroad"
  | "scholarships"
  | "phd-research"

export type OfferType = "one-on-one" | "group" | "review" | "mentorship"

export type Language = "Bangla" | "English" | "Japanese"

// Unpublished offers stay in the data so mentors can edit them, but learners never see or book them.
// Archived offers are retired: hidden from learners like the others, but kept so past bookings still make sense.
export type OfferStatus = "published" | "paused" | "draft" | "archived"

export type CancellationPolicy = "flexible" | "standard" | "group" | "review" | "monthly"

type OfferBase = {
  id: string
  title: string
  description: string
  price: number
  includes: string[]
  cancellation: CancellationPolicy
  status: OfferStatus
}

export type OneOnOneOffer = OfferBase & { type: "one-on-one"; durationMinutes: number }

// Price and duration mirror the linked group session; a data test keeps them in sync.
export type GroupOffer = OfferBase & { type: "group"; durationMinutes: number; sessionId: string }

export type MentorshipOffer = OfferBase & {
  type: "mentorship"
  durationMinutes: number
  sessionsPerMonth: number
  openSpots: number
}

export type ReviewOffer = OfferBase & { type: "review"; deliveryDays: number; learnerProvides: string }

export type Offer = OneOnOneOffer | GroupOffer | MentorshipOffer | ReviewOffer

export type MentorLinkKind = "linkedin" | "github" | "website" | "portfolio" | "publications"

export type MentorLink = { kind: MentorLinkKind; url: string }

export type MentorAvailability = {
  // Weekday numbers (0 = Sunday) and HH:mm start times in the mentor's own timezone.
  days: number[]
  times: string[]
  // YYYY-MM-DD dates in the mentor's timezone.
  unavailableDates?: string[]
  bufferMinutes?: number
  minNoticeHours?: number
  maxAdvanceDays?: number
}

export type Mentor = {
  slug: string
  name: string
  photo?: string
  role: string
  organization: string
  experience: string
  city: string
  country: string
  timezone: string
  track: Track
  categories: CategoryId[]
  skills: string[]
  education: string
  languages: Language[]
  verification: Verification
  bio: string
  highlights: string[]
  links?: MentorLink[]
  offers: Offer[]
  availability: MentorAvailability
}

export type Review = {
  id: string
  mentorSlug: string
  author: string
  authorRole: string
  // Reviews only count when this booking exists, belongs to the mentor and is completed.
  bookingId: string
  rating: number
  date: string
  text: string
}

export type SessionStatus = "scheduled" | "cancelled"

export type GroupSession = {
  id: string
  title: string
  mentorSlug: string
  category: CategoryId
  // Topics the mentor covers, used for search and shown on the detail page.
  expertise: string[]
  format: string
  startsAt: string
  timezone: string
  durationMinutes: number
  price: number
  language: string
  summary: string
  agenda: string[]
  // `taken` counts seats held by other learners; this learner's own seat is added from their booking.
  seats: { total: number; taken: number }
  // Enrollment closes at this instant; defaults to the start time.
  registrationClosesAt?: string
  // Sessions are scheduled unless the mentor cancelled them. Ended sessions are derived from the clock.
  status?: SessionStatus
  cancellationReason?: string
}

// "in-review" is the in-progress state of written reviews, which have no call slot.
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "expired" | "in-review"

export type Booking = {
  id: string
  kind: OfferType
  mentorSlug: string
  title: string
  offerId?: string
  sessionId?: string
  // Session start time, or the delivery date for reviews.
  date: string
  durationMinutes?: number
  timezone: string
  total: number
  status: BookingStatus
  note?: string
  // Client-generated key that makes a repeated submission return the original booking.
  requestId?: string
  createdAt?: string
  // A pending booking holds its slot only until this instant.
  expiresAt?: string
  cancelledAt?: string
  refundPercent?: number
  rescheduleCount?: number
  // Policy captured when the booking was made.
  cancellation?: CancellationPolicy
  // Made-up demo record, not something this learner booked.
  sample?: true
  // Set on bookings other learners made with a mentor; absent for the signed-in learner's own.
  learnerName?: string
}

export type ActionItem = { id: string; text: string; done: boolean; by: "mentor" | "you" }

export type BookingNotes = {
  // Written by the mentor and shared with the learner; the learner can't edit it.
  summary?: string
  actions: ActionItem[]
  // Private to the learner.
  personal: string
  sample?: true
}

export type Profile = { name: string; email: string; timezone: string }

export type NotificationPrefs = { reminders: boolean; bookingUpdates: boolean; mentorActivity: boolean; tips: boolean }

export type ReviewedBooking = Pick<Booking, "id" | "mentorSlug" | "kind" | "status">
