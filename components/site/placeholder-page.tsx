import Link from "next/link"

import { Container } from "@/components/site/container"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Container className="max-w-2xl pt-16 pb-16 sm:pt-24 sm:pb-24">
      <h1 className="text-title">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-8")}>
        Back to home
      </Link>
    </Container>
  )
}
