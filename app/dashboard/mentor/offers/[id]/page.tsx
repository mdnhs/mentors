import type { Metadata } from "next"
import { Suspense } from "react"

import { OfferEditor } from "@/components/mentor/offer-editor"
import { Skeleton } from "@/components/ui/skeleton"
import { getMentor } from "@/lib/data"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"

export const metadata: Metadata = { title: "Edit offer" }

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

// Offers created in the browser render on demand; these give the build paths to prerender.
export function generateStaticParams() {
  return [{ id: "new" }, ...getMentor(DEMO_MENTOR_SLUG)!.offers.map((offer) => ({ id: offer.id }))]
}

export default function OfferPage({ params }: PageProps<"/dashboard/mentor/offers/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="mt-6 h-96 rounded-2xl" />}>
      <Editor params={params} />
    </Suspense>
  )
}

async function Editor({ params }: Pick<PageProps<"/dashboard/mentor/offers/[id]">, "params">) {
  return <OfferEditor id={(await params).id} />
}
