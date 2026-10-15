"use client"

import { TriangleAlertIcon } from "lucide-react"

import { Container } from "@/components/site/container"
import { EmptyState } from "@/components/site/empty-state"
import { Button } from "@/components/ui/button"

export default function MentorsError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Container className="max-w-xl pt-16 pb-16 sm:pt-24 sm:pb-24">
      <EmptyState
        icon={TriangleAlertIcon}
        headingAs="h1"
        title="Mentors couldn't load"
        description="Something went wrong on our side. Your filters are saved in the link, so trying again keeps them."
      >
        <Button onClick={retry}>Try again</Button>
      </EmptyState>
    </Container>
  )
}
