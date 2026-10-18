"use client"

import { useState } from "react"
import { CircleDollarSignIcon, GavelIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, Feedback, ReasonPanel, SampleBadge, StatusBadge, moderationTone } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { Button } from "@/components/ui/button"
import { adminCompleteRefund } from "@/lib/admin-client"
import { disputeStatusLabels, type Dispute, type DisputeStatus } from "@/lib/admin"
import { adminRefundOrders } from "@/lib/admin-selectors"
import { usePrincipal } from "@/lib/auth"
import { getMentor } from "@/lib/data"
import { formatDate, formatPrice } from "@/lib/format"
import { orderStatusLabels, type Order } from "@/lib/orders"
import { adminUpdateDispute, useNow } from "@/lib/store"

export function RefundTracker() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const now = useNow()
  const [busy, setBusy] = useState<string | null>(null)
  const [pending, setPending] = useState<{ dispute: Dispute; status: DisputeStatus } | null>(null)
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const orders = adminRefundOrders(source)
  const disputes = [...source.admin.disputes].sort((a, b) => b.openedAt.localeCompare(a.openedAt))

  const completeRefund = async (order: Order) => {
    setBusy(order.id)
    const result = await adminCompleteRefund(principal, order.id, source.orders.some((item) => item.id === order.id) ? "learner" : "incoming")
    setBusy(null)
    setFeedback({ tone: result.ok ? "ok" : "error", text: result.ok ? `${order.id}: ${result.message}` : result.message })
  }

  const move = (dispute: Dispute, status: DisputeStatus, note?: string) => {
    const result = adminUpdateDispute(principal, dispute.id, status, note)
    setFeedback(result.ok ? { tone: "ok", text: `${dispute.id} is now ${disputeStatusLabels[status].toLowerCase()}.` } : { tone: "error", text: result.message })
    if (result.ok) setPending(null)
  }

  const refundColumns: Column<Order>[] = [
    {
      id: "order",
      header: "Order",
      sortValue: (row) => row.id,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.id}</p>
          <p className="text-xs text-muted-foreground">{row.title}</p>
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
          <Button variant="outline" size="sm" onClick={() => completeRefund(row)} disabled={busy === row.id}>
            <CircleDollarSignIcon aria-hidden="true" />
            {busy === row.id ? "Completing…" : "Complete refund"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">No action</span>
        ),
    },
  ]

  const disputeColumns: Column<Dispute>[] = [
    { id: "id", header: "Dispute", sortValue: (row) => row.id, cell: (row) => <span className="font-medium">{row.id}</span> },
    {
      id: "order",
      header: "Order",
      secondary: true,
      cell: (row) => (
        <div className="text-muted-foreground">
          {row.orderId}
          <span className="block text-xs">{getMentor(row.mentorSlug)?.name ?? row.mentorSlug}</span>
        </div>
      ),
    },
    { id: "learner", header: "Learner", secondary: true, cell: (row) => <span className="text-muted-foreground">{row.learnerEmail}</span> },
    { id: "amount", header: "Amount", align: "right", sortValue: (row) => row.amount, cell: (row) => <span className="tabular-nums">{formatPrice(row.amount, row.currency)}</span> },
    {
      id: "reason",
      header: "Reason",
      secondary: true,
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
    <div className="space-y-6">
      <AdminPageHeader title="Refunds & disputes" description="Orders with a refund, and learner disputes raised against sample orders." />
      <DemoNotice>Completing a refund settles a demo refund — no money moves. Dispute outcomes are recorded, not paid out.</DemoNotice>

      <section aria-labelledby="refund-table">
        <h2 id="refund-table" className="text-subheading">
          Refunds
        </h2>
        <div className="mt-3">
          <DataTable
            rows={orders}
            columns={refundColumns}
            rowKey={(row) => row.id}
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
        </div>
      </section>

      <section aria-labelledby="dispute-table">
        <h2 id="dispute-table" className="text-subheading">
          Disputes
        </h2>
        <div className="mt-3">
          <DataTable
            rows={disputes}
            columns={disputeColumns}
            rowKey={(row) => row.id}
            search={(row) => `${row.id} ${row.orderId} ${row.learnerEmail} ${row.reason}`}
            searchPlaceholder="Search dispute, order or learner…"
            searchLabel="Search disputes"
            initialSort={{ columnId: "opened", direction: "desc" }}
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { id: "open", label: "Open", match: (row) => row.status === "open" },
                  { id: "investigating", label: "Investigating", match: (row) => row.status === "investigating" },
                  { id: "resolved", label: "Resolved", match: (row) => row.status === "refunded" || row.status === "declined" },
                ],
              },
            ]}
          />
        </div>
      </section>

      {pending && (
        <ReasonPanel
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

      {feedback && <Feedback tone={feedback.tone}>{feedback.text}</Feedback>}

      {now && <span className="sr-only">Rendered at {now.toISOString()}</span>}
    </div>
  )
}
