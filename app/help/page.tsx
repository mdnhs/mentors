import type { Metadata } from "next"

import { PlaceholderPage } from "@/components/site/placeholder-page"

export const metadata: Metadata = {
  title: "Help centre",
}

export default function HelpPage() {
  return (
    <PlaceholderPage
      title="Help centre"
      description="Answers to common questions about booking, payments and sessions will live here. This demo build doesn't include support content yet."
    />
  )
}
