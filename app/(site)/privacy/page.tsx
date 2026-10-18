import type { Metadata } from "next"
import Link from "next/link"

import { DocPage, DocSection } from "@/components/site/doc-page"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Privacy",
  description: `How the ${site.name} demo handles your data: everything stays in your own browser.`,
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <DocPage title="Privacy notice" intro={`What the ${site.name} demo does with the information you enter.`}>
      <DocSection id="summary" title="In short">
        <p>
          This demo has no server accounts and no database. Everything you do here, from signing in to booking and paying, is saved only in your
          own browser.
        </p>
      </DocSection>

      <DocSection id="what-we-store" title="What is stored in your browser">
        <p>The site uses your browser&apos;s local storage to remember:</p>
        <ul>
          <li>your simulated sign-in: the email you typed and the role you picked</li>
          <li>bookings, demo orders and payments, notes and saved mentors</li>
          <li>profile and notification settings, and mentor applications you start</li>
          <li>your light or dark theme choice</li>
        </ul>
        <p>Your latest mentor search is kept in session storage so the back link can return to it; it is cleared when you close the tab.</p>
      </DocSection>

      <DocSection id="what-we-dont" title="What isn't collected">
        <ul>
          <li>Nothing you enter is sent to a server, so we can&apos;t see it.</li>
          <li>Payments are simulated. No card, bKash or Nagad details are transmitted or charged.</li>
          <li>There are no analytics, advertising trackers or third-party cookies.</li>
          <li>Mentor profiles and reviews are sample data, not real people&apos;s records.</li>
        </ul>
      </DocSection>

      <DocSection id="your-choices" title="Clearing your data">
        <p>
          Log out to remove the sign-in, or clear the sample data from <Link href="/dashboard/settings">Settings</Link>. Clearing this
          site&apos;s data in your browser settings removes everything.
        </p>
      </DocSection>

      <DocSection id="live-build" title="If this becomes a live service">
        <p>
          A real launch would store accounts and payments on a server and would need its own privacy notice, reviewed for the laws that apply,
          before anyone&apos;s data is collected.
        </p>
      </DocSection>
    </DocPage>
  )
}
