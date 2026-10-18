"use client"

import { useState } from "react"
import { BanIcon, CircleCheckIcon, ClockIcon, RotateCcwIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, ReasonDialog, notify, SampleBadge, StatusBadge, moderationTone } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { Button } from "@/components/ui/button"
import { usePrincipal } from "@/lib/auth"
import { adminAccountRows, type AdminAccountRow } from "@/lib/admin-selectors"
import type { SupportTicket } from "@/lib/admin"
import { formatDate } from "@/lib/format"
import { adminRestrictAccount, adminUpdateTicket } from "@/lib/store"

export function UserSupport() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const [pending, setPending] = useState<AdminAccountRow | null>(null)

  const accounts = adminAccountRows(source)
  const tickets = [...source.admin.tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const run = (result: { ok: boolean; message?: string }, success: string) => {
    if (notify(result, success)) setPending(null)
  }

  const setTicket = (ticket: SupportTicket, status: "open" | "pending" | "closed") => run(adminUpdateTicket(principal, ticket.id, status), `${ticket.id} marked ${status}.`)

  const bulkTickets = (selected: SupportTicket[], status: "pending" | "closed") => {
    const changed = selected.filter((ticket) => ticket.status !== status)
    const failed = changed.map((ticket) => adminUpdateTicket(principal, ticket.id, status)).find((result) => !result.ok)
    notify(failed ?? { ok: true }, `${changed.length} ${changed.length === 1 ? "ticket" : "tickets"} marked ${status}.`)
  }

  const accountColumns: Column<AdminAccountRow>[] = [
    {
      id: "account",
      header: "Account",
      sortValue: (row) => row.email,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    { id: "kinds", header: "Role", secondary: true, csv: (row) => row.kinds.join("; "), cell: (row) => <span className="text-muted-foreground">{row.kinds.join(", ")}</span> },
    { id: "applications", header: "Applications", align: "right", sortValue: (row) => row.applications, cell: (row) => <span className="tabular-nums">{row.applications || "—"}</span> },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => (row.restricted ? "restricted" : "active"),
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge tone={moderationTone(row.restricted ? "restricted" : "active")}>{row.restricted ? "Restricted" : "Active"}</StatusBadge>
          {row.moderation?.reason && <p className="max-w-56 text-xs text-muted-foreground">{row.moderation.reason}</p>}
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row) =>
        row.restricted ? (
          <Button variant="outline" size="sm" onClick={() => run(adminRestrictAccount(principal, row.email, "active"), `${row.email} restored.`)}>
            <RotateCcwIcon aria-hidden="true" />
            Restore
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setPending(row)}>
            <BanIcon aria-hidden="true" />
            Restrict
          </Button>
        ),
    },
  ]

  const ticketColumns: Column<SupportTicket>[] = [
    { id: "id", header: "Ticket", sortValue: (row) => row.id, cell: (row) => <span className="font-medium">{row.id}</span> },
    { id: "subject", header: "Subject", sortValue: (row) => row.subject, cell: (row) => <span>{row.subject}</span> },
    { id: "email", header: "From", secondary: true, sortValue: (row) => row.email, cell: (row) => <span className="text-muted-foreground">{row.email}</span> },
    { id: "priority", header: "Priority", secondary: true, csv: (row) => row.priority, cell: (row) => <StatusBadge tone={row.priority === "high" ? "danger" : row.priority === "low" ? "neutral" : "accent"}>{row.priority}</StatusBadge> },
    { id: "status", header: "Status", sortValue: (row) => row.status, cell: (row) => <StatusBadge tone={moderationTone(row.status)}>{row.status}</StatusBadge> },
    { id: "updated", header: "Updated", secondary: true, sortValue: (row) => row.updatedAt, cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.updatedAt)}</span> },
    {
      id: "action",
      header: "Action",
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.status !== "pending" && (
            <Button variant="outline" size="sm" onClick={() => setTicket(row, "pending")}>
              <ClockIcon aria-hidden="true" />
              Pending
            </Button>
          )}
          {row.status !== "closed" ? (
            <Button variant="outline" size="sm" onClick={() => setTicket(row, "closed")}>
              <CircleCheckIcon aria-hidden="true" />
              Close
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setTicket(row, "open")}>
              <RotateCcwIcon aria-hidden="true" />
              Reopen
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users & support" description="Accounts derived from applications, bookings, disputes and tickets, plus the demo support queue." />
      <DemoNotice>Restrictions are recorded in this browser only and block nothing real. No ID documents, contact details beyond an email, or payment data are shown here.</DemoNotice>

      <section aria-labelledby="account-table">
        <h2 id="account-table" className="text-subheading">
          Accounts
        </h2>
        <div className="mt-3">
          <DataTable
            rows={accounts}
            columns={accountColumns}
            rowKey={(row) => row.email}
            urlKey="accounts"
            exportFilename="accounts"
            search={(row) => `${row.name} ${row.email} ${row.kinds.join(" ")}`}
            searchPlaceholder="Search email or name…"
            searchLabel="Search accounts"
            initialSort={{ columnId: "account", direction: "asc" }}
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { id: "active", label: "Active", match: (row) => !row.restricted },
                  { id: "restricted", label: "Restricted", match: (row) => row.restricted },
                ],
              },
            ]}
          />
        </div>
      </section>

      <section aria-labelledby="ticket-table">
        <h2 id="ticket-table" className="text-subheading">
          Support queue
        </h2>
        <div className="mt-3">
          <DataTable
            rows={tickets}
            columns={ticketColumns}
            rowKey={(row) => row.id}
            urlKey="tickets"
            exportFilename="support-tickets"
            selectable
            bulkActions={(selected, clear) => (
              <>
                <Button variant="outline" size="sm" onClick={() => { bulkTickets(selected, "pending"); clear() }}>
                  <ClockIcon aria-hidden="true" />
                  Mark pending
                </Button>
                <Button variant="outline" size="sm" onClick={() => { bulkTickets(selected, "closed"); clear() }}>
                  <CircleCheckIcon aria-hidden="true" />
                  Close
                </Button>
              </>
            )}
            search={(row) => `${row.id} ${row.subject} ${row.email}`}
            searchPlaceholder="Search ticket, subject or email…"
            searchLabel="Search tickets"
            empty="No support tickets."
            initialSort={{ columnId: "updated", direction: "desc" }}
            filters={[
              {
                id: "status",
                label: "Status",
                options: [
                  { id: "open", label: "Open", match: (row) => row.status === "open" },
                  { id: "pending", label: "Pending", match: (row) => row.status === "pending" },
                  { id: "closed", label: "Closed", match: (row) => row.status === "closed" },
                ],
              },
            ]}
          />
        </div>
      </section>

      {pending && (
        <ReasonDialog
          title={`Restrict ${pending.email}`}
          description="The account is flagged here for the record. This demo cannot suspend a real sign-in."
          label="Reason"
          placeholder="e.g. Payment abuse reported by a mentor; under review"
          submitLabel="Restrict account"
          destructive
          onSubmit={(reason) => run(adminRestrictAccount(principal, pending.email, "restricted", reason), `${pending.email} restricted.`)}
          onCancel={() => setPending(null)}
        />
      )}


      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <SampleBadge /> Tickets and reporter accounts are made up demo records.
      </p>
    </div>
  )
}
