"use client"

import { useState } from "react"
import { BanknoteIcon, ReceiptTextIcon, WalletIcon } from "lucide-react"
import { toast } from "sonner"

import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { ListRow, PageHeader, Panel, PortalEmpty, Stat, StatStrip } from "@/components/portal/ui"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatPrice } from "@/lib/format"
import { earningsByMonth, MIN_PAYOUT, statement, type StatementLine } from "@/lib/mentor-finance"
import { monthTrend, parsePayoutInput } from "@/lib/mentor-insights"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { MENTOR_COMMISSION_RATE } from "@/lib/pricing"
import { requestDemoPayout, settleDemoPayout } from "@/lib/store"
import { cn } from "@/lib/utils"

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" })

const kindLabels: Record<StatementLine["kind"], string> = {
  charge: "Booking payment",
  refund: "Refund",
  "payout-requested": "Payout requested",
  "payout-paid": "Payout sent (demo)",
}

export function EarningsView() {
  const { actor, now, summary, finance, mentor } = useMentorWorkspace()
  const [amount, setAmount] = useState("")

  if (!now || !summary)
    return (
      <div>
        <PageHeader title="Earnings" />
        <div className="space-y-6">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )

  const cur = summary.currency
  const price = (value: number) => formatPrice(value, cur)
  const payouts = finance.payouts.filter((payout) => payout.mentorSlug === DEMO_MENTOR_SLUG)
  const lines = statement(finance, DEMO_MENTOR_SLUG)
  const monthly = earningsByMonth(finance, DEMO_MENTOR_SLUG, now, 6, mentor.timezone)
  const month = monthTrend(monthly)
  const parsed = parsePayoutInput(amount, summary.availableForPayout, MIN_PAYOUT)
  const showError = amount.trim() !== "" && !parsed.ok
  const canRequest = parsed.ok

  const request = () => {
    const result = requestDemoPayout(actor, amount.trim() === "" ? undefined : Number(amount.trim()))
    if (result.ok) {
      setAmount("")
      toast.success(`Payout of ${price(result.payout.amount)} requested`, { description: "It stays pending until it is sent." })
    } else toast.error(result.message)
  }

  const settle = (id: string) => {
    const result = settleDemoPayout(actor, id)
    if (result.ok) toast.success(`Payout ${id} marked as sent (demo)`)
    else toast.error(result.message)
  }

  const breakdown = [
    { label: "Learners paid", value: summary.grossBookingValue },
    ...(summary.refunded > 0 ? [{ label: "Refunded", value: -summary.refunded }] : []),
    { label: "Platform fee", value: -summary.platformFee },
    { label: `Commission (${MENTOR_COMMISSION_RATE * 100}%)`, value: -summary.commission },
  ]

  return (
    <div className="space-y-8">
      <PageHeader title="Earnings" description="What you've earned and what's ready to pay out." className="mb-0" />

      <section aria-labelledby="payouts">
        <h2 id="payouts" className="sr-only">
          Balance
        </h2>
        <StatStrip label="Balance">
          <Stat label="Estimated earnings" value={price(summary.estimatedEarnings)} trend={month.trend} hint={`${price(month.current)} this month`} />
          <Stat label="Ready to pay out" value={price(summary.availableForPayout)} hint="Completed sessions" />
          <Stat label="Payout pending" value={price(summary.pendingPayouts)} hint="Requested, not sent" />
          <Stat label="Paid out" value={price(summary.paidOut)} hint="Actually sent" />
        </StatStrip>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <BarChart
          className="rounded-2xl border bg-card p-5 lg:col-span-3"
          title="Estimated earnings by month"
          description="Your share after refunds, last 6 months."
          valueLabel="Estimated earnings"
          formatValue={price}
          data={monthly.map((item) => ({ key: item.month, label: monthLabel.format(new Date(`${item.month}-15T12:00:00Z`)), value: item.earnings }))}
        />

        <Panel id="request" title="Request a payout" className="lg:col-span-2">
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{price(summary.availableForPayout)}</p>
          <p className="text-sm text-muted-foreground">Available now. Minimum {price(MIN_PAYOUT)}.</p>
          <form className="mt-5 grid gap-1.5" onSubmit={(event) => event.preventDefault()}>
            <Label htmlFor="payout-amount">Amount (৳)</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="payout-amount"
                inputMode="numeric"
                value={amount}
                placeholder={String(summary.availableForPayout)}
                aria-invalid={showError || undefined}
                aria-describedby={showError ? "payout-amount-error" : "payout-amount-hint"}
                onChange={(event) => setAmount(event.target.value)}
                className="w-36 tabular-nums"
              />
              <ConfirmAction
                trigger={<Button disabled={!canRequest}>Request payout</Button>}
                title={`Request ${parsed.ok ? price(parsed.amount) : "a payout"}?`}
                description={<p>The payout stays pending until it is sent. Demo only: no real transfer is made.</p>}
                confirmLabel="Request payout"
                busyLabel="Requesting…"
                onConfirm={request}
              />
            </div>
            {showError ? (
              <p id="payout-amount-error" role="alert" className="text-sm text-destructive">
                {parsed.message}
              </p>
            ) : (
              <p id="payout-amount-hint" className="text-xs text-muted-foreground">
                Leave blank to request everything.
              </p>
            )}
          </form>

          <dl className="mt-6 space-y-2 border-t pt-4 text-sm" aria-label="How earnings are worked out">
            {breakdown.map((item) => (
              <div key={item.label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="tabular-nums">{price(item.value)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 border-t pt-2 font-medium">
              <dt>Estimated earnings</dt>
              <dd className="tabular-nums">{price(summary.estimatedEarnings)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">Commission is set by MentorBridge and can&apos;t be changed from your account.</p>
        </Panel>
      </div>

      <Panel id="history" title="Payout history" bodyClassName="py-1">
        {payouts.length > 0 ? (
          <ul className="divide-y">
            {payouts.map((payout) => (
              <li key={payout.id}>
                <ListRow
                  leading={
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                      <BanknoteIcon className="size-4" aria-hidden="true" />
                    </span>
                  }
                  title={<span className="tabular-nums">{price(payout.amount)}</span>}
                  subtitle={`${payout.id}, requested ${formatDate(payout.requestedAt)}`}
                  trailing={
                    <>
                      <Badge tone={payout.status === "paid" ? "success" : "warning"}>{payout.status === "paid" ? `Paid (demo)${payout.paidAt ? ` ${formatDate(payout.paidAt)}` : ""}` : "Pending"}</Badge>
                      {payout.status === "pending" && (
                        <ConfirmAction
                          trigger={
                            <Button variant="outline" size="sm">
                              Complete demo payout<span className="sr-only"> {payout.id}</span>
                            </Button>
                          }
                          title="Mark this payout as sent?"
                          description={<p>This stands in for the bank confirming the transfer. Demo only: no real transfer is made.</p>}
                          confirmLabel="Mark as sent"
                          onConfirm={() => settle(payout.id)}
                        />
                      )}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <PortalEmpty icon={WalletIcon} title="No payouts yet" description="Requested payouts show up here." className="py-8" />
        )}
      </Panel>

      <Panel id="trail" title="Statement" bodyClassName="py-1">
        {lines.length > 0 ? (
          <ul className="divide-y">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center gap-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{line.label}</p>
                  <p className="text-muted-foreground">
                    {kindLabels[line.kind]}, {formatDate(line.at)}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p className={cn("font-medium", line.amount < 0 && "text-muted-foreground")}>{price(line.amount)}</p>
                  <p className="text-xs text-muted-foreground">{line.earningsEffect !== 0 ? `Earnings ${line.earningsEffect > 0 ? "+" : ""}${price(line.earningsEffect)}` : "No change to earnings"}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <PortalEmpty icon={ReceiptTextIcon} title="No payments yet" description="Learner payments appear here." className="py-8" />
        )}
      </Panel>
    </div>
  )
}
