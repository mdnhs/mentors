import type { Metadata } from "next"
import Link from "next/link"

import { DocPage, DocSection } from "@/components/site/doc-page"
import { HOLD_MINUTES } from "@/lib/booking-service"
import { policyRules } from "@/lib/booking-policy"
import { cancellationTerms } from "@/lib/offers"
import { PLATFORM_FEE_RATE } from "@/lib/pricing"
import { site } from "@/lib/site"
import type { CancellationPolicy } from "@/lib/types"

export const metadata: Metadata = {
  title: "Terms",
  description: `Booking, payment, cancellation and rescheduling terms for the ${site.name} demo.`,
  alternates: { canonical: "/terms" },
}

const policies: { policy: CancellationPolicy; label: string; appliesTo: string }[] = [
  { policy: "flexible", label: "Flexible", appliesTo: "1:1 calls marked flexible" },
  { policy: "standard", label: "Standard", appliesTo: "Other 1:1 calls" },
  { policy: "group", label: "Group session", appliesTo: "Seats in live group sessions" },
  { policy: "review", label: "Expert review", appliesTo: "Written CV, portfolio and document reviews" },
  { policy: "monthly", label: "Monthly mentorship", appliesTo: "Recurring monthly packages" },
]

const rescheduleRule = (policy: CancellationPolicy) => {
  const rule = policyRules[policy]
  if (rule.rescheduleHours === null || rule.maxReschedules === 0) return "Can't be rescheduled"
  return `${rule.maxReschedules === 1 ? "Once" : `Up to ${rule.maxReschedules} times`}, until ${rule.rescheduleHours} hours before`
}

export default function TermsPage() {
  return (
    <DocPage title="Booking terms" intro={`The rules for booking, paying for and cancelling sessions on ${site.name}.`}>
      <DocSection id="about" title="About these terms">
        <p>
          {site.name} is a prototype that connects learners with mentors. These terms describe how the demo behaves so you know what to expect
          when you try it. They are not a binding contract.
        </p>
      </DocSection>

      <DocSection id="booking" title="Booking and payment">
        <ul>
          <li>Prices are set by each mentor and shown in Bangladeshi taka (৳).</li>
          <li>A {Math.round(PLATFORM_FEE_RATE * 100)}% platform fee is added at checkout and shown before you pay.</li>
          <li>Choosing a time holds it for {HOLD_MINUTES} minutes. An unpaid hold expires and the time is released.</li>
          <li>A booking is confirmed once payment succeeds. In this demo, payments are simulated and no money is taken.</li>
        </ul>
      </DocSection>

      <DocSection id="cancellations" title="Cancellations, refunds and rescheduling">
        <p>Each offer uses one of these policies, and the offer shows which one next to its booking button.</p>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Cancellation and rescheduling policies</caption>
            <thead className="bg-muted text-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Policy
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Cancellation and refund
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Rescheduling
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {policies.map(({ policy, label, appliesTo }) => (
                <tr key={policy} className="align-top">
                  <th scope="row" className="px-4 py-3 font-medium text-foreground">
                    {label}
                    <span className="block text-xs font-normal text-muted-foreground">{appliesTo}</span>
                  </th>
                  <td className="px-4 py-3">{cancellationTerms[policy]}</td>
                  <td className="px-4 py-3">{rescheduleRule(policy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul>
          <li>Refunds are a share of what you paid, including the platform fee.</li>
          <li>A booking that hasn&apos;t been paid for can be cancelled at any time, with nothing to refund.</li>
          <li>If a mentor cancels a group session, every paid seat is refunded in full.</li>
          <li>Sessions that have already started can&apos;t be cancelled.</li>
        </ul>
      </DocSection>

      <DocSection id="conduct" title="Mentors and learners">
        <ul>
          <li>Mentor profiles show exactly which checks passed. A check isn&apos;t an endorsement or a guarantee of results.</li>
          <li>Only learners who completed a booking can leave a review.</li>
          <li>Be respectful in sessions. Mentors give advice, not professional, legal or immigration guarantees.</li>
        </ul>
      </DocSection>

      <DocSection id="questions" title="Questions">
        <p>
          The <Link href="/help">Help centre</Link> answers common questions. See the <Link href="/privacy">privacy notice</Link> for how your
          data is handled.
        </p>
      </DocSection>
    </DocPage>
  )
}
