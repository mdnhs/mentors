"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon, StarIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { AdminPageHeader, DemoNotice, Feedback, ReasonPanel, SampleBadge, StatusBadge, moderationTone } from "@/components/admin/parts"
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
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const rows = adminReviewRows(source)

  const run = (result: { ok: boolean; message?: string }, success: string) => {
    setFeedback(result.ok ? { tone: "ok", text: success } : { tone: "error", text: result.message ?? "That didn't work." })
    if (result.ok) setPending(null)
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
    { id: "type", header: "Type", secondary: true, cell: (row) => <span className="text-muted-foreground">{offerTypeLabels[row.review.offerType]}</span> },
    { id: "date", header: "Date", secondary: true, sortValue: (row) => row.review.date, cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.review.date)}</span> },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge tone={moderationTone(row.status === "hidden" ? "hidden" : "visible")}>{row.status === "hidden" ? "Hidden" : "Visible"}</StatusBadge>
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
    <div className="space-y-6">
      <AdminPageHeader title="Review moderation" description="Reviews are published only from completed bookings. Hide a review that breaks the guidelines." />
      <DemoNotice>Hiding is recorded here. This demo’s public profile reads static data, so the storefront is not affected.</DemoNotice>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.review.id}
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
        <ReasonPanel
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

      {feedback && <Feedback tone={feedback.tone}>{feedback.text}</Feedback>}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <SampleBadge /> All reviews in this demo are made up and tied to sample completed bookings.
      </p>
    </div>
  )
}
