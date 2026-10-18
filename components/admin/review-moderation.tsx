"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon, StarIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { ReasonDialog, notify, StatusBadge, moderationTone } from "@/components/admin/parts"
import { PageHeader, Stat, StatStrip } from "@/components/portal/ui"
import { useAdminSource } from "@/components/admin/use-admin"
import { Button } from "@/components/ui/button"
import { usePrincipal } from "@/lib/auth"
import { adminReviewRows, type AdminReviewRow } from "@/lib/admin-selectors"
import { formatDate } from "@/lib/format"
import { offerTypeLabels } from "@/lib/categories"
import { adminModerateReview } from "@/lib/store"

export function ReviewModeration() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const [pending, setPending] = useState<AdminReviewRow | null>(null)

  const rows = adminReviewRows(source)
  const average = rows.length ? rows.reduce((total, row) => total + row.review.rating, 0) / rows.length : 0

  const run = (result: { ok: boolean; message?: string }, success: string) => {
    if (notify(result, success)) setPending(null)
  }

  const columns: Column<AdminReviewRow>[] = [
    {
      id: "review",
      header: "Review",
      sortValue: (row) => row.review.date,
      cell: (row) => (
        <div className="max-w-96">
          <p className="font-medium">
            {row.review.author}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{row.review.authorRole}</span>
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{row.review.text}</p>
        </div>
      ),
    },
    { id: "mentor", header: "Mentor", secondary: true, sortValue: (row) => row.mentor?.name ?? row.review.mentorSlug, cell: (row) => <span className="text-muted-foreground">{row.mentor?.name ?? row.review.mentorSlug}</span> },
    {
      id: "rating",
      header: "Rating",
      align: "right",
      sortValue: (row) => row.review.rating,
      cell: (row) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <StarIcon className="size-3.5 text-rating" aria-hidden="true" />
          {row.review.rating}
        </span>
      ),
    },
    { id: "type", header: "Type", secondary: true, csv: (row) => offerTypeLabels[row.review.offerType], cell: (row) => <span className="text-muted-foreground">{offerTypeLabels[row.review.offerType]}</span> },
    { id: "date", header: "Date", secondary: true, sortValue: (row) => row.review.date, cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.review.date)}</span> },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge tone={moderationTone(row.status)}>{row.status === "hidden" ? "Hidden" : "Visible"}</StatusBadge>
          {row.moderation?.reason && <p className="max-w-56 text-xs text-muted-foreground">{row.moderation.reason}</p>}
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row) =>
        row.status === "hidden" ? (
          <Button variant="outline" size="sm" onClick={() => run(adminModerateReview(principal, row.review.id, "visible"), "Review restored.")}>
            <EyeIcon aria-hidden="true" />
            Restore
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setPending(row)}>
            <EyeOffIcon aria-hidden="true" />
            Hide
          </Button>
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="Review moderation" description="Hide a review that breaks the guidelines." />

      <StatStrip label="Review summary" className="mb-6">
        <Stat label="Visible" value={rows.filter((row) => row.status === "visible").length} />
        <Stat label="Hidden" value={rows.filter((row) => row.status === "hidden").length} />
        <Stat label="Average rating" value={average.toFixed(1)} hint={`From ${rows.length} reviews`} />
        <Stat label="Low ratings" value={rows.filter((row) => row.review.rating <= 2).length} hint="1–2 stars" />
      </StatStrip>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.review.id}
        exportFilename="reviews"
        search={(row) => `${row.review.author} ${row.review.text} ${row.mentor?.name ?? ""}`}
        searchPlaceholder="Search author, text or mentor…"
        searchLabel="Search reviews"
        pageSize={12}
        initialSort={{ columnId: "date", direction: "desc" }}
        filters={[
          {
            id: "rating",
            label: "Rating",
            options: [
              { id: "low", label: "1–2 stars", match: (row) => row.review.rating <= 2 },
              { id: "mid", label: "3 stars", match: (row) => row.review.rating === 3 },
              { id: "high", label: "4–5 stars", match: (row) => row.review.rating >= 4 },
            ],
          },
          {
            id: "status",
            label: "Status",
            options: [
              { id: "visible", label: "Visible", match: (row) => row.status === "visible" },
              { id: "hidden", label: "Hidden", match: (row) => row.status === "hidden" },
            ],
          },
        ]}
      />

      {pending && (
        <ReasonDialog
          title={`Hide review by ${pending.review.author}`}
          description={`${pending.mentor?.name ?? pending.review.mentorSlug} · ${pending.review.rating}★ · ${formatDate(pending.review.date)}`}
          label="Reason"
          placeholder="e.g. Names a person outside the session; remove personal details"
          submitLabel="Hide review"
          destructive
          onSubmit={(reason) => run(adminModerateReview(principal, pending.review.id, "hidden", reason), "Review hidden.")}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
