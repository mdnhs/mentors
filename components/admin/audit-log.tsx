"use client"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, StatusBadge } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import type { AdminAction, AdminAuditEvent } from "@/lib/admin"
import { formatDate, formatTime } from "@/lib/format"

export const actionLabels: Record<AdminAction, string> = {
  "mentor-suspended": "Mentor suspended",
  "mentor-restored": "Mentor restored",
  "offer-paused": "Offer paused",
  "offer-restored": "Offer restored",
  "review-hidden": "Review hidden",
  "review-restored": "Review restored",
  "account-restricted": "Account restricted",
  "account-restored": "Account restored",
  "booking-cancelled": "Booking cancelled",
  "refund-completed": "Refund completed",
  "payout-settled": "Payout marked paid",
  "dispute-updated": "Dispute updated",
  "ticket-updated": "Ticket updated",
  "application-decision": "Application decided",
}

const categoryOf = (action: AdminAction): "moderation" | "finance" | "applications" | "support" => {
  if (["mentor-suspended", "mentor-restored", "offer-paused", "offer-restored", "review-hidden", "review-restored"].includes(action)) return "moderation"
  if (["booking-cancelled", "refund-completed", "payout-settled", "dispute-updated"].includes(action)) return "finance"
  if (action === "application-decision") return "applications"
  return "support"
}

export function AuditLog() {
  const source = useAdminSource()
  const rows = source.admin.audit

  const columns: Column<AdminAuditEvent>[] = [
    {
      id: "at",
      header: "When",
      sortValue: (row) => row.at,
      cell: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.at)}
          <span className="block text-xs text-muted-foreground">{formatTime(row.at)}</span>
        </span>
      ),
    },
    { id: "actor", header: "Actor", sortValue: (row) => row.actor, cell: (row) => <span className="text-muted-foreground">{row.actor}</span> },
    {
      id: "action",
      header: "Action",
      sortValue: (row) => actionLabels[row.action],
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{actionLabels[row.action]}</span>
          <StatusBadge tone={categoryOf(row.action) === "finance" ? "warning" : categoryOf(row.action) === "moderation" ? "danger" : "accent"}>{categoryOf(row.action)}</StatusBadge>
        </div>
      ),
    },
    { id: "target", header: "Target", cell: (row) => <span className="font-mono text-xs">{row.target}</span> },
    { id: "detail", header: "Detail", secondary: true, cell: (row) => <span className="text-muted-foreground">{row.detail ?? "—"}</span> },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Audit log" description="Every sensitive administrative action, newest first. Metadata only — no document contents, ID numbers or payment secrets." />
      <DemoNotice>This trail is stored in this browser alongside the rest of the demo data. It is cleared by “Reset demo data”.</DemoNotice>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        search={(row) => `${actionLabels[row.action]} ${row.actor} ${row.target} ${row.detail ?? ""}`}
        searchPlaceholder="Search action, actor or target…"
        searchLabel="Search audit log"
        pageSize={15}
        initialSort={{ columnId: "at", direction: "desc" }}
        empty="No administrative actions have been recorded yet. Actions you take in the admin workspace appear here."
        filters={[
          {
            id: "category",
            label: "Category",
            options: [
              { id: "moderation", label: "Moderation", match: (row) => categoryOf(row.action) === "moderation" },
              { id: "finance", label: "Finance", match: (row) => categoryOf(row.action) === "finance" },
              { id: "applications", label: "Applications", match: (row) => categoryOf(row.action) === "applications" },
              { id: "support", label: "Support", match: (row) => categoryOf(row.action) === "support" },
            ],
          },
        ]}
      />
    </div>
  )
}
