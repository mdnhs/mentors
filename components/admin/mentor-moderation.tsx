"use client"

import { useState } from "react"
import { BanIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react"

import { DataTable, type Column } from "@/components/admin/data-table"
import { ReasonDialog, notify, StatusBadge, moderationTone, sentenceCase } from "@/components/admin/parts"
import { PageHeader, Stat, StatStrip } from "@/components/portal/ui"
import { useAdminSource } from "@/components/admin/use-admin"
import { Button } from "@/components/ui/button"
import { usePrincipal } from "@/lib/auth"
import { adminMentorRows, adminOfferRows, type AdminMentorRow, type AdminOfferRow } from "@/lib/admin-selectors"
import { getCategory, offerTypeLabels } from "@/lib/categories"
import { formatPrice } from "@/lib/format"
import { adminModerateMentor, adminModerateOffer } from "@/lib/store"

type Pending = { kind: "mentor" | "offer"; id: string; label: string } | null

export function MentorModeration() {
  const source = useAdminSource()
  const principal = usePrincipal()
  const [pending, setPending] = useState<Pending>(null)

  const mentorRows = adminMentorRows(source)
  const offerRows = adminOfferRows(source)

  const run = (result: { ok: boolean; message?: string }, success: string) => {
    if (notify(result, success)) setPending(null)
  }

  const mentorColumns: Column<AdminMentorRow>[] = [
    {
      id: "name",
      header: "Mentor",
      sortValue: (row) => row.mentor.name,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.mentor.name}</p>
          <p className="text-xs text-muted-foreground">
            {row.mentor.role} · {row.mentor.city}, {row.mentor.country}
          </p>
        </div>
      ),
    },
    {
      id: "areas",
      header: "Areas",
      secondary: true,
      csv: (row) => row.mentor.categories.map((id) => getCategory(id).label).join("; "),
      cell: (row) => <span className="text-muted-foreground">{row.mentor.categories.map((id) => getCategory(id).label).join(", ")}</span>,
    },
    {
      id: "offers",
      header: "Offers",
      align: "right",
      sortValue: (row) => row.mentor.offers.length,
      cell: (row) => <span className="tabular-nums">{row.mentor.offers.length}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge tone={moderationTone(row.status)}>{row.status === "suspended" ? "Suspended" : "Active"}</StatusBadge>
          {row.moderation?.reason && <p className="max-w-56 text-xs text-muted-foreground">{row.moderation.reason}</p>}
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row) =>
        row.status === "suspended" ? (
          <Button variant="outline" size="sm" onClick={() => run(adminModerateMentor(principal, row.mentor.slug, "active"), `${row.mentor.name} restored.`)}>
            <RotateCcwIcon aria-hidden="true" />
            Restore
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setPending({ kind: "mentor", id: row.mentor.slug, label: row.mentor.name })}>
            <BanIcon aria-hidden="true" />
            Suspend
          </Button>
        ),
    },
  ]

  const offerColumns: Column<AdminOfferRow>[] = [
    {
      id: "title",
      header: "Offer",
      sortValue: (row) => row.offer.title,
      cell: (row) => (
        <div>
          <p className="font-medium">{row.offer.title}</p>
          <p className="text-xs text-muted-foreground">{offerTypeLabels[row.offer.type]}</p>
        </div>
      ),
    },
    { id: "mentor", header: "Mentor", secondary: true, sortValue: (row) => row.mentor?.name ?? "", cell: (row) => <span className="text-muted-foreground">{row.mentor?.name ?? "—"}</span> },
    { id: "price", header: "Price", align: "right", sortValue: (row) => row.offer.price, cell: (row) => <span className="tabular-nums">{formatPrice(row.offer.price)}</span> },
    { id: "catalogue", header: "Catalogue", secondary: true, csv: (row) => row.offer.status, cell: (row) => <StatusBadge tone={moderationTone(row.offer.status)}>{sentenceCase(row.offer.status)}</StatusBadge> },
    {
      id: "moderation",
      header: "Moderation",
      sortValue: (row) => row.status,
      cell: (row) => (
        <div className="space-y-1">
          <StatusBadge tone={moderationTone(row.status)}>{row.status === "paused" ? "Paused" : "Live"}</StatusBadge>
          {row.moderation?.reason && <p className="max-w-56 text-xs text-muted-foreground">{row.moderation.reason}</p>}
        </div>
      ),
    },
    {
      id: "action",
      header: "Action",
      cell: (row) =>
        row.status === "paused" ? (
          <Button variant="outline" size="sm" onClick={() => run(adminModerateOffer(principal, row.offer.id, "live"), `“${row.offer.title}” restored.`)}>
            <PlayIcon aria-hidden="true" />
            Restore
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setPending({ kind: "offer", id: row.offer.id, label: row.offer.title })}>
            <PauseIcon aria-hidden="true" />
            Pause
          </Button>
        ),
    },
  ]

  return (
    <div>
      <PageHeader title="Mentors & offers" description="Suspend a mentor or pause an offer — with a reason, nothing deleted." />

      <StatStrip label="Moderation summary" className="mb-6">
        <Stat label="Active mentors" value={mentorRows.filter((row) => row.status === "active").length} />
        <Stat label="Suspended mentors" value={mentorRows.filter((row) => row.status === "suspended").length} />
        <Stat label="Live offers" value={offerRows.filter((row) => row.status === "live").length} />
        <Stat label="Paused offers" value={offerRows.filter((row) => row.status === "paused").length} />
      </StatStrip>

      <div className="space-y-6">
        <DataTable
          title="Mentors"
          anchor="mentor-table"
          rows={mentorRows}
          columns={mentorColumns}
          rowKey={(row) => row.mentor.slug}
          urlKey="mentors"
          exportFilename="mentors"
          search={(row) => `${row.mentor.name} ${row.mentor.role} ${row.mentor.city} ${row.mentor.skills.join(" ")}`}
          searchPlaceholder="Search mentors…"
          searchLabel="Search mentors"
          initialSort={{ columnId: "name", direction: "asc" }}
          filters={[
            {
              id: "status",
              label: "Status",
              options: [
                { id: "active", label: "Active", match: (row) => row.status === "active" },
                { id: "suspended", label: "Suspended", match: (row) => row.status === "suspended" },
              ],
            },
          ]}
        />

        <DataTable
          title="Offers"
          anchor="offer-table"
          rows={offerRows}
          columns={offerColumns}
          rowKey={(row) => row.offer.id}
          urlKey="offers"
          exportFilename="offers"
          search={(row) => `${row.offer.title} ${row.mentor?.name ?? ""}`}
          searchPlaceholder="Search offers…"
          searchLabel="Search offers"
          pageSize={8}
          filters={[
            {
              id: "moderation",
              label: "Moderation",
              options: [
                { id: "live", label: "Live", match: (row) => row.status === "live" },
                { id: "paused", label: "Paused", match: (row) => row.status === "paused" },
              ],
            },
            {
              id: "status",
              label: "Catalogue",
              options: [
                { id: "published", label: "Published", match: (row) => row.offer.status === "published" },
                { id: "other", label: "Draft / paused", match: (row) => row.offer.status !== "published" },
              ],
            },
          ]}
        />
      </div>

      {pending && (
        <ReasonDialog
          title={pending.kind === "mentor" ? `Suspend ${pending.label}` : `Pause “${pending.label}”`}
          description={pending.kind === "mentor" ? "The mentor keeps their record; the reason is logged." : "The offer keeps its details; the reason is logged."}
          label="Reason"
          placeholder="e.g. Repeated no-shows reported by learners"
          submitLabel={pending.kind === "mentor" ? "Suspend mentor" : "Pause offer"}
          destructive
          onSubmit={(reason) =>
            pending.kind === "mentor"
              ? run(adminModerateMentor(principal, pending.id, "suspended", reason), `${pending.label} suspended.`)
              : run(adminModerateOffer(principal, pending.id, "paused", reason), `“${pending.label}” paused.`)
          }
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
