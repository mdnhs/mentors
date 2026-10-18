import { ReviewQueue } from "@/components/reviewer/review-queue"

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function ReviewerPage() {
  return <ReviewQueue />
}
