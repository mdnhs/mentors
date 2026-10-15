import Link from "next/link"

import { cn } from "@/lib/utils"

type SectionHeadingProps = {
  title: string
  description?: string
  action?: { label: string; href: string }
  className?: string
}

export function SectionHeading({ title, description, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        <h2 className="text-heading">{title}</h2>
        {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="link inline-flex min-h-10 shrink-0 items-center text-sm"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
