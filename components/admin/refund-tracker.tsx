"use client"

import { useState } from "react"
import { CircleDollarSignIcon, GavelIcon } from "lucide-react"
import { toast } from "sonner"

import { DataTable, type Column } from "@/components/admin/data-table"
import { CopyId, ReasonDialog, SampleBadge, StatusBadge, moderationTone, notify } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { PageHeader, Stat, StatStrip } from "@/components/portal/ui"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Button } from "@/components/ui/button"
import { adminCompleteRefund } from "@/lib/admin-client"
import { disputeStatusLabels, type Dispute, type DisputeStatus } from "@/lib/admin"
import { adminRefundOrders, adminRefundStats } from "@/lib/admin-selectors"
import { usePrincipal } from "@/lib/auth"
import { getMentor } from "@/lib/data"
import { formatDate, formatPrice } from "@/lib/format"
import { orderStatusLabels, type Order } from "@/lib/orders"
import { adminUpdateDispute, useNow } from "@/lib/store"

export function RefundTracker() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const now = useNow()
  const [pending, setPending] = useState<{ dispute: Dispute; status: DisputeStatus } | null>(null)

  const orders = adminRefundOrders(source)
  const stats = now ? adminRefundStats(source, now) : null
  const disputes = [...source.admin.disputes].sort((a, b) => b.openedAt.localeCompare(a.openedAt))

  const completeRefund = async (order: Order) => {
    const result = await adminCompleteRefund(principal, order.id, source.orders.some((item) => item.id === order.id) ? "learner" : "incoming")
    if (result.ok) toast.success(`${order.id}: ${result.message}`)
    else toast.error(result.message)
  }

  const move = (dispute: Dispute, status: DisputeStatus, note?: string) => {
    if (notify(adminUpdateDispute(principal, dispute.id, status, note), `${dispute.id} is now ${disputeStatusLabels[status].toLowerCase()}.`)) setPending(null)
  }

  const refundColumns: Column<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortValue: (row) => row.id,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <CopyId value={row.id} className="text-muted-foreground" />
        </div>
      ),
    },
    { id: "mentor", header: "Mentor", secondary: true, sortValue: (row) => row.mentorSlug, cell: (row) => <span className="text-muted-foreground">{getMentor(row.mentorSlug)?.name ?? row.mentorSlug}</span> },
    { id: "total", header: "Charged", align: "right", sortValue: (row) => row.quote.total, cell: (row) => <span className="tabular-nums text-muted-foreground">{formatPrice(row.quote.total)}</span> },
    {
      id: "refund",
      header: "Refund",
      align: "right",
      sortValue: (row) => row.refundAmount ?? 0,
      cell: (row) => <span className="tabular-nums">{row.refundAmount !== undefined ? formatPrice(row.refundAmount) : "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={moderationTone(row.status)}>{orderStatusLabels[row.status]}</StatusBadge>
          {row.sample && <SampleBadge />}
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row) =>
        row.status === "refund-pending" ? (
          <ConfirmAction
            trigger={
              <Button variant="outline" size="sm">
                <CircleDollarSignIcon aria-hidden="true" />
                Complete refund<span className="sr-only"> {row.id}</span>
              </Button>
            }
            title={`Complete refund on ${row.id}?`}
            description={
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-left">
                <dt>Order</dt>
                <dd className="text-foreground">{row.id}</dd>
                <dt>Charged</dt>
                <dd className="text-foreground tabular-nums">{formatPrice(row.quote.total, row.quote.currency)}</dd>
                <dt>Refund</dt>
                <dd className="font-medium text-foreground tabular-nums">
                  {formatPrice(row.refundAmount ?? 0, row.quote.currency)}
                  {row.refundPercent !== undefined && ` (${row.refundPercent}%)`}
                </dd>
                <dd className="col-span-2 mt-1 text-xs">Set by the booking&apos;s cancellation policy. Demo only — no money moves.</dd>
              </dl>
            }
            confirmLabel="Complete refund"
            busyLabel="Completing…"
            destructive
            onConfirm={() => completeRefund(row)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">No action</span>
        ),
    },
  ]

  const disputeColumns: Column<Dispute>[] = [
    { id: "id", header: "Dispute", sortValue: (row) => row.id, cell: (row) => <CopyId value={row.id} className="font-medium" /> },
    {
      id: "order",
      header: "Order",
      secondary: true,
      csv: (row) => row.orderId,
      cell: (row) => (
        <div className="text-muted-foreground">
          {row.orderId}
          <span className="block text-xs">{getMentor(row.mentorSlug)?.name ?? row.mentorSlug}</span>
        </div>
      ),
    },
    { id: "learner", header: "Learner", secondary: true, csv: (row) => row.learnerEmail, cell: (row) => <span className="text-muted-foreground">{row.learnerEmail}</span> },
    { id: "amount", header: "Amount", align: "right", sortValue: (row) => row.amount, cell: (row) => <span className="tabular-nums">{formatPrice(row.amount, row.currency)}</span> },
    {
      id: "reason",
      header: "Reason",
      secondary: true,
      csv: (row) => row.reason,
      cell: (row) => (
        <div className="max-w-72 text-xs text-muted-foreground">
          {row.reason}
          {row.note && <span className="mt-1 block text-foreground/70">Resolution: {row.note}</span>}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={moderationTone(row.status)}>{disputeStatusLabels[row.status]}</StatusBadge>
          {row.sample && <SampleBadge />}
        </div>
      ),
    },
    { id: "opened", header: "Opened", secondary: true, sortValue: (row) => row.openedAt, cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.openedAt)}</span> },
    {
      id: "action",
      header: "Action",
      cell: (row) => {
        if (row.status === "refunded" || row.status === "declined") return <span className="text-xs text-muted-foreground">Resolved</span>
        return (
          <div className="flex flex-wrap gap-1.5">
            {row.status === "open" && (
              <Button variant="outline" size="sm" onClick={() => move(row, "investigating")}>
                <GavelIcon aria-hidden="true" />
                Investigate
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setPending({ dispute: row, status: "refunded" })}>
              Refund
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPending({ dispute: row, status: "declined" })}>
              Decline
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader title="Refunds & disputes" description="Settle pending refunds and resolve learner disputes." />

      <StatStrip label="Refund summary" className="mb-6">
        <Stat label="Open disputes" value={stats?.openDisputes ?? "—"} hint="Open or investigating" />
        <Stat label="Refunds pending" value={stats?.refundsPending ?? "—"} hint={stats ? `${formatPrice(stats.refundsPendingValue)} to settle` : undefined} />
        <Stat label="Refunded this month" value={stats ? formatPrice(stats.refundedThisMonth) : "—"} hint={stats ? `${stats.refundedThisMonthCount} ${stats.refundedThisMonthCount === 1 ? "refund" : "refunds"}` : undefined} />
      </StatStrip>

      <div className="space-y-6">
        <DataTable
          title="Refunds"
          anchor="refund-table"
          rows={orders}
          columns={refundColumns}
          rowKey={(row) => row.id}
          urlKey="refunds"
          exportFilename="refunds"
          search={(row) => `${row.id} ${row.title} ${row.mentorSlug}`}
          searchPlaceholder="Search order or booking…"
          searchLabel="Search refunds"
          empty="No refunds are recorded."
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { id: "pending", label: "Pending", match: (row) => row.status === "refund-pending" },
                { id: "refunded", label: "Refunded", match: (row) => row.status === "refunded" },
                { id: "cancelled", label: "Cancelled", match: (row) => row.status === "cancelled" },
              ],
            },
          ]}
        />

        <DataTable
          title="Disputes"
          anchor="dispute-table"
          rows={disputes}
          columns={disputeColumns}
          rowKey={(row) => row.id}
          urlKey="disputes"
          exportFilename="disputes"
          search={(row) => `${row.id} ${row.orderId} ${row.learnerEmail} ${row.reason}`}
          searchPlaceholder="Search dispute, order or learner…"
          searchLabel="Search disputes"
          initialSort={{ columnId: "opened", direction: "desc" }}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { id: "unresolved", label: "Unresolved", match: (row) => row.status === "open" || row.status === "investigating" },
                { id: "open", label: "Open", match: (row) => row.status === "open" },
                { id: "investigating", label: "Investigating", match: (row) => row.status === "investigating" },
                { id: "resolved", label: "Resolved", match: (row) => row.status === "refunded" || row.status === "declined" },
              ],
            },
          ]}
        />
      </div>

      {pending && (
        <ReasonDialog
          title={`${pending.status === "refunded" ? "Refund" : "Decline"} dispute ${pending.dispute.id}`}
          description={`${pending.dispute.learnerEmail} · ${formatPrice(pending.dispute.amount, pending.dispute.currency)} on ${pending.dispute.orderId}`}
          label="Resolution note"
          placeholder={pending.status === "refunded" ? "e.g. Mentor cancellation confirmed; refunded in full" : "e.g. Service delivered as described; no refund due"}
          submitLabel={pending.status === "refunded" ? "Mark refunded" : "Decline dispute"}
          destructive={pending.status === "declined"}
          onSubmit={(note) => move(pending.dispute, pending.status, note)}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
