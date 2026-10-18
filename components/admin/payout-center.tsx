"use client"

import { useState } from "react"
import { BanknoteIcon, CheckIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, Feedback, MetricCard, SampleBadge, StatusBadge, moderationTone } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { Button } from "@/components/ui/button"
import { usePrincipal } from "@/lib/auth"
import { adminMentorFinanceRows, adminPayoutRows, type AdminMentorFinanceRow, type AdminPayoutRow } from "@/lib/admin-selectors"
import { formatDate, formatPrice } from "@/lib/format"
import { adminSettlePayout, useNow } from "@/lib/store"

export function PayoutCenter() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const now = useNow()
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const payouts = adminPayoutRows(source)
  const finance = now ? adminMentorFinanceRows(source, now) : []

  const pendingTotal = payouts.filter((row) => row.payout.status === "pending").reduce((total, row) => total + row.payout.amount, 0)
  const paidTotal = payouts.filter((row) => row.payout.status === "paid").reduce((total, row) => total + row.payout.amount, 0)
  const accrued = finance.reduce((total, row) => total + row.summary.estimatedEarnings, 0)

  const settle = (row: AdminPayoutRow) => {
    const result = adminSettlePayout(principal, row.payout.id)
    setFeedback(result.ok ? { tone: "ok", text: `${row.payout.id} marked paid. No real transfer was made.` } : { tone: "error", text: result.message })
  }

  const payoutColumns: Column<AdminPayoutRow>[] = [
    { id: "id", header: "Payout", sortValue: (row) => row.payout.id, cell: (row) => <span className="font-medium">{row.payout.id}</span> },
    { id: "mentor", header: "Mentor", sortValue: (row) => row.mentor?.name ?? row.payout.mentorSlug, cell: (row) => <span className="text-muted-foreground">{row.mentor?.name ?? row.payout.mentorSlug}</span> },
    { id: "amount", header: "Amount", align: "right", sortValue: (row) => row.payout.amount, cell: (row) => <span className="tabular-nums">{formatPrice(row.payout.amount, row.payout.currency)}</span> },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.payout.status,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={moderationTone(row.payout.status)}>{row.payout.status === "paid" ? "Paid" : "Pending"}</StatusBadge>
          {row.payout.simulated && <SampleBadge />}
        </div>
      ),
    },
    { id: "requested", header: "Requested", secondary: true, sortValue: (row) => row.payout.requestedAt, cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.payout.requestedAt)}</span> },
    { id: "paid", header: "Paid at", secondary: true, cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{row.payout.paidAt ? formatDate(row.payout.paidAt) : "—"}</span> },
    {
      id: "action",
      header: "Action",
      cell: (row) =>
        row.payout.status === "pending" ? (
          <Button variant="outline" size="sm" onClick={() => settle(row)}>
            <BanknoteIcon aria-hidden="true" />
            Mark paid
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CheckIcon className="size-3.5" aria-hidden="true" />
            Settled
          </span>
        ),
    },
  ]

  const financeColumns: Column<AdminMentorFinanceRow>[] = [
    { id: "mentor", header: "Mentor", sortValue: (row) => row.mentor?.name ?? row.slug, cell: (row) => <span className="font-medium">{row.mentor?.name ?? row.slug}</span> },
    { id: "gross", header: "Gross", align: "right", sortValue: (row) => row.summary.grossBookingValue, cell: (row) => <span className="tabular-nums text-muted-foreground">{formatPrice(row.summary.grossBookingValue)}</span> },
    { id: "earned", header: "Earned", align: "right", sortValue: (row) => row.summary.estimatedEarnings, cell: (row) => <span className="tabular-nums">{formatPrice(row.summary.estimatedEarnings)}</span> },
    { id: "available", header: "Available", align: "right", sortValue: (row) => row.summary.availableForPayout, cell: (row) => <span className="tabular-nums">{formatPrice(row.summary.availableForPayout)}</span> },
    { id: "pending", header: "Pending", align: "right", sortValue: (row) => row.summary.pendingPayouts, cell: (row) => <span className="tabular-nums text-muted-foreground">{formatPrice(row.summary.pendingPayouts)}</span> },
    { id: "paid", header: "Paid out", align: "right", sortValue: (row) => row.summary.paidOut, cell: (row) => <span className="tabular-nums text-muted-foreground">{formatPrice(row.summary.paidOut)}</span> },
    { id: "completed", header: "Completed", align: "right", secondary: true, sortValue: (row) => row.summary.completedBookings, cell: (row) => <span className="tabular-nums">{row.summary.completedBookings}</span> },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Mentor payouts" description="Payout requests across the marketplace and the balances behind them, derived from order transactions." />
      <DemoNotice>Marking a payout paid only records a state change here. There is no transfer, no bank detail and no provider in this demo.</DemoNotice>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Pending payouts" value={formatPrice(pendingTotal)} detail="Requested, not yet marked paid." tone="accent" />
        <MetricCard label="Paid out" value={formatPrice(paidTotal)} detail="Marked paid in this demo." />
        <MetricCard label="Accrued mentor earnings" value={formatPrice(accrued)} detail="Mentors' share of kept value, before payouts." />
      </div>

      <section aria-labelledby="payout-table">
        <h2 id="payout-table" className="text-subheading">
          Payout records
        </h2>
        <div className="mt-3">
          <DataTable
            rows={payouts}
            columns={payoutColumns}
            rowKey={(row) => row.payout.id}
            search={(row) => `${row.payout.id} ${row.mentor?.name ?? row.payout.mentorSlug}`}
            searchPlaceholder="Search payout or mentor…"
            searchLabel="Search payouts"
            empty="No payouts have been requested."
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { id: "pending", label: "Pending", match: (row) => row.payout.status === "pending" },
                  { id: "paid", label: "Paid", match: (row) => row.payout.status === "paid" },
                ],
              },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="finance-table">
        <h2 id="finance-table" className="text-subheading">
          Mentor balances
        </h2>
        <div className="mt-3">
          <DataTable
            rows={finance}
            columns={financeColumns}
            rowKey={(row) => row.slug}
            search={(row) => `${row.mentor?.name ?? row.slug} ${row.slug}`}
            searchPlaceholder="Search mentor…"
            searchLabel="Search mentor balances"
            empty="No orders yet."
            initialSort={{ columnId: "earned", direction: "desc" }}
          />
        </div>
      </section>

      {feedback && <Feedback tone={feedback.tone}>{feedback.text}</Feedback>}
    </div>
  )
}
