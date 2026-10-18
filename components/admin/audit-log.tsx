"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, StatusBadge } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminAction, AdminAuditEvent } from "@/lib/admin"
import { auditActors, filterAudit, type AuditFilter } from "@/lib/admin-selectors"
import { replaceSearchParams } from "@/lib/admin-table"
import { formatDate, formatTime } from "@/lib/format"
import { isDateKey } from "@/lib/timezone"

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
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <AuditLogInner />
    </Suspense>
  )
}

const filterLabels: Record<keyof AuditFilter, string> = { from: "From", to: "To", actor: "Actor" }

function AuditLogInner() {
  const source = useAdminSource()
  const params = useSearchParams()
  const [filter, setFilter] = useState<AuditFilter>(() => {
    const date = (name: string) => (isDateKey(params.get(name) ?? "") ? params.get(name)! : undefined)
    return { from: date("from"), to: date("to"), actor: params.get("actor") ?? undefined }
  })
  const actors = auditActors(source.admin.audit)
  const rows = filterAudit(source.admin.audit, filter)

  const change = (name: keyof AuditFilter, value: string | undefined) => {
    setFilter((current) => ({ ...current, [name]: value || undefined }))
    replaceSearchParams({ [name]: value || undefined, page: undefined })
  }

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
    { id: "target", header: "Target", csv: (row) => row.target, cell: (row) => <span className="font-mono text-xs">{row.target}</span> },
    { id: "detail", header: "Detail", secondary: true, csv: (row) => row.detail, cell: (row) => <span className="text-muted-foreground">{row.detail ?? "—"}</span> },
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
        exportFilename="audit-log"
        pageResetKey={`${filter.from ?? ""}|${filter.to ?? ""}|${filter.actor ?? ""}`}
        empty={source.admin.audit.length === 0 ? "No administrative actions have been recorded yet. Actions you take in the admin workspace appear here." : "No actions match these filters."}
        toolbar={
          <div className="flex shrink-0 flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label htmlFor="audit-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input id="audit-from" type="date" value={filter.from ?? ""} max={filter.to} onChange={(event) => change("from", event.target.value)} className="h-8 w-40" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="audit-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input id="audit-to" type="date" value={filter.to ?? ""} min={filter.from} onChange={(event) => change("to", event.target.value)} className="h-8 w-40" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="audit-actor" className="text-xs text-muted-foreground">
                Actor
              </Label>
              <select
                id="audit-actor"
                value={filter.actor ?? ""}
                onChange={(event) => change("actor", event.target.value)}
                className="h-8 rounded-lg border bg-card px-2 text-sm focus-ring"
              >
                <option value="">Anyone</option>
                {actors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
        extraFilters={(Object.keys(filterLabels) as (keyof AuditFilter)[])
          .filter((name) => filter[name])
          .map((name) => ({ id: `audit-${name}`, label: `${filterLabels[name]}: ${filter[name]}`, onClear: () => change(name, undefined) }))}
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
