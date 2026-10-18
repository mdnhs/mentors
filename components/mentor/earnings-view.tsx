"use client"

import { useState } from "react"
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

import { DemoNotice } from "@/components/admin/parts"
import { MentorPageHeader } from "@/components/mentor/mentor-shell"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatPrice } from "@/lib/format"
import { earningsByMonth, MIN_PAYOUT, statement, type StatementLine } from "@/lib/mentor-finance"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { MENTOR_COMMISSION_RATE } from "@/lib/pricing"
import { requestDemoPayout, settleDemoPayout } from "@/lib/store"
import { cn } from "@/lib/utils"

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" })

const kindLabels: Record<StatementLine["kind"], string> = {
  charge: "Booking payment",
  refund: "Refund",
  "payout-requested": "Payout requested",
  "payout-paid": "Payout sent (demo)",
}

export function EarningsView() {
  const { actor, now, summary, finance } = useMentorWorkspace()
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  if (!now || !summary)
    return (
      <div className="mt-6 space-y-6">
        <MentorPageHeader title="Earnings" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  const cur = summary.currency
  const payouts = finance.payouts.filter((payout) => payout.mentorSlug === DEMO_MENTOR_SLUG)
  const lines = statement(finance, DEMO_MENTOR_SLUG)
  const monthly = earningsByMonth(finance, DEMO_MENTOR_SLUG, now)
  const hasSamples = finance.orders.some((order) => order.sample && order.mentorSlug === DEMO_MENTOR_SLUG)

  const request = () => {
    const trimmed = amount.trim()
    const parsed = trimmed === "" ? undefined : /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
    const result = requestDemoPayout(actor, parsed)
    if (result.ok) {
      setAmount("")
      setMessage({ tone: "ok", text: `Payout of ${formatPrice(result.payout.amount, cur)} requested. It stays pending until it is sent.` })
    } else setMessage({ tone: "error", text: result.message })
  }

  const earned = [
    { label: "Gross booking value", value: summary.grossBookingValue, hint: "What learners paid" },
    { label: "Platform fee", value: summary.platformFee, hint: "Paid by learners on top" },
    { label: "Platform commission", value: summary.commission, hint: `${MENTOR_COMMISSION_RATE * 100}% of your price` },
    { label: "Estimated earnings", value: summary.estimatedEarnings, hint: "Your share, after refunds" },
  ]
  const money = [
    { label: "Ready to pay out", value: summary.availableForPayout, hint: "Completed sessions only" },
    { label: "Payout pending", value: summary.pendingPayouts, hint: "Requested, not sent" },
    { label: "Paid out", value: summary.paidOut, hint: "Actually sent" },
  ]

  return (
    <div className="mt-6 space-y-10">
      <div className="space-y-4">
        <MentorPageHeader title="Earnings" description="What you have earned from bookings, what is ready to pay out, and every payment behind it." />
        <DemoNotice label="Demo mode.">Figures come from simulated payments{hasSamples && " and sample bookings"}. Payouts are simulated too: no money is ever sent.</DemoNotice>
      </div>

      <section aria-labelledby="earned">
        <h2 id="earned" className="text-subheading">
          Earned
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {earned.map((item) => (
            <Tile key={item.label} {...item} currency={cur} />
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Commission is set by MentorBridge and can&apos;t be changed from your account. Refunds are deducted from the figures above.
          {summary.refunded > 0 && ` Refunded so far: ${formatPrice(summary.refunded, cur)}.`}
        </p>
        <BarChart
          className="mt-4"
          title="Estimated earnings by month, last 6 months"
          description="Your share of each month's payments, after refunds. Payouts don't change earnings."
          valueLabel="Estimated earnings"
          formatValue={(value) => formatPrice(value, cur)}
          data={monthly.map((item) => ({ key: item.month, label: monthLabel.format(new Date(`${item.month}-15T12:00:00Z`)), value: item.earnings }))}
        />
      </section>

      <section aria-labelledby="payouts">
        <h2 id="payouts" className="text-subheading">
          Payouts
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {money.map((item) => (
            <Tile key={item.label} {...item} currency={cur} />
          ))}
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">Earnings only become payable after the session is completed. Only the “Paid out” figure is money that was actually sent.</p>

        <form
          className="mt-5 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            request()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="payout-amount">Amount (৳)</Label>
            <Input id="payout-amount" inputMode="numeric" value={amount} placeholder={String(summary.availableForPayout)} onChange={(event) => { setAmount(event.target.value); setMessage(null) }} className="w-40" />
          </div>
          <Button type="submit" disabled={summary.availableForPayout < MIN_PAYOUT}>
            Request demo payout
          </Button>
          <p className="text-xs text-muted-foreground">Leave blank to request everything available. Minimum {formatPrice(MIN_PAYOUT, cur)}.</p>
        </form>
        {message && (
          <Alert variant={message.tone === "error" ? "destructive" : "success"} role={message.tone === "error" ? "alert" : "status"} className="mt-3">
            {message.tone === "error" ? <CircleAlertIcon aria-hidden="true" /> : <CircleCheckIcon aria-hidden="true" />}
            <AlertDescription className="text-current">{message.text}</AlertDescription>
          </Alert>
        )}

        {payouts.length > 0 ? (
          <ul className="mt-5 divide-y surface">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
                <span className="font-medium">{payout.id}</span>
                <span className="text-muted-foreground">Requested {formatDate(payout.requestedAt)}</span>
                <span className="ml-auto font-semibold">{formatPrice(payout.amount, payout.currency)}</span>
                <Badge tone={payout.status === "paid" ? "success" : "warning"}>{payout.status === "paid" ? `Paid (demo) ${payout.paidAt ? formatDate(payout.paidAt) : ""}` : "Pending"}</Badge>
                {payout.status === "pending" && (
                  <Button variant="outline" size="sm" onClick={() => settleDemoPayout(actor, payout.id)}>
                    Complete demo payout<span className="sr-only"> {payout.id}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No payouts yet.</p>
        )}
      </section>

      <section aria-labelledby="trail">
        <h2 id="trail" className="text-subheading">
          Money trail
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Every payment, refund and payout, newest first.</p>
        {lines.length > 0 ? (
          <ul className="mt-4 divide-y surface">
            {lines.map((line) => (
              <li key={line.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 p-4 text-sm">
                <span className="font-medium">{line.label}</span>
                <span className={cn("text-right font-medium", line.amount < 0 && "text-muted-foreground")}>{formatPrice(line.amount, cur)}</span>
                <span className="text-muted-foreground">
                  {kindLabels[line.kind]} · {formatDate(line.at)}
                </span>
                <span className="text-right text-xs text-muted-foreground">{line.earningsEffect !== 0 ? `Earnings ${line.earningsEffect > 0 ? "+" : ""}${formatPrice(line.earningsEffect, cur)}` : "No change to earnings"}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Payments from learners will appear here.</p>
        )}
      </section>
    </div>
  )
}

function Tile({ label, value, hint, currency }: { label: string; value: number; hint: string; currency: string }) {
  return (
    <div className="surface p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{formatPrice(value, currency)}</dd>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
