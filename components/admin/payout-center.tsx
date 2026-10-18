"use client"

import { BanknoteIcon, CheckIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { CopyId, notify, SampleBadge, StatusBadge, moderationTone } from "@/components/admin/parts"
import { PageHeader, Stat, StatStrip } from "@/components/portal/ui"
import { useAdminSource } from "@/components/admin/use-admin"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Button } from "@/components/ui/button"
import { usePrincipal } from "@/lib/auth"
import { adminMentorFinanceRows, adminPayoutRows, type AdminMentorFinanceRow, type AdminPayoutRow } from "@/lib/admin-selectors"
import { formatDate, formatPrice } from "@/lib/format"
import { adminSettlePayout, useNow } from "@/lib/store"

export function PayoutCenter() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const now = useNow()

  const payouts = adminPayoutRows(source)
  const finance = now ? adminMentorFinanceRows(source, now) : []

  const pendingTotal = payouts.filter((row) => row.payout.status === "pending").reduce((total, row) => total + row.payout.amount, 0)
  const paidTotal = payouts.filter((row) => row.payout.status === "paid").reduce((total, row) => total + row.payout.amount, 0)
  const accrued = finance.reduce((total, row) => total + row.summary.estimatedEarnings, 0)

  const settle = (row: AdminPayoutRow) => notify(adminSettlePayout(principal, row.payout.id), `${row.payout.id} marked paid. No real transfer was made.`)

  const payoutColumns: Column<AdminPayoutRow>[] = [
    { id: "id", header: "Payout", sortValue: (row) => row.payout.id, cell: (row) => <CopyId value={row.payout.id} className="font-medium" /> },
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
    { id: "paid", header: "Paid at", secondary: true, csv: (row) => row.payout.paidAt, cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{row.payout.paidAt ? formatDate(row.payout.paidAt) : "—"}</span> },
    {
      id: "action",
      header: "Action",
      cell: (row) =>
        row.payout.status === "pending" ? (
          <ConfirmAction
            trigger={
              <Button variant="outline" size="sm">
                <BanknoteIcon aria-hidden="true" />
                Mark paid<span className="sr-only"> {row.payout.id}</span>
              </Button>
            }
            title={`Mark payout ${row.payout.id} as paid?`}
            description={
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-left">
                <dt>Payout</dt>
                <dd className="text-foreground">{row.payout.id}</dd>
                <dt>Mentor</dt>
                <dd className="text-foreground">{row.mentor?.name ?? row.payout.mentorSlug}</dd>
                <dt>Amount</dt>
                <dd className="font-medium text-foreground tabular-nums">{formatPrice(row.payout.amount, row.payout.currency)}</dd>
                <dt>Requested</dt>
                <dd className="text-foreground">{formatDate(row.payout.requestedAt)}</dd>
                <dd className="col-span-2 mt-1 text-xs">A paid payout can&apos;t be reopened. Demo only — no transfer is made.</dd>
              </dl>
            }
            confirmLabel="Mark paid"
            busyLabel="Saving…"
            onConfirm={() => settle(row)}
          />
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

  const pendingCount = payouts.filter((row) => row.payout.status === "pending").length

  return (
    <div>
      <PageHeader title="Mentor payouts" description="Payout requests and the balances behind them." />

      <StatStrip label="Payout summary" className="mb-6">
        <Stat label="Pending payouts" value={formatPrice(pendingTotal)} hint={`${pendingCount} ${pendingCount === 1 ? "request" : "requests"}`} />
        <Stat label="Paid out" value={formatPrice(paidTotal)} hint="Marked paid" />
        <Stat label="Accrued mentor earnings" value={now ? formatPrice(accrued) : "—"} hint="Before payouts" />
      </StatStrip>

      <div className="space-y-6">
        <DataTable
          title="Payout records"
          anchor="payout-table"
          rows={payouts}
          columns={payoutColumns}
          rowKey={(row) => row.payout.id}
          urlKey="payouts"
          exportFilename="payouts"
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

        <DataTable
          title="Mentor balances"
          anchor="finance-table"
          rows={finance}
          columns={financeColumns}
          rowKey={(row) => row.slug}
          urlKey="balances"
          exportFilename="mentor-balances"
          loading={!now}
          search={(row) => `${row.mentor?.name ?? row.slug} ${row.slug}`}
          searchPlaceholder="Search mentor…"
          searchLabel="Search mentor balances"
          empty="No orders yet."
          initialSort={{ columnId: "earned", direction: "desc" }}
        />
      </div>
    </div>
  )
}
