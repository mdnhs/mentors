import type { Metadata } from "next"

import { ReviewModeration } from "@/components/admin/review-moderation"

export const metadata: Metadata = {
  title: "Review moderation",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminReviewsPage() {
  return <ReviewModeration />
}
