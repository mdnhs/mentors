import { Suspense } from "react"

import { ReviewDetail } from "@/components/reviewer/review-detail"
import { Skeleton } from "@/components/ui/skeleton"
import { demoApplications } from "@/lib/data/applications"

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

// Applications are read in the browser, so other ids render on demand; these give the build paths to prerender.
export function generateStaticParams() {
  return demoApplications.map((application) => ({ id: application.id }))
}

export default function ReviewDetailPage({ params }: PageProps<"/dashboard/reviewer/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="mt-6 h-96 rounded-2xl" />}>
      <Detail params={params} />
    </Suspense>
  )
}

async function Detail({ params }: Pick<PageProps<"/dashboard/reviewer/[id]">, "params">) {
  return <ReviewDetail id={(await params).id} crumbs={[{ label: "Applications", href: "/dashboard/reviewer" }]} />
}
