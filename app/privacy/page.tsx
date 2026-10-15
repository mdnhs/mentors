import type { Metadata } from "next"

import { PlaceholderPage } from "@/components/site/placeholder-page"

export const metadata: Metadata = {
  title: "Privacy",
}

export default function PrivacyPage() {
  return (
    <PlaceholderPage
      title="Privacy policy"
      description="The privacy policy will be published here before launch. This demo stores bookings and saved mentors only in your browser."
    />
  )
}
