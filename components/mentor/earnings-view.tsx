"use client"

import { useState } from "react"
import { InfoIcon } from "lucide-react"

import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatPrice } from "@/lib/format"
import { MIN_PAYOUT, statement, type StatementLine } from "@/lib/mentor-finance"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { MENTOR_COMMISSION_RATE } from "@/lib/pricing"
import { requestDemoPayout, settleDemoPayout } from "@/lib/store"
import { cn } from "@/lib/utils"

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

  if (!now || !summary) return <Skeleton className="mt-6 h-64 rounded-2xl" />
  const cur = summary.currency
  const payouts = finance.payouts.filter((payout) => payout.mentorSlug === DEMO_MENTOR_SLUG)
  const lines = statement(finance, DEMO_MENTOR_SLUG)
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
      <p role="note" className="flex gap-2.5 rounded-xl bg-warning-soft p-3 text-sm text-warning ring-1 ring-warning/20">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium">Demo mode.</span> Figures come from simulated payments{hasSamples && " and sample bookings"}. Payouts are simulated too: no money is ever sent.
        </span>
      </p>

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
      </section>

      <section aria-labelledby="payouts">
        <h2 id="payouts" className="text-subheading">
          Payouts
        </h2>
        <dl className="mt-4 grid grid-cols-3 gap-3">
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
          <p role={message.tone === "error" ? "alert" : "status"} className={cn("mt-3 rounded-xl p-3 text-sm", message.tone === "error" ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
            {message.text}
          </p>
        )}

        {payouts.length > 0 ? (
          <ul className="mt-5 divide-y surface">
            {payouts.map((payout) => (
              <li key={payout.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm">
                <span className="font-medium">{payout.id}</span>
                <span className="text-muted-foreground">Requested {formatDate(payout.requestedAt)}</span>
                <span className="ml-auto font-semibold">{formatPrice(payout.amount, payout.currency)}</span>
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", payout.status === "paid" ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>
                  {payout.status === "paid" ? `Paid (demo) ${payout.paidAt ? formatDate(payout.paidAt) : ""}` : "Pending"}
                </span>
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
