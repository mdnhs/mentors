import type { Metadata } from "next"

import { PlaceholderPage } from "@/components/site/placeholder-page"

export const metadata: Metadata = {
  title: "Terms",
}

export default function TermsPage() {
  return (
    <PlaceholderPage
      title="Terms of service"
      description="The terms of service will be published here before launch. This demo build has no binding terms."
    />
  )
}
