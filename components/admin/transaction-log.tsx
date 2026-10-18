"use client"

import { DataTable, type Column } from "@/components/admin/data-table"
import { CopyId, SampleBadge, StatusBadge, moderationTone, sentenceCase } from "@/components/admin/parts"
import { PageHeader, Stat, StatStrip } from "@/components/portal/ui"
import { useAdminSource } from "@/components/admin/use-admin"
import { adminTransactionRows, adminTransactionTotals, type AdminTransactionRow } from "@/lib/admin-selectors"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import { getMentor } from "@/lib/data"
import { cn } from "@/lib/utils"

export function TransactionLog() {
  const source = useAdminSource()
  const rows = adminTransactionRows(source)
  const totals = adminTransactionTotals(rows)

  const columns: Column<AdminTransactionRow>[] = [
    { id: "id", header: "Transaction", sortValue: (row) => row.transaction.id, cell: (row) => <CopyId value={row.transaction.id} /> },
    {
      id: "order",
      header: "Order",
      sortValue: (row) => row.order.id,
      cell: (row) => (
        <div>
          <p className="whitespace-nowrap text-xs font-medium tabular-nums">{row.order.id}</p>
          <p className="text-xs text-muted-foreground">{getMentor(row.order.mentorSlug)?.name ?? row.order.mentorSlug}</p>
        </div>
      ),
    },
    {
      id: "kind",
      header: "Type",
      sortValue: (row) => row.transaction.kind,
      cell: (row) => <span className="text-sm">{row.transaction.kind === "refund" ? "Refund" : "Charge"}</span>,
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      sortValue: (row) => row.transaction.amount,
      cell: (row) => (
        <span className={cn("font-medium tabular-nums", row.transaction.kind === "refund" && "text-muted-foreground")}>
          {row.transaction.kind === "refund" ? "−" : ""}
          {formatPrice(row.transaction.amount, row.transaction.currency)}
        </span>
      ),
    },
    { id: "status", header: "Result", sortValue: (row) => row.transaction.status, cell: (row) => <StatusBadge tone={moderationTone(row.transaction.status)}>{sentenceCase(row.transaction.status)}</StatusBadge> },
    {
      id: "at",
      header: "At",
      sortValue: (row) => row.transaction.at,
      cell: (row) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDate(row.transaction.at)}
          <span className="block text-xs">{formatTime(row.transaction.at)}</span>
        </span>
      ),
    },
    { id: "mode", header: "Mode", secondary: true, csv: (row) => (row.transaction.simulated ? "Simulated" : "Live"), cell: (row) => (row.transaction.simulated ? <SampleBadge /> : <StatusBadge tone="neutral">Live</StatusBadge>) },
  ]

  return (
    <div>
      <PageHeader title="Payment transactions" description="Read-only charges and refunds, all simulated." />

      <StatStrip label="Transaction totals" className="mb-6">
        <Stat label="Charged" value={formatPrice(totals.charged)} hint="Successful charges" />
        <Stat label="Refunded" value={formatPrice(totals.refunded)} hint="Successful refunds" />
        <Stat label="Failed" value={totals.failed} hint="Charges or refunds" />
      </StatStrip>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        exportFilename="transactions"
        search={(row) => `${row.transaction.id} ${row.order.id} ${row.order.title} ${row.order.mentorSlug}`}
        searchPlaceholder="Search transaction or order…"
        searchLabel="Search transactions"
        pageSize={12}
        initialSort={{ columnId: "at", direction: "desc" }}
        empty="No transactions yet."
        filters={[
          {
            id: "kind",
            label: "Type",
            options: [
              { id: "charge", label: "Charges", match: (row) => row.transaction.kind === "charge" },
              { id: "refund", label: "Refunds", match: (row) => row.transaction.kind === "refund" },
            ],
          },
          {
            id: "status",
            label: "Result",
            options: [
              { id: "succeeded", label: "Succeeded", match: (row) => row.transaction.status === "succeeded" },
              { id: "failed", label: "Failed", match: (row) => row.transaction.status === "failed" },
            ],
          },
        ]}
      />
    </div>
  )
}
