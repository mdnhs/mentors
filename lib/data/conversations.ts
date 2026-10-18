import type { Booking } from "@/lib/types"
import { demoBookings } from "@/lib/data/bookings"
import { incomingBookings } from "@/lib/data/incoming"
import type { Conversation, Message } from "@/lib/messaging"
import type { Role } from "@/lib/permissions"
import { site } from "@/lib/site"

const thread = (prefix: string, rows: [from: Message["from"], at: string, body: string][]): Message[] =>
  rows.map(([from, at, body], index) => ({ id: `${prefix}-${index + 1}`, from, at, body }))

const learnerConversations: Conversation[] = [
  {
    id: "c-tanvir",
    participant: { name: "Tanvir Rahman", subtitle: "Mentor · Software engineering", photo: "/images/mentors/tanvir-rahman.jpg" },
    bookingId: "bk-1001",
    unread: 2,
    messages: thread("l1", [
      ["them", "2026-10-15T16:20:00+06:00", "Hi Rafi, thanks for booking the system design mock. Anything specific you want to focus on?"],
      ["me", "2026-10-15T17:05:00+06:00", "Thanks Tanvir! I'm weakest on capacity estimation and picking the right database. Staff-level loop is in about a month."],
      ["them", "2026-10-15T17:40:00+06:00", "Good to know. I'll start with a payments-style problem so we can stress both. Think about how you'd handle idempotency."],
      ["them", "2026-10-17T21:10:00+06:00", "Quick prep tip: have a notebook or whiteboard tool ready. We'll draw the architecture live."],
      ["them", "2026-10-18T09:12:00+06:00", "Also, I can start 10 minutes early on the 22nd if you'd like extra time for questions at the end."],
    ]),
  },
  {
    id: "c-arif",
    participant: { name: "Arif Hossain", subtitle: "Mentor · PhD applications", photo: "/images/mentors/arif-hossain.jpg" },
    bookingId: "bk-0994",
    unread: 0,
    messages: thread("l2", [
      ["me", "2026-09-28T10:30:00+06:00", "Thanks for the session, Arif. The advice on contacting supervisors first was really useful."],
      ["them", "2026-09-28T11:15:00+06:00", "Glad it helped. Send me your shortlist when it's ready and I'll look at the top three."],
      ["me", "2026-10-14T20:45:00+06:00", "Shortlist is ready. Three groups in Germany and two in Japan. Should I email the Japan ones in English or Japanese?"],
      ["them", "2026-10-16T08:30:00+06:00", "English is fine for the first email, keep it under 150 words. Mention one specific paper from their group."],
    ]),
  },
  {
    id: "c-maliha",
    participant: { name: "Maliha Chowdhury", subtitle: "Mentor · CV and applications", photo: "/images/mentors/maliha-chowdhury.jpg" },
    bookingId: "bk-0981",
    unread: 0,
    messages: thread("l3", [
      ["them", "2026-09-14T10:00:00+06:00", "Your CV review is ready, with comments inline. The biggest change: lead each role with the outcome, not the duties."],
      ["me", "2026-09-14T14:20:00+06:00", "Got it, rewriting the experience section now. Thank you!"],
    ]),
  },
  {
    id: "c-imran",
    participant: { name: "Imran Hasan", subtitle: "Mentor · Study abroad", photo: "/images/mentors/imran-hasan.jpg" },
    bookingId: "bk-1002",
    unread: 0,
    messages: thread("l4", [
      ["me", "2026-10-12T19:00:00+06:00", "Will the funded programs session be recorded? I might miss the last 15 minutes."],
      ["them", "2026-10-13T09:40:00+06:00", "Recordings aren't included, but I'll share the slides and a list of programs with all attendees afterwards."],
    ]),
  },
  {
    id: "c-nusrat",
    participant: { name: "Nusrat Jahan", subtitle: "Mentor · Machine learning", photo: "/images/mentors/nusrat-jahan.jpg" },
    unread: 0,
    messages: thread("l5", [
      ["me", "2026-10-10T22:10:00+06:00", "Hi Nusrat, before I book: is the project review suitable for a classification project built mostly from tutorials?"],
      ["them", "2026-10-11T08:05:00+06:00", "Yes. I'd focus on how you'd extend it beyond the tutorial. Pick the date that suits you and add the repo link to your note."],
    ]),
  },
]

const mentorConversations: Conversation[] = [
  {
    id: "c-nabila",
    participant: { name: "Nabila Karim", subtitle: "Learner" },
    bookingId: "ib-3",
    unread: 1,
    messages: thread("m1", [
      ["them", "2026-10-17T22:30:00+08:00", "Hi Tanvir, I booked the 26th. I'm in Singapore, so the time is 8 pm for me. Is that still fine on your end?"],
      ["me", "2026-10-18T08:15:00+06:00", "Yes, 6 pm Dhaka time works. I'll send the prompt 24 hours before so you can think about it."],
      ["them", "2026-10-18T10:02:00+06:00", "Perfect, thank you! Should I prepare anything on the payments side beforehand?"],
    ]),
  },
  {
    id: "c-rafi",
    participant: { name: site.learner.name, subtitle: "Learner", photo: site.learner.photo },
    bookingId: "bk-1001",
    unread: 2,
    messages: thread("m2", [
      ["me", "2026-10-15T16:20:00+06:00", "Hi Rafi, thanks for booking the system design mock. Anything specific you want to focus on?"],
      ["them", "2026-10-15T17:05:00+06:00", "Thanks Tanvir! I'm weakest on capacity estimation and picking the right database."],
      ["me", "2026-10-15T17:40:00+06:00", "Good to know. I'll start with a payments-style problem so we can stress both."],
      ["them", "2026-10-18T09:30:00+06:00", "Thanks for the extra time offer. I'll take it, and I'll bring three questions about trade-offs."],
      ["them", "2026-10-18T09:31:00+06:00", "One more thing: can we use a shared diagramming tool instead of a screen share?"],
    ]),
  },
  {
    id: "c-anika",
    participant: { name: "Anika Rahman", subtitle: "Learner" },
    bookingId: "ib-1",
    unread: 0,
    messages: thread("m3", [
      ["me", "2026-10-08T21:10:00+06:00", "Great session today, Anika. Summary and action items are in your notes. Focus on the failure-mode section first."],
      ["them", "2026-10-09T08:50:00+06:00", "Thank you, this was exactly what I needed. Could we do a follow-up once I've reworked the design?"],
      ["me", "2026-10-09T09:20:00+06:00", "Of course. Book any slot from my availability once you're ready."],
    ]),
  },
  {
    id: "c-imtiaz",
    participant: { name: "Imtiaz Hossain", subtitle: "Learner" },
    bookingId: "ib-2",
    unread: 0,
    messages: thread("m4", [
      ["them", "2026-10-11T19:20:00+06:00", "Looking forward to tomorrow. I wrote down the two offers with the trade-offs I see, happy to share if useful."],
      ["me", "2026-10-11T20:00:00+06:00", "Please do. Paste them into the booking note so I can read them before the call."],
    ]),
  },
]

export function conversationsFor(role: Role): Conversation[] {
  if (role === "learner") return learnerConversations
  if (role === "mentor") return mentorConversations
  return []
}

export function bookingForConversation(conversation: Conversation): Booking | undefined {
  return conversation.bookingId ? [...demoBookings, ...incomingBookings].find((booking) => booking.id === conversation.bookingId) : undefined
}
