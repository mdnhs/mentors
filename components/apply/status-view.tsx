"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckCircle2Icon, CircleAlertIcon, ClockIcon, SearchCheckIcon, XCircleIcon } from "lucide-react"

import { PublicProfilePreview } from "@/components/apply/public-profile-preview"
import { Button, buttonVariants } from "@/components/ui/button"
import { formatDate } from "@/lib/format"
import { publicProfileOf, statusLabels, type Application, type AuditAction } from "@/lib/mentor-application"
import type { Principal } from "@/lib/permissions"
import { startApplication } from "@/lib/store"
import { checkCopy } from "@/lib/verification"
import { cn } from "@/lib/utils"

const activityText: Partial<Record<AuditAction, string>> = {
  created: "Application started",
  submitted: "Application submitted",
  resubmitted: "Application resubmitted",
  "review-started": "A reviewer started looking at it",
  "info-requested": "A reviewer asked for more information",
  approved: "Application approved",
  rejected: "Application not approved",
}

const timeline = [
  { id: "submitted", label: "Submitted" },
  { id: "under-review", label: "Under review" },
  { id: "decision", label: "Decision" },
] as const

type Props = { application: Application; principal: Principal; onEdit: () => void }

export function StatusView({ application, principal, onEdit }: Props) {
  const [error, setError] = useState<string | null>(null)
  const { status } = application
  const reached = status === "submitted" ? 0 : status === "under-review" || status === "info-required" ? 1 : 2
  const profile = publicProfileOf(application)
  // Applicants see their own activity without reviewer identities or evidence-viewing events.
  const activity = application.audit.filter((entry) => activityText[entry.action])

  const reapply = () => {
    const result = startApplication(principal)
    if (!result.ok) setError(result.message)
  }

  return (
    <div className="space-y-6">
      <div className="surface p-5 shadow-card sm:p-6">
        <p className="text-sm text-muted-foreground">Mentor application</p>
        <div role="status">
          <h2 className="mt-1 flex items-center gap-2 text-subheading">
            {status === "approved" ? <CheckCircle2Icon className="size-5 text-success" aria-hidden="true" /> : status === "rejected" ? <XCircleIcon className="size-5 text-muted-foreground" aria-hidden="true" /> : status === "info-required" ? <CircleAlertIcon className="size-5 text-warning" aria-hidden="true" /> : status === "under-review" ? <SearchCheckIcon className="size-5" aria-hidden="true" /> : <ClockIcon className="size-5" aria-hidden="true" />}
            {statusLabels[status]}
          </h2>
        </div>

        {status !== "info-required" && (
          <ol className="mt-4 flex items-center gap-2 text-sm" aria-label="Progress">
            {timeline.map((item, position) => (
              <li key={item.id} className="flex items-center gap-2">
                {position > 0 && <span className="h-px w-5 bg-border" aria-hidden="true" />}
                <span className={cn("rounded-full px-2.5 py-1 text-xs", position <= reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {position === 2 && status === "approved" ? "Approved" : position === 2 && status === "rejected" ? "Not approved" : item.label}
                </span>
              </li>
            ))}
          </ol>
        )}

        {status === "submitted" && <p className="mt-4 text-sm text-muted-foreground">Thanks. Your application is in the queue. A reviewer will check your details and evidence, and we&apos;ll show the result here.</p>}
        {status === "under-review" && <p className="mt-4 text-sm text-muted-foreground">A reviewer is checking your details and evidence. You can&apos;t edit while it&apos;s under review.</p>}
        {status === "info-required" && application.infoRequest && (
          <div className="mt-4 space-y-3 text-sm">
            <p>{application.infoRequest.message}</p>
            <p className="text-muted-foreground">Needed: {application.infoRequest.kinds.map((kind) => checkCopy[kind].label.toLowerCase()).join(", ")}</p>
            <Button onClick={onEdit}>Add information and resubmit</Button>
          </div>
        )}
        {status === "approved" && (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-muted-foreground">
              You&apos;re approved. {application.decision?.message && <span>Reviewer note: {application.decision.message} </span>}In this demo your workspace is the sample mentor&apos;s: log in with the mentor role to manage offers and availability.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/mentor" className={buttonVariants()}>
                Go to mentor workspace
              </Link>
              {profile && (
                <a href="#profile-preview" className={buttonVariants({ variant: "outline" })}>
                  Preview profile
                </a>
              )}
            </div>
          </div>
        )}
        {status === "rejected" && (
          <div className="mt-4 space-y-3 text-sm">
            <p>{application.decision?.message}</p>
            <p className="text-muted-foreground">You can apply again with new evidence.</p>
            <Button onClick={reapply}>Start a new application</Button>
            {error && (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            )}
          </div>
        )}
      </div>

      {profile && (
        <div id="profile-preview" className="scroll-mt-24">
          <PublicProfilePreview profile={profile} />
        </div>
      )}

      <section aria-labelledby="activity">
        <h3 id="activity" className="text-sm font-medium">
          Activity
        </h3>
        {activity.length > 0 ? (
          <ul className="mt-2 divide-y rounded-xl border text-sm">
            {activity.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-3 p-3">
                <span>{activityText[entry.action]}</span>
                <time dateTime={entry.at} className="shrink-0 text-muted-foreground">
                  {formatDate(entry.at)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">No activity yet. Updates from reviewers will appear here.</p>
        )}
      </section>
    </div>
  )
}
