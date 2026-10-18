import type { Metadata } from "next"
import { Suspense } from "react"

import { Inbox } from "@/components/messages/inbox"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = { title: "Messages" }

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function MessagesPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Inbox role="mentor" />
    </Suspense>
  )
}
