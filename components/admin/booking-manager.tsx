"use client"

import { useState } from "react"
import { XCircleIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, Feedback, SampleBadge, StatusBadge, moderationTone } from "@/components/admin/parts"
import { useAdminSource } from "@/components/admin/use-admin"
import { Button } from "@/components/ui/button"
import { adminCancelBooking } from "@/lib/admin-client"
import { adminBookingRows, type AdminBookingRow } from "@/lib/admin-selectors"
import { usePrincipal } from "@/lib/auth"
import { effectiveStatus } from "@/lib/booking-policy"
import { getMentor } from "@/lib/data"
import { formatDate, formatPrice, formatTime } from "@/lib/format"
import { orderStatusLabels } from "@/lib/orders"
import { useNow } from "@/lib/store"

export function BookingManager() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const now = useNow()
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const rows = adminBookingRows(source)
  const statusOf = (row: AdminBookingRow) => (now ? effectiveStatus(row.booking, now) : row.booking.status)

  const cancel = async (row: AdminBookingRow) => {
    setBusy(row.id)
    const result = await adminCancelBooking(principal, row.booking.id, row.scope === "other" ? "incoming" : "learner")
    setBusy(null)
    setFeedback({ tone: result.ok ? "ok" : "error", text: result.ok ? `${row.booking.id}: ${result.message}` : result.message })
  }

  const columns: Column<AdminBookingRow>[] = [
    {
      id: "booking",
      header: "Booking",
      sortValue: (row) => row.booking.title,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.booking.title}</p>
          <p className="text-xs text-muted-foreground">
            {row.booking.id} · {getMentor(row.booking.mentorSlug)?.name ?? row.booking.mentorSlug}
          </p>
        </div>
      ),
    },
    { id: "learner", header: "Learner", secondary: true, sortValue: (row) => row.learner, cell: (row) => <span className="text-muted-foreground">{row.learner}</span> },
    {
      id: "when",
      header: "When",
      sortValue: (row) => row.booking.date,
      cell: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.booking.date, row.booking.timezone)}
          <span className="block text-xs text-muted-foreground">{formatTime(row.booking.date, row.booking.timezone)}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Booking status",
      sortValue: (row) => statusOf(row),
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={moderationTone(statusOf(row))}>{statusOf(row)}</StatusBadge>
          {row.booking.sample && <SampleBadge />}
        </div>
      ),
    },
    {
      id: "payment",
      header: "Payment",
      secondary: true,
      sortValue: (row) => row.order?.status ?? "none",
      cell: (row) => <span className="text-muted-foreground">{row.order ? orderStatusLabels[row.order.status] : "No order"}</span>,
    },
    {
      id: "total",
      header: "Total",
      align: "right",
      sortValue: (row) => row.order?.quote.total ?? row.booking.total,
      cell: (row) => <span className="tabular-nums">{formatPrice(row.order?.quote.total ?? row.booking.total)}</span>,
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => {
        const cancellable = ["pending", "confirmed", "in-review"].includes(statusOf(row))
        return cancellable ? (
          <Button variant="outline" size="sm" onClick={() => cancel(row)} disabled={busy === row.id}>
            <XCircleIcon aria-hidden="true" />
            {busy === row.id ? "Cancelling…" : "Cancel & refund"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">No action</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Booking management" description="Every booking in the marketplace, with the order behind it. Cancelling applies the booking's refund policy." />
      <DemoNotice>Refunds are demo refunds — no money moves. The learner is refunded by the policy in the booking record; a mentor cancellation refunds in full.</DemoNotice>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        search={(row) => `${row.booking.id} ${row.booking.title} ${row.learner} ${row.booking.mentorSlug}`}
        searchPlaceholder="Search booking id, title or learner…"
        searchLabel="Search bookings"
        pageSize={12}
        initialSort={{ columnId: "when", direction: "desc" }}
        filters={[
          {
            id: "status",
            label: "Status",
            options: [
              { id: "active", label: "Active", match: (row) => ["pending", "confirmed", "in-review"].includes(statusOf(row)) },
              { id: "completed", label: "Completed", match: (row) => statusOf(row) === "completed" },
              { id: "cancelled", label: "Cancelled", match: (row) => statusOf(row) === "cancelled" },
              { id: "expired", label: "Expired", match: (row) => statusOf(row) === "expired" },
            ],
          },
          {
            id: "sample",
            label: "Source",
            options: [
              { id: "sample", label: "Sample", match: (row) => Boolean(row.booking.sample) },
              { id: "live", label: "Not sample", match: (row) => !row.booking.sample },
            ],
          },
        ]}
      />

      {feedback && <Feedback tone={feedback.tone}>{feedback.text}</Feedback>}
    </div>
  )
}
