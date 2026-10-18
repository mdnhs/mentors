"use client"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, SampleBadge, StatusBadge } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { adminTransactionRows, type AdminTransactionRow } from "@/lib/admin-selectors"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import { getMentor } from "@/lib/data"

export function TransactionLog() {
  const source = useAdminSource()
  const rows = adminTransactionRows(source)

  const columns: Column<AdminTransactionRow>[] = [
    { id: "id", header: "Transaction", sortValue: (row) => row.transaction.id, cell: (row) => <span className="font-mono text-xs">{row.transaction.id}</span> },
    {
      id: "order",
      header: "Order",
      sortValue: (row) => row.order.id,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.order.id}</p>
          <p className="text-xs text-muted-foreground">{getMentor(row.order.mentorSlug)?.name ?? row.order.mentorSlug}</p>
        </div>
      ),
    },
    {
      id: "kind",
      header: "Type",
      sortValue: (row) => row.transaction.kind,
      cell: (row) => <StatusBadge tone={row.transaction.kind === "refund" ? "warning" : "accent"}>{row.transaction.kind === "refund" ? "Refund" : "Charge"}</StatusBadge>,
    },
    { id: "amount", header: "Amount", align: "right", sortValue: (row) => row.transaction.amount, cell: (row) => <span className="tabular-nums">{formatPrice(row.transaction.amount, row.transaction.currency)}</span> },
    { id: "status", header: "Result", sortValue: (row) => row.transaction.status, cell: (row) => <StatusBadge tone={row.transaction.status === "succeeded" ? "success" : "danger"}>{row.transaction.status}</StatusBadge> },
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
    { id: "mode", header: "Mode", secondary: true, cell: (row) => (row.transaction.simulated ? <SampleBadge /> : <StatusBadge tone="neutral">Live</StatusBadge>) },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Payment transactions" description="Charges and refunds from the order records. Read-only; new entries only come from payment events." />
      <DemoNotice>Every transaction here is simulated — no provider is contacted and no money moves. Records hold an amount, a currency and a result, never a card number or payment secret.</DemoNotice>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
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
