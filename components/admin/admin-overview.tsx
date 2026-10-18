"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRightIcon } from "lucide-react"

import { AdminPageHeader, DemoNotice, MetricCard, percent } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { Chip } from "@/components/filters/chip"
import { BarChart } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { businessMetrics, comparePeriods, dailyTrend, metricDefinitions, percentChange } from "@/lib/admin-metrics"
import { suspendedMentorSlugs } from "@/lib/admin"
import { getMentors } from "@/lib/data"
import { formatPrice } from "@/lib/format"
import { useNow } from "@/lib/store"

const ranges = [7, 30, 90] as const
const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const measures = { revenue: "Net revenue", bookings: "Bookings made" } as const

export function AdminOverview() {
  const source = useAdminSource()
  const now = useNow()
  const [range, setRange] = useState<(typeof ranges)[number]>(30)
  const [measure, setMeasure] = useState<keyof typeof measures>("revenue")

  const records = { bookings: [...source.bookings, ...source.incoming.bookings], orders: [...source.orders, ...source.incoming.orders] }
  const metrics = now ? businessMetrics({ ...records, mentors: getMentors(), suspendedMentors: suspendedMentorSlugs(source.admin) }, now) : null
  const trend = now ? dailyTrend(records, now, range) : []
  const periods = now ? comparePeriods(records, now, range) : null
  const previousLabel = `previous ${range} days`

  const queues = [
    { label: "Applications to review", detail: "Submitted or under review", count: source.applications.filter((item) => item.status === "submitted" || item.status === "under-review").length, href: "/dashboard/admin/applications" },
    { label: "Refunds pending", detail: "Refund started but not settled", count: [...source.orders, ...source.incoming.orders].filter((order) => order.status === "refund-pending").length, href: "/dashboard/admin/refunds?refunds.status=pending" },
    { label: "Open disputes", detail: "Open or investigating", count: source.admin.disputes.filter((item) => item.status === "open" || item.status === "investigating").length, href: "/dashboard/admin/refunds?disputes.status=unresolved#dispute-table" },
    { label: "Payouts pending", detail: "Requested, not yet paid", count: source.payouts.filter((item) => item.status === "pending").length, href: "/dashboard/admin/payouts?payouts.status=pending" },
    { label: "Restricted accounts", detail: "Accounts currently restricted", count: Object.values(source.admin.accounts).filter((item) => item.status === "restricted").length, href: "/dashboard/admin/users?accounts.status=restricted" },
    { label: "Moderated items", detail: "Suspended mentors, paused offers, hidden reviews", count: Object.values(source.admin.mentors).filter((m) => m.status === "suspended").length + Object.values(source.admin.offers).filter((o) => o.status === "paused").length + Object.values(source.admin.reviews).filter((r) => r.status === "hidden").length, href: "/dashboard/admin/moderation?mentors.status=suspended&offers.moderation=paused" },
  ]

  const value = (id: string, kind: string, raw: number) => (kind === "money" ? formatPrice(raw) : kind === "rate" ? percent(raw) : String(raw))

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Overview"
        description="Operational queues and marketplace metrics, computed from bookings, order transactions and the mentor catalogue."
      />
      <DemoNotice>
        Figures below are computed from this demo’s stored records{metrics?.demoOnly ? " — all of them sample data" : ""}. {metrics ? `${metrics.counts.sampleBookings} of ${metrics.counts.bookings} bookings and ${metrics.counts.sampleOrders} of ${metrics.counts.orders} orders are marked Sample.` : ""} Nothing here reflects real payments, users or documents.
      </DemoNotice>

      {!metrics ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : (
        <>
          <section aria-labelledby="metrics">
            <h2 id="metrics" className="text-subheading">
              Business metrics
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {metricDefinitions.map((definition) => {
                const raw = metrics[definition.id] as number
                return <MetricCard key={definition.id} label={definition.label} value={value(definition.id, definition.kind, raw)} detail={definition.detail} tone={definition.kind === "money" ? "accent" : "neutral"} />
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {metrics.counts.learners} learners, {metrics.counts.repeatLearners} with repeat bookings · {metrics.counts.paidOrders} paid orders of {metrics.counts.orders} · {metrics.counts.refundedOrders} refunded · {metrics.counts.cancelledBookings} cancelled bookings.
            </p>
          </section>

          <section aria-labelledby="trend">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="trend" className="text-subheading">
                Trend
              </h2>
              <div className="flex flex-wrap gap-4">
                <div role="group" aria-label="Measure" className="flex gap-1.5">
                  {(Object.keys(measures) as (keyof typeof measures)[]).map((id) => (
                    <Chip key={id} active={measure === id} onClick={() => setMeasure(id)} className="h-8 px-2.5">
                      {measures[id]}
                    </Chip>
                  ))}
                </div>
                <div role="group" aria-label="Date range" className="flex gap-1.5">
                  {ranges.map((days) => (
                    <Chip key={days} active={range === days} onClick={() => setRange(days)} className="h-8 px-2.5">
                      {days} days
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
            {periods && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetricCard label={`Net revenue, last ${range} days`} value={formatPrice(periods.current.revenue)} delta={{ change: percentChange(periods.current.revenue, periods.previous.revenue), period: previousLabel }} tone="accent" />
                <MetricCard label={`Bookings made, last ${range} days`} value={String(periods.current.bookings)} delta={{ change: percentChange(periods.current.bookings, periods.previous.bookings), period: previousLabel }} />
              </div>
            )}
            <BarChart
              className="mt-3"
              title={`${measures[measure]} per day, last ${range} days`}
              description={measure === "revenue" ? "Successful charges minus refunds, by the day they settled. Demo data." : "Bookings by the day they were made. Demo data."}
              valueLabel={measures[measure]}
              formatValue={measure === "revenue" ? (amount) => formatPrice(amount) : String}
              data={trend.map((point) => ({ key: point.day, label: dayLabel.format(new Date(`${point.day}T12:00:00Z`)), value: point[measure] }))}
            />
          </section>

          <section aria-labelledby="queues">
            <h2 id="queues" className="text-subheading">
              Work queues
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {queues.map((queue) => (
                <li key={queue.label}>
                  <Link href={queue.href} className="surface-interactive flex h-full items-center justify-between gap-3 p-4 focus-ring">
                    <span>
                      <span className="block font-medium">{queue.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{queue.detail}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-2xl font-semibold tabular-nums">{queue.count}</span>
                      <ArrowRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
