import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowDownRightIcon, ArrowUpRightIcon, ChevronRightIcon, MinusIcon, type LucideIcon } from "lucide-react"

import { PageBreadcrumbs, type Crumb } from "@/components/ui/page-breadcrumbs"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  crumbs?: Crumb[]
  className?: string
}) {
  return (
    <header className={cn("mb-8", className)}>
      {crumbs && <PageBreadcrumbs items={crumbs} className="mb-3" />}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

// A titled block of the page. Panels hold lists and charts; numbers belong in a StatStrip.
export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section id={id} aria-labelledby={headingId} className={cn("rounded-2xl border bg-card", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-base font-semibold">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={cn(title || action ? "px-5 pb-5" : "p-5", bodyClassName)}>{children}</div>
    </section>
  )
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-0.5 rounded-md text-sm font-medium text-primary hover:underline focus-ring">
      {children}
      <ChevronRightIcon className="size-4" aria-hidden="true" />
    </Link>
  )
}

// Related figures share one bordered strip with dividers, so they read as a set rather than a wall of cards.
// Related figures share one bordered strip with dividers, so they read as a set rather than a wall of cards.
export function StatStrip({ children, className, label, columns }: { children: ReactNode; className?: string; label?: string; columns?: 3 }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card", className)}>
      {/* Every cell draws its right and bottom edge; the negative margin tucks the outer ones under the frame. */}
      <dl aria-label={label} className={cn("-mr-px -mb-px grid grid-cols-2 [&>*]:border-r [&>*]:border-b", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]")}>
        {children}
      </dl>
    </div>
  )
}

export function Stat({
  label,
  value,
  delta,
  hint,
  href,
  trend,
}: {
  label: string
  value: ReactNode
  // Fractional change against the previous period; null when there is nothing to compare.
  delta?: number | null
  hint?: ReactNode
  href?: string
  trend?: number[]
}) {
  const body = (
    <>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex items-end justify-between gap-3">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {trend && trend.length > 1 && <Sparkline values={trend} className="mb-1" />}
      </dd>
      {(delta !== undefined || hint) && (
        <dd className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {delta !== undefined && <Delta value={delta} />}
          {hint}
        </dd>
      )}
    </>
  )

  return href ? (
    <Link href={href} className="block p-4 transition-colors hover:bg-muted focus-ring sm:p-5">
      {body}
    </Link>
  ) : (
    <div className="p-4 sm:p-5">{body}</div>
  )
}

export function Delta({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <MinusIcon className="size-3" aria-hidden="true" />
        No earlier data
      </span>
    )
  }
  const up = value > 0
  const flat = Math.abs(value) < 0.005
  const Icon = flat ? MinusIcon : up ? ArrowUpRightIcon : ArrowDownRightIcon
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", flat ? "text-muted-foreground" : up ? "text-success" : "text-destructive")}>
      <Icon className="size-3" aria-hidden="true" />
      {flat ? "No change" : `${up ? "+" : "−"}${Math.round(Math.abs(value) * 100)}%`}
    </span>
  )
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 64},${20 - ((value - min) / span) * 18 - 1}`).join(" ")
  return (
    <svg viewBox="0 0 64 20" aria-hidden="true" className={cn("h-5 w-16 shrink-0 text-primary", className)} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// One row in a panel list: leading visual, text, and trailing meta or action.
export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  href,
  className,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  href?: string
  className?: string
}) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </>
  )
  const base = cn("flex items-center gap-3 py-3", className)
  return href ? (
    <Link href={href} className={cn(base, "-mx-2 rounded-lg px-2 transition-colors hover:bg-muted/60 focus-ring")}>
      {content}
    </Link>
  ) : (
    <div className={base}>{content}</div>
  )
}

export function PortalEmpty({
  icon: Icon,
  title,
  description,
  children,
  className,
  headingAs: Heading = "h3",
}: {
  icon: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  className?: string
  headingAs?: "h2" | "h3"
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="relative flex size-14 items-center justify-center">
        <span aria-hidden="true" className="absolute inset-0 rotate-6 rounded-2xl bg-accent" />
        <span aria-hidden="true" className="absolute inset-0 -rotate-6 rounded-2xl border bg-card" />
        <Icon className="relative size-6 text-primary" aria-hidden="true" />
      </span>
      <Heading className="mt-5 font-semibold">{title}</Heading>
      {description && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
