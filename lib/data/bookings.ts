import type { Booking, BookingNotes, ReviewedBooking } from "@/lib/types"

const HOUR_MS = 60 * 60_000

export const LIVE_DEMO_ID = "bk-1005"

// Starts at the top of the current hour and runs two, so it is in progress for at least an hour after load.
const liveSessionStart = () => new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS).toISOString()

// A saved copy keeps the time it was first seeded with, so it is moved to the present on every load.
export const withLiveDemo = (booking: Booking): Booking => (booking.id === LIVE_DEMO_ID && booking.status === "confirmed" ? { ...booking, date: liveSessionStart() } : booking)

export const demoBookings: Booking[] = [
  {
    id: LIVE_DEMO_ID,
    kind: "one-on-one",
    mentorSlug: "nusrat-jahan",
    offerId: "nusrat-roadmap",
    title: "AI career roadmap",
    date: liveSessionStart(),
    durationMinutes: 120,
    timezone: "Asia/Dhaka",
    total: 945,
    status: "confirmed",
    sample: true,
  },
  {
    id: "bk-1001",
    kind: "one-on-one",
    mentorSlug: "tanvir-rahman",
    offerId: "tanvir-mock",
    title: "System design mock interview",
    date: "2026-10-22T19:00:00+06:00",
    durationMinutes: 60,
    timezone: "Asia/Dhaka",
    total: 3150,
    status: "confirmed",
    sample: true,
  },
  {
    id: "bk-1002",
    kind: "group",
    mentorSlug: "imran-hasan",
    sessionId: "funded-masters-programs",
    title: "Finding Funded Master's Programs",
    date: "2026-10-31T18:00:00+06:00",
    durationMinutes: 75,
    timezone: "Asia/Dhaka",
    total: 261,
    status: "confirmed",
    sample: true,
  },
  {
    id: "bk-1003",
    kind: "review",
    mentorSlug: "arif-hossain",
    offerId: "arif-proposal",
    title: "Research proposal review",
    date: "2026-10-23T12:00:00+06:00",
    timezone: "Asia/Dhaka",
    total: 2625,
    status: "in-review",
    sample: true,
  },
  {
    id: "bk-1004",
    kind: "review",
    mentorSlug: "rumana-akter",
    offerId: "rumana-essay",
    title: "Scholarship essay review",
    date: "2026-10-26T12:00:00+06:00",
    timezone: "Asia/Dhaka",
    total: 1575,
    status: "in-review",
    sample: true,
  },
  {
    id: "bk-0994",
    kind: "one-on-one",
    mentorSlug: "arif-hossain",
    offerId: "arif-strategy",
    title: "PhD application strategy",
    date: "2026-09-27T16:00:00+06:00",
    durationMinutes: 45,
    timezone: "Asia/Dhaka",
    total: 1890,
    status: "completed",
    sample: true,
  },
  {
    id: "bk-0981",
    kind: "review",
    mentorSlug: "maliha-chowdhury",
    offerId: "maliha-cv",
    title: "CV review",
    date: "2026-09-12T12:00:00+06:00",
    timezone: "Asia/Dhaka",
    total: 630,
    status: "completed",
    sample: true,
  },
]

const otherLearner = (id: string, mentorSlug: string, date: string, durationMinutes: number): Booking => ({
  id,
  kind: "one-on-one",
  mentorSlug,
  title: "Booked session",
  date,
  durationMinutes,
  timezone: "Asia/Dhaka",
  total: 0,
  status: "confirmed",
})

// Confirmed bookings from other learners, so their times are already taken.
export const otherLearnerBookings: Booking[] = [
  otherLearner("ob-1", "tanvir-rahman", "2026-10-24T20:00:00+08:00", 45),
  otherLearner("ob-2", "nusrat-jahan", "2026-10-25T19:00:00+06:00", 45),
  otherLearner("ob-3", "nusrat-jahan", "2026-10-21T20:00:00+06:00", 30),
  otherLearner("ob-4", "arif-hossain", "2026-10-30T10:00:00+01:00", 45),
]

export const demoSavedMentors = ["nusrat-jahan", "arif-hossain", "sadia-islam"]

// Other learners' completed bookings that the sample reviews belong to.
export const reviewedBookings: ReviewedBooking[] = [
  { id: "pb-1", mentorSlug: "tanvir-rahman", kind: "one-on-one", status: "completed" },
  { id: "pb-2", mentorSlug: "tanvir-rahman", kind: "one-on-one", status: "completed" },
  { id: "pb-3", mentorSlug: "tanvir-rahman", kind: "review", status: "completed" },
  { id: "pb-4", mentorSlug: "nusrat-jahan", kind: "one-on-one", status: "completed" },
  { id: "pb-5", mentorSlug: "nusrat-jahan", kind: "mentorship", status: "completed" },
  { id: "pb-6", mentorSlug: "nusrat-jahan", kind: "one-on-one", status: "completed" },
  { id: "pb-7", mentorSlug: "arif-hossain", kind: "review", status: "completed" },
  { id: "pb-8", mentorSlug: "arif-hossain", kind: "one-on-one", status: "completed" },
  { id: "pb-9", mentorSlug: "sadia-islam", kind: "one-on-one", status: "completed" },
  { id: "pb-10", mentorSlug: "sadia-islam", kind: "review", status: "completed" },
  { id: "pb-11", mentorSlug: "farhan-kabir", kind: "one-on-one", status: "completed" },
  { id: "pb-12", mentorSlug: "farhan-kabir", kind: "one-on-one", status: "completed" },
  { id: "pb-13", mentorSlug: "farhan-kabir", kind: "group", status: "completed" },
  { id: "pb-14", mentorSlug: "maliha-chowdhury", kind: "review", status: "completed" },
  { id: "pb-15", mentorSlug: "maliha-chowdhury", kind: "one-on-one", status: "completed" },
  { id: "pb-16", mentorSlug: "rumana-akter", kind: "review", status: "completed" },
  { id: "pb-17", mentorSlug: "rumana-akter", kind: "one-on-one", status: "completed" },
  { id: "pb-18", mentorSlug: "imran-hasan", kind: "review", status: "completed" },
  { id: "pb-19", mentorSlug: "imran-hasan", kind: "one-on-one", status: "completed" },
  { id: "pb-20", mentorSlug: "imran-hasan", kind: "group", status: "completed" },
  { id: "pb-21", mentorSlug: "shafiq-uddin", kind: "review", status: "completed" },
  { id: "pb-22", mentorSlug: "farzana-haque", kind: "one-on-one", status: "completed" },
  { id: "pb-23", mentorSlug: "farzana-haque", kind: "one-on-one", status: "completed" },
  { id: "pb-24", mentorSlug: "sabbir-alam", kind: "review", status: "completed" },
]

export const demoNotes: Record<string, BookingNotes> = {
  "bk-0994": {
    summary: "Shortlist five labs and tailor the research statement to two of them. Reach out to supervisors before the November deadlines.",
    actions: [
      { id: "a1", text: "Shortlist five labs that fit your interests", done: true, by: "mentor" },
      { id: "a2", text: "Draft a one-page research statement", done: false, by: "mentor" },
      { id: "a3", text: "Email two supervisors with your draft", done: false, by: "mentor" },
    ],
    personal: "",
    sample: true,
  },
  "bk-0981": {
    summary: "Lead with impact numbers and cut the CV to one page.",
    actions: [{ id: "b1", text: "Rewrite bullet points with measurable results", done: false, by: "mentor" }],
    personal: "",
    sample: true,
  },
}
