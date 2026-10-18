import { FlaskConicalIcon } from "lucide-react"

import { Container } from "@/components/site/container"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type DocPageProps = {
  title: string
  intro: React.ReactNode
  updated?: string
  children: React.ReactNode
}

export function DocPage({ title, intro, updated, children }: DocPageProps) {
  return (
    <Container className="max-w-3xl pt-10 pb-16 sm:pt-16 sm:pb-24">
      <h1 className="text-title">{title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{intro}</p>
      {updated && <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>}
      <Alert variant="info" role="note" className="mt-6">
        <FlaskConicalIcon aria-hidden="true" />
        <AlertTitle>Demo prototype</AlertTitle>
        <AlertDescription>
          This is a prototype with sample data. No real payments are taken and no sessions take place. This page is not legal advice and has
          not been reviewed by a lawyer.
        </AlertDescription>
      </Alert>
      <div className="mt-10 space-y-10">{children}</div>
    </Container>
  )
}

export function DocSection({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("scroll-mt-24", className)}>
      <h2 id={id} className="text-subheading">
        {title}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-foreground/80 [&_a]:link [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
