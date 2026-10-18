import type { Metadata } from "next"
import { Suspense } from "react"

import { ReviewDetail } from "@/components/reviewer/review-detail"
import { BackLink } from "@/components/site/back-link"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "Application review",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminApplicationPage({ params }: PageProps<"/dashboard/admin/applications/[id]">) {
  return (
    <>
      <BackLink href="/dashboard/admin/applications">All applications</BackLink>
      <Suspense fallback={<Skeleton className="mt-6 h-96 rounded-2xl" />}>
        <Detail params={params} />
      </Suspense>
    </>
  )
}

async function Detail({ params }: Pick<PageProps<"/dashboard/admin/applications/[id]">, "params">) {
  return <ReviewDetail id={(await params).id} />
}
