import type { Metadata } from "next"

import { ReviewQueue } from "@/components/reviewer/review-queue"

export const metadata: Metadata = {
  title: "Mentor applications",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminApplicationsPage() {
  return <ReviewQueue basePath="/dashboard/admin/applications" title="Mentor applications" description="Review and decide on mentor applications." />
}
