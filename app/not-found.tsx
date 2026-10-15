import type { Metadata } from "next"
import Link from "next/link"
import { CompassIcon } from "lucide-react"

import { Container } from "@/components/site/container"
import { EmptyState } from "@/components/site/empty-state"
import { buttonVariants } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found",
}

export default function NotFound() {
  return (
    <Container className="max-w-xl pt-16 pb-16 sm:pt-24 sm:pb-24">
      <EmptyState icon={CompassIcon} headingAs="h1" title="We couldn't find that page" description="The link may be old, or the mentor may no longer be listed.">
        <Link href="/mentors" className={buttonVariants()}>
          Browse mentors
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </EmptyState>
    </Container>
  )
}
