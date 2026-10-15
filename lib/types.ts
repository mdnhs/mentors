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
export type OfferStatus = "published" | "paused" | "draft"

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
  verification: { identity: boolean; experience: boolean }
  bio: string
  highlights: string[]
  links?: MentorLink[]
  offers: Offer[]
  availability: {
    // Weekday numbers (0 = Sunday) and HH:mm start times in Asia/Dhaka.
    days: number[]
    times: string[]
  }
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

export type GroupSession = {
  id: string
  title: string
  mentorSlug: string
  category: CategoryId
  format: string
  startsAt: string
  durationMinutes: number
  price: number
  language: string
  summary: string
  agenda: string[]
  seats?: { total: number; taken: number }
}

export type BookingStatus = "upcoming" | "completed" | "in-review"

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
}

export type ReviewedBooking = Pick<Booking, "id" | "mentorSlug" | "kind" | "status">
