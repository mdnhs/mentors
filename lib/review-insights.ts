import type { Application } from "@/lib/mentor-application"

export type ReviewView = "open" | "submitted" | "under-review" | "info-required" | "decided"

export const reviewViews: { id: ReviewView; label: string }[] = [
  { id: "open", label: "Needs attention" },
  { id: "submitted", label: "Submitted" },
  { id: "under-review", label: "Under review" },
  { id: "info-required", label: "Waiting on applicant" },
  { id: "decided", label: "Decided" },
]

const DAY = 86_400_000
// Reviewers aim to act within three days of an application landing with them.
export const REVIEW_SLA_DAYS = 3
export const DECIDED_WINDOW_DAYS = 30

export const parseView = (value: string | null | undefined): ReviewView => reviewViews.find((view) => view.id === value)?.id ?? "open"

export const isDecided = (application: Application) => application.status === "approved" || application.status === "rejected"

export function matchesView(application: Application, view: ReviewView) {
  if (view === "open") return application.status === "submitted" || application.status === "under-review"
  if (view === "decided") return isDecided(application)
  return application.status === view
}

// When the application last landed in its current state: resubmissions restart the clock, requests start the applicant's.
export function waitingSince(application: Application): string {
  if (isDecided(application) && application.decision) return application.decision.at
  if (application.status === "info-required" && application.infoRequest) return application.infoRequest.at
  const arrival = application.audit.findLast((entry) => entry.action === "submitted" || entry.action === "resubmitted")
  return arrival?.at ?? application.submittedAt ?? application.createdAt
}

export const daysSince = (iso: string, now: Date) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY))

const days = (count: number) => (count === 1 ? "1 day" : `${count} days`)

export function ageOf(application: Application, now: Date): { label: string; overdue: boolean } {
  const count = daysSince(waitingSince(application), now)
  if (isDecided(application)) return { label: count === 0 ? "Decided today" : `Decided ${days(count)} ago`, overdue: false }
  if (application.status === "info-required") return { label: count === 0 ? "Asked today" : `Asked ${days(count)} ago`, overdue: false }
  return { label: count === 0 ? "Arrived today" : `Waiting ${days(count)}`, overdue: count > REVIEW_SLA_DAYS }
}

export function queueCounts(applications: Application[], now: Date): Record<ReviewView, number> {
  const count = (view: ReviewView) => applications.filter((item) => matchesView(item, view)).length
  return {
    open: count("open"),
    submitted: count("submitted"),
    "under-review": count("under-review"),
    "info-required": count("info-required"),
    decided: applications.filter((item) => isDecided(item) && daysSince(waitingSince(item), now) <= DECIDED_WINDOW_DAYS).length,
  }
}

// Open work is served oldest first so nothing ages out; decisions read newest first.
export function queueFor(applications: Application[], view: ReviewView) {
  const shown = applications.filter((item) => matchesView(item, view)).sort((a, b) => waitingSince(a).localeCompare(waitingSince(b)))
  return view === "decided" ? shown.reverse() : shown
}

export const overdueCount = (applications: Application[], now: Date) => applications.filter((item) => matchesView(item, "open") && ageOf(item, now).overdue).length
