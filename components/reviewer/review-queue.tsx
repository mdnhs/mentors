"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { ClockIcon, InboxIcon } from "lucide-react"

import { SamplePill } from "@/components/dashboard/booking-row"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { PageHeader, Panel, PortalEmpty, Stat, StatStrip } from "@/components/portal/ui"
import { ApplicationStatusBadge } from "@/components/reviewer/status-badge"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { usePrincipal } from "@/lib/auth"
import { getCategory } from "@/lib/categories"
import { visibleTo, type Application } from "@/lib/mentor-application"
import { ageOf, overdueCount, parseView, queueCounts, queueFor, reviewViews, type ReviewView } from "@/lib/review-insights"
import { useAppState, useNow } from "@/lib/store"
import { cn } from "@/lib/utils"

type QueueProps = { basePath?: string; title?: string; description?: string }

export function ReviewQueue(props: QueueProps) {
  // The active view lives in the URL, which a prerendered page only knows in the browser.
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Queue {...props} />
    </Suspense>
  )
}

function Queue({ basePath = "/dashboard/reviewer", title = "Applications", description = "Check new mentors before they go live." }: QueueProps) {
  const { applications } = useAppState()
  const principal = usePrincipal()
  const nowMs = useNow()
  const view = parseView(useSearchParams().get("view"))
  const now = nowMs === null ? null : new Date(nowMs)
  const queue = visibleTo(principal, applications)
  const counts = now ? queueCounts(queue, now) : null
  const overdue = now ? overdueCount(queue, now) : 0
  const shown = queueFor(queue, view)
  const hrefFor = (id: ReviewView) => (id === "open" ? basePath : `${basePath}?view=${id}`)
  const viewLabel = reviewViews.find((item) => item.id === view)!.label

  return (
    <>
      <PageHeader title={title} description={description} />

      <StatStrip label="Queue summary">
        {reviewViews.map((item) => (
          <QueueStat
            key={item.id}
            label={item.label}
            value={counts?.[item.id] ?? "–"}
            href={hrefFor(item.id)}
            active={view === item.id}
            hint={item.id === "open" ? (overdue > 0 ? <span className="text-warning">{overdue} past 3 days</span> : "On time") : item.id === "decided" ? "Last 30 days" : undefined}
          />
        ))}
      </StatStrip>

      <div role="group" aria-label="Filter applications" className="scrollbar-none -mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-xl border bg-card p-1">
          {reviewViews.map((item) => (
            <Link
              key={item.id}
              href={hrefFor(item.id)}
              scroll={false}
              aria-current={view === item.id ? "true" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm whitespace-nowrap transition-colors focus-ring",
                view === item.id ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <Panel title={viewLabel} className="mt-4" id="queue" action={<span className="text-sm text-muted-foreground tabular-nums">{shown.length}</span>} bodyClassName="px-2 pb-2">
        {shown.length > 0 ? (
          <ul aria-label={`${viewLabel} applications`} className="divide-y">
            {shown.map((item) => (
              <QueueRow key={item.id} application={item} href={`${basePath}/${item.id}`} now={now} />
            ))}
          </ul>
        ) : view === "decided" ? (
          <PortalEmpty icon={InboxIcon} title="No decisions yet" description="Approved and declined applications land here.">
            <Link href={hrefFor("open")} className={buttonVariants({ variant: "outline" })}>
              Back to the queue
            </Link>
          </PortalEmpty>
        ) : (
          <PortalEmpty icon={InboxIcon} title="Queue clear" description="Nothing is waiting in this view.">
            <Link href={hrefFor("decided")} className={buttonVariants({ variant: "outline" })}>
              View decided
            </Link>
          </PortalEmpty>
        )}
      </Panel>
    </>
  )
}

function QueueStat({ active, ...props }: React.ComponentProps<typeof Stat> & { active: boolean }) {
  // Stat renders its own link, so the active marker and aria-current wrap it.
  return (
    <div aria-current={active ? "true" : undefined} className={cn("relative", active && "bg-accent/40")}>
      {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
      <Stat {...props} />
    </div>
  )
}

function QueueRow({ application, href, now }: { application: Application; href: string; now: Date | null }) {
  const { basic, background, expertise } = application.data
  const shownCategories = expertise.categories.slice(0, 2)
  const extra = expertise.categories.length - shownCategories.length
  const age = now ? ageOf(application, now) : null

  return (
    <li className="relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-3 transition-colors hover:bg-muted/60 sm:flex-nowrap">
      <MentorAvatar name={basic.fullName} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <Link href={href} className="truncate font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
            {basic.fullName}
          </Link>
          {application.sample && <SamplePill />}
        </p>
        <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">
            {background.role}, {background.organization}
          </span>
          <span className="hidden shrink-0 items-center gap-1 md:flex">
            {shownCategories.map((id) => (
              <span key={id} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
                {getCategory(id).label}
              </span>
            ))}
            {extra > 0 && <span className="text-xs">+{extra}</span>}
          </span>
        </p>
      </div>
      <div className="flex w-full items-center gap-3 pl-13 sm:w-auto sm:pl-0">
        <ApplicationStatusBadge status={application.status} />
        {age && (
          <span className={cn("flex items-center gap-1 text-sm whitespace-nowrap tabular-nums sm:w-36 sm:justify-end", age.overdue ? "font-medium text-warning" : "text-muted-foreground")}>
            <ClockIcon className="size-3.5" aria-hidden="true" />
            {age.label}
          </span>
        )}
      </div>
    </li>
  )
}
