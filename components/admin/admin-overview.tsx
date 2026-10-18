"use client"

import { useState } from "react"
import {
  BanknoteIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  GavelIcon,
  LifeBuoyIcon,
  ScrollTextIcon,
  ShieldAlertIcon,
  Undo2Icon,
  UserXIcon,
  type LucideIcon,
} from "lucide-react"

import { actionLabels } from "@/components/admin/audit-log"
import { percent, Segmented } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { ListRow, PageHeader, Panel, PanelLink, PortalEmpty, Stat, StatStrip } from "@/components/portal/ui"
import { Badge } from "@/components/ui/badge"
import { BarChart } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { businessMetrics, comparePeriods, dailyTrend, percentChange } from "@/lib/admin-metrics"
import { adminWorkQueues, recentAudit } from "@/lib/admin-selectors"
import { suspendedMentorSlugs } from "@/lib/admin"
import { getMentors } from "@/lib/data"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import { useNow } from "@/lib/store"

const ranges = [7, 30, 90] as const
const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 })
const measures = { revenue: "Net revenue", bookings: "Bookings made" } as const

const queueIcons: Record<string, LucideIcon> = {
  applications: ClipboardListIcon,
  refunds: Undo2Icon,
  disputes: GavelIcon,
  payouts: BanknoteIcon,
  tickets: LifeBuoyIcon,
  accounts: UserXIcon,
  moderated: ShieldAlertIcon,
}

export function AdminOverview() {
  const source = useAdminSource()
  const now = useNow()
  const [range, setRange] = useState<(typeof ranges)[number]>(30)
  const [measure, setMeasure] = useState<keyof typeof measures>("revenue")

  const records = { bookings: [...source.bookings, ...source.incoming.bookings], orders: [...source.orders, ...source.incoming.orders] }
  const metrics = now ? businessMetrics({ ...records, mentors: getMentors(), suspendedMentors: suspendedMentorSlugs(source.admin) }, now) : null
  const trend = now ? dailyTrend(records, now, range) : []
  const periods = now ? comparePeriods(records, now, range) : null

  const queues = adminWorkQueues(source)
  const open = queues.filter((queue) => queue.count > 0)
  const clear = queues.filter((queue) => queue.count === 0)
  const activity = recentAudit(source.admin.audit)

  return (
    <div>
      <PageHeader title="Overview" description="What needs you today, and how the marketplace is doing." />

      <Panel id="needs-action" title="Needs action" action={open.length > 0 && <Badge tone="warning">{open.reduce((total, queue) => total + queue.count, 0)} open</Badge>}>
        {open.length > 0 ? (
          <ul className="divide-y">
            {open.map((queue) => {
              const Icon = queueIcons[queue.id] ?? ClipboardListIcon
              return (
                <li key={queue.id}>
                  <ListRow
                    href={queue.href}
                    leading={
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                    }
                    title={queue.label}
                    trailing={
                      <span className="min-w-8 rounded-full bg-muted px-2 py-0.5 text-center text-sm font-semibold tabular-nums">
                        {queue.count}
                      </span>
                    }
                  />
                </li>
              )
            })}
          </ul>
        ) : (
          <PortalEmpty icon={CheckCircle2Icon} title="All caught up" description="Every queue is empty." className="py-8" />
        )}
        {open.length > 0 && clear.length > 0 && (
          <p className="mt-3 flex items-start gap-2 border-t pt-3 text-sm text-muted-foreground">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">All clear:</span> {clear.map((queue) => queue.label.toLowerCase()).join(", ")}
            </span>
          </p>
        )}
      </Panel>

      {!metrics || !periods ? (
        <div className="mt-8 space-y-6">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : (
        <>
          <section aria-labelledby="revenue-heading" className="mt-8">
            <h2 id="revenue-heading" className="mb-3 text-base font-semibold">
              Revenue
            </h2>
            <StatStrip label="Revenue">
              <Stat
                label="Net revenue"
                value={formatPrice(periods.current.revenue)}
                delta={percentChange(periods.current.revenue, periods.previous.revenue)}
                hint={`vs previous ${range} days`}
                trend={trend.map((point) => point.revenue)}
              />
              <Stat label="Gross booking value" value={formatPrice(metrics.grossBookingValue)} hint="All time, before refunds" />
              <Stat label="Platform revenue" value={formatPrice(metrics.platformRevenue)} hint="Fees and commission" />
              <Stat label="Mentor earnings" value={formatPrice(metrics.mentorEarnings)} hint="Accrued, before payouts" />
            </StatStrip>
          </section>

          <section aria-labelledby="health-heading" className="mt-8">
            <h2 id="health-heading" className="mb-3 text-base font-semibold">
              Marketplace health
            </h2>
            <StatStrip label="Marketplace health" columns={3}>
              <Stat label="Completed bookings" value={metrics.completedBookings} hint={`of ${metrics.counts.bookings} bookings`} />
              <Stat label="Cancellation rate" value={percent(metrics.cancellationRate)} hint={`${metrics.counts.cancelledBookings} cancelled`} />
              <Stat label="Refund rate" value={percent(metrics.refundRate)} hint="Share of gross value" />
              <Stat label="Repeat booking rate" value={percent(metrics.repeatBookingRate)} hint={`${metrics.counts.repeatLearners} of ${metrics.counts.learners} learners`} />
              <Stat label="Booking conversion" value={percent(metrics.bookingConversion)} hint={`${metrics.counts.paidOrders} of ${metrics.counts.orders} orders paid`} />
              <Stat label="Active mentors" value={metrics.activeMentors} href="/dashboard/admin/moderation" hint="With a live offer" />
            </StatStrip>
          </section>

          <Panel
            id="trend"
            title="Trend"
            className="mt-8"
            action={
              <div className="flex flex-wrap justify-end gap-2">
                <Segmented label="Measure" value={measure} onChange={setMeasure} options={(Object.keys(measures) as (keyof typeof measures)[]).map((id) => ({ value: id, label: measures[id] }))} />
                <Segmented label="Date range" value={range} onChange={setRange} options={ranges.map((days) => ({ value: days, label: `${days} days` }))} />
              </div>
            }
          >
            <BarChart
              framed={false}
              variant={measure === "revenue" ? "area" : "bar"}
              title={`${measures[measure]} per day, last ${range} days`}
              description={measure === "revenue" ? "Successful charges minus refunds, by the day they settled." : "Bookings by the day they were made."}
              valueLabel={measures[measure]}
              formatValue={measure === "revenue" ? (amount) => formatPrice(amount) : String}
              formatTick={measure === "revenue" ? (amount) => `৳${compact.format(amount)}` : (count) => compact.format(count)}
              data={trend.map((point) => ({ key: point.day, label: dayLabel.format(new Date(`${point.day}T12:00:00Z`)), value: point[measure] }))}
            />
          </Panel>
        </>
      )}

      <Panel id="activity" title="Recent activity" className="mt-8" action={activity.length > 0 && <PanelLink href="/dashboard/admin/audit">Audit log</PanelLink>}>
        {activity.length > 0 ? (
          <ul className="divide-y">
            {activity.map((event) => (
              <li key={event.id}>
                <ListRow
                  leading={
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <ScrollTextIcon className="size-4" aria-hidden="true" />
                    </span>
                  }
                  title={actionLabels[event.action]}
                  subtitle={<span className="whitespace-nowrap text-xs tabular-nums">{event.target}</span>}
                  trailing={
                    <span className="text-right text-xs text-muted-foreground tabular-nums">
                      {formatDate(event.at)}
                      <span className="block">{formatTime(event.at)}</span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <PortalEmpty icon={ScrollTextIcon} title="No admin actions yet" description="Moderation, refunds and payouts show up here." className="py-8" />
        )}
      </Panel>
    </div>
  )
}
