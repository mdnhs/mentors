"use client"

import Link from "next/link"
import { useEffect } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { Container } from "@/components/site/container"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"

export default function MentorProfileError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Container className="max-w-xl pt-16 pb-16 sm:pt-24 sm:pb-24">
      <EmptyState
        icon={TriangleAlertIcon}
        headingAs="h1"
        title="This profile couldn't load"
        description="Something went wrong on our side. Try again, or keep browsing other mentors."
      >
        <Button onClick={retry}>Try again</Button>
        <Link href="/mentors" className={buttonVariants({ variant: "outline" })}>
          Browse mentors
        </Link>
      </EmptyState>
    </Container>
  )
}
