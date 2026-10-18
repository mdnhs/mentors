"use client"

import Link from "next/link"
import { useEffect } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { Container } from "@/components/site/container"
import { EmptyState } from "@/components/site/empty-state"
import { Button, buttonVariants } from "@/components/ui/button"

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Container className="max-w-xl pt-16 pb-16 sm:pt-24 sm:pb-24">
      <EmptyState
        icon={TriangleAlertIcon}
        headingAs="h1"
        title="Something went wrong"
        description="This page hit an unexpected error. Try again, or head back home. Your saved bookings in this browser are safe."
      >
        <Button onClick={retry}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </EmptyState>
      {error.digest && <p className="mt-6 text-center text-xs text-muted-foreground">Error reference: {error.digest}</p>}
    </Container>
  )
}
