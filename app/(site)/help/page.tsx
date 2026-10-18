import type { Metadata } from "next"
import Link from "next/link"
import { ChevronDownIcon } from "lucide-react"

import { DocPage, DocSection } from "@/components/site/doc-page"
import { HOLD_MINUTES } from "@/lib/booking-service"
import { policyRules } from "@/lib/booking-policy"
import { cancellationTerms } from "@/lib/offers"
import { PLATFORM_FEE_RATE } from "@/lib/pricing"

export const metadata: Metadata = {
  title: "Help centre",
  description: "Answers about booking mentors, demo payments, cancellations, refunds, rescheduling, group sessions and becoming a mentor.",
  alternates: { canonical: "/help" },
}

type Faq = { question: string; answer: React.ReactNode }

const feePercent = `${Math.round(PLATFORM_FEE_RATE * 100)}%`
const { flexible, standard } = policyRules

const topics: { id: string; title: string; faqs: Faq[] }[] = [
  {
    id: "booking",
    title: "Booking a session",
    faqs: [
      {
        question: "How do I book a mentor?",
        answer: (
          <p>
            Open a mentor&apos;s profile from <Link href="/mentors">Find Mentors</Link>, pick one of their offers, choose a time and pay. Each
            time is shown with its timezone, so you know when the call starts for you.
          </p>
        ),
      },
      {
        question: "Is my time slot reserved while I pay?",
        answer: (
          <p>
            Yes. Choosing a time holds it for {HOLD_MINUTES} minutes. If payment isn&apos;t finished by then, the hold expires and the slot opens
            to others again.
          </p>
        ),
      },
      {
        question: "Where do I find my bookings?",
        answer: (
          <p>
            Log in and open <Link href="/dashboard">My sessions</Link>. Each booking shows its status, the joining details and what you can still
            change.
          </p>
        ),
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    faqs: [
      {
        question: "Which payment methods can I use?",
        answer: (
          <p>
            Checkout offers bKash, Nagad and card. In this demo every method is simulated: no money moves and no card or wallet details are
            sent anywhere.
          </p>
        ),
      },
      {
        question: "What does a booking cost?",
        answer: (
          <p>
            The mentor sets the price. A {feePercent} platform fee is added at checkout and shown before you pay. Group session prices are per
            seat.
          </p>
        ),
      },
    ],
  },
  {
    id: "cancellations",
    title: "Cancellations and refunds",
    faqs: [
      {
        question: "Can I cancel, and will I get my money back?",
        answer: (
          <>
            <p>Every offer shows its cancellation terms next to the booking button. The terms are:</p>
            <ul>
              <li>1:1 calls (flexible): {cancellationTerms.flexible}</li>
              <li>1:1 calls (standard): {cancellationTerms.standard}</li>
              <li>Group sessions: {cancellationTerms.group}</li>
              <li>Expert reviews: {cancellationTerms.review}</li>
              <li>Monthly mentorship: {cancellationTerms.monthly}</li>
            </ul>
            <p>
              See the <Link href="/terms#cancellations">booking terms</Link> for details.
            </p>
          </>
        ),
      },
      {
        question: "How do I cancel?",
        answer: <p>Open the booking from My sessions and choose Cancel. Before you confirm, you&apos;ll see exactly how much will be refunded.</p>,
      },
    ],
  },
  {
    id: "rescheduling",
    title: "Rescheduling",
    faqs: [
      {
        question: "Can I move a session to another time?",
        answer: (
          <p>
            Confirmed 1:1 calls can be moved once, up to {flexible.rescheduleHours} hours before the call for flexible offers or{" "}
            {standard.rescheduleHours} hours for standard ones. Group sessions and expert reviews can&apos;t be rescheduled; cancel instead.
          </p>
        ),
      },
    ],
  },
  {
    id: "group-sessions",
    title: "Group sessions",
    faqs: [
      {
        question: "How do group sessions work?",
        answer: (
          <p>
            A mentor runs a live session for a small group. Reserve a seat from <Link href="/sessions">Group Sessions</Link>; the seat count
            shows how many are left. Sign-up closes when the session starts or at the deadline shown on the session.
          </p>
        ),
      },
      {
        question: "What if the mentor cancels?",
        answer: <p>If a mentor cancels a session, every paid seat is refunded in full.</p>,
      },
    ],
  },
  {
    id: "mentors",
    title: "Becoming a mentor",
    faqs: [
      {
        question: "How do I become a mentor?",
        answer: (
          <p>
            <Link href="/become-a-mentor">Apply here</Link>. You&apos;ll share your experience and evidence such as your degree or employer,
            and our review team checks it before your profile goes live. Profiles show exactly which checks passed.
          </p>
        ),
      },
      {
        question: "How do mentors get paid?",
        answer: <p>Mentors set their own prices and are paid for completed bookings, minus a commission.</p>,
      },
    ],
  },
  {
    id: "contact",
    title: "Contact",
    faqs: [
      {
        question: "How do I reach support?",
        answer: (
          <p>
            This prototype has no support inbox, so messages aren&apos;t answered. In a live build this is where you would contact the team
            about a booking, a payment or a mentor.
          </p>
        ),
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <DocPage title="Help centre" intro="Quick answers about booking, paying for and managing your sessions.">
      <nav aria-label="Help topics">
        <ul className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <li key={topic.id}>
              <a
                href={`#${topic.id}`}
                className="inline-flex h-9 items-center rounded-lg border bg-card px-3 text-sm transition-colors hover:bg-muted focus-ring"
              >
                {topic.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {topics.map((topic) => (
        <DocSection key={topic.id} id={topic.id} title={topic.title}>
          <div className="space-y-2">
            {topic.faqs.map((faq) => (
              <details key={faq.question} className="group surface">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-4 py-3 font-medium text-foreground focus-ring [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="space-y-3 px-4 pb-4 text-sm">{faq.answer}</div>
              </details>
            ))}
          </div>
        </DocSection>
      ))}
    </DocPage>
  )
}
