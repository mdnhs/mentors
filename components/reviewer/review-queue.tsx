"use client"

import Link from "next/link"
import { useState } from "react"
import { InboxIcon } from "lucide-react"

import { DemoNotice } from "@/components/admin/parts"
import { SamplePill } from "@/components/dashboard/booking-row"
import { ApplicationStatusBadge } from "@/components/reviewer/status-badge"
import { EmptyState } from "@/components/site/empty-state"
import { Chip } from "@/components/filters/chip"
import { usePrincipal } from "@/lib/auth"
import { getCategory } from "@/lib/categories"
import { formatDate } from "@/lib/format"
import { visibleTo, type ApplicationStatus } from "@/lib/mentor-application"
import { useAppState } from "@/lib/store"

const filters: { id: "open" | ApplicationStatus | "decided"; label: string }[] = [
  { id: "open", label: "Needs attention" },
  { id: "submitted", label: "Submitted" },
  { id: "under-review", label: "Under review" },
  { id: "info-required", label: "Waiting on applicant" },
  { id: "decided", label: "Decided" },
]

export function ReviewQueue({ basePath = "/dashboard/reviewer" }: { basePath?: string }) {
  const { applications } = useAppState()
  const principal = usePrincipal()
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("open")
  const queue = visibleTo(principal, applications)
  const shown = queue
    .filter((item) => (filter === "open" ? item.status === "submitted" || item.status === "under-review" : filter === "decided" ? item.status === "approved" || item.status === "rejected" : item.status === filter))
    .sort((a, b) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt))

  return (
    <div>
      <h1 className="text-title">Application review</h1>
      <p className="mt-1 text-sm text-muted-foreground">{principal?.role === "admin" ? "Demo admin account" : "Demo reviewer account"} · {principal?.email}</p>

      <DemoNotice label="Demo review desk." className="mt-5">
        Applicants marked Sample are made up, and their documents are placeholders. Evidence you open is logged to the audit trail.
      </DemoNotice>

      <div className="scrollbar-none -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter applications">
        {filters.map((item) => (
          <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>

      {shown.length > 0 ? (
        <ul className="mt-5 divide-y surface">
          {shown.map((item) => (
            <li key={item.id} className="relative flex flex-wrap items-center gap-x-4 gap-y-1 p-4 transition hover:bg-muted/60 first:rounded-t-2xl last:rounded-b-2xl">
              <div className="min-w-0 flex-1">
                <Link href={`${basePath}/${item.id}`} className="font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
                  {item.data.basic.fullName}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {item.data.background.role} · {item.data.expertise.categories.map((id) => getCategory(id).label).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {item.sample && <SamplePill />}
                <ApplicationStatusBadge status={item.status} />
              </div>
              <time dateTime={item.submittedAt} className="w-24 text-right text-sm text-muted-foreground">
                {item.submittedAt ? formatDate(item.submittedAt) : ""}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={InboxIcon} title="Nothing here" description="Applications that match this filter will appear here." className="mt-5" />
      )}
    </div>
  )
}
