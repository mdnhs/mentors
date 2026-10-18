"use client"

import { useState, type ReactNode } from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import {
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileImageIcon,
  FileTextIcon,
  LinkIcon,
  MapPinIcon,
  QuoteIcon,
} from "lucide-react"

import { SamplePill } from "@/components/dashboard/booking-row"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { PageHeader, Panel, PortalEmpty } from "@/components/portal/ui"
import { ApplicationStatusBadge } from "@/components/reviewer/status-badge"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Crumb } from "@/components/ui/page-breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { usePrincipal } from "@/lib/auth"
import { weekdays } from "@/lib/availability-settings"
import { getCategory, offerTypeLabels } from "@/lib/categories"
import { formatDate, formatDuration, formatPrice, formatTime, timezoneLabel } from "@/lib/format"
import { approvalBlocker, visibleTo, type Application, type AuditAction, type EvidenceItem, type Verdict, type Verdicts } from "@/lib/mentor-application"
import { openEvidence, reviewApplication, useAppState } from "@/lib/store"
import { cn } from "@/lib/utils"
import { checkCopy, checkKinds, type CheckKind } from "@/lib/verification"

const verdictLabels: Record<Verdict, string> = { verified: "Verified", "not-verified": "Could not verify", unchecked: "Not checked yet" }
const verdictTones: Record<Verdict, "success" | "danger" | "neutral"> = { verified: "success", "not-verified": "danger", unchecked: "neutral" }

const auditLabels: Record<AuditAction, string> = {
  created: "Draft created",
  submitted: "Submitted",
  "review-started": "Review started",
  "checks-recorded": "Checks recorded",
  "evidence-viewed": "Evidence opened",
  "info-requested": "Changes requested",
  resubmitted: "Resubmitted",
  approved: "Approved",
  rejected: "Not approved",
}

const pathLabels: Record<Application["data"]["background"]["path"], string> = { professional: "Professional", academic: "Academic", both: "Professional and academic" }

export function ReviewDetail({ id, crumbs }: { id: string; crumbs: Crumb[] }) {
  const { applications } = useAppState()
  const principal = usePrincipal()
  // visibleTo already leaves out drafts and the reviewer's own application.
  const application = principal ? visibleTo(principal, applications).find((item) => item.id === id) : undefined

  if (!principal) return <Skeleton className="h-64 rounded-2xl" />
  if (!application) {
    return (
      <>
        <PageHeader title="Application not found" crumbs={[...crumbs, { label: "Application" }]} />
        <Panel>
          <PortalEmpty icon={FileTextIcon} title="Nothing to review here" description="It may not be submitted yet, or it may be your own." />
        </Panel>
      </>
    )
  }
  return <Detail application={application} crumbs={crumbs} />
}

const modes = [
  ["approve", "Approve"],
  ["request-info", "Request changes"],
  ["reject", "Not approve"],
] as const

type Mode = (typeof modes)[number][0]

function Detail({ application, crumbs }: { application: Application; crumbs: Crumb[] }) {
  const principal = usePrincipal()
  const { data } = application
  const [opened, setOpened] = useState<Record<string, EvidenceItem>>({})
  const [verdicts, setVerdicts] = useState<Verdicts>(application.verdicts)
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const reviewing = application.status === "under-review"
  const dirty = checkKinds.some((kind) => verdicts[kind] !== application.verdicts[kind])

  const act = (action: Parameters<typeof reviewApplication>[2], success: string) => {
    const result = reviewApplication(principal, application.id, action)
    setFeedback(result.ok ? { tone: "ok", text: success } : { tone: "error", text: result.message })
    return result.ok
  }

  const open = (item: EvidenceItem) => {
    const result = openEvidence(principal, application.id, item.id)
    if (result.ok) setOpened((current) => ({ ...current, [item.id]: result.evidence }))
    else setFeedback({ tone: "error", text: result.message })
  }

  return (
    <>
      <PageHeader
        crumbs={[...crumbs, { label: data.basic.fullName }]}
        title={
          <span className="flex items-center gap-3">
            <span aria-hidden="true">
              <MentorAvatar name={data.basic.fullName} className="size-11" />
            </span>
            {data.basic.fullName}
          </span>
        }
        description={`${data.background.role}, ${data.background.organization}`}
        actions={
          <>
            {application.sample && <SamplePill />}
            <ApplicationStatusBadge status={application.status} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-label="Applicant summary" className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Fact label="Location">
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {data.basic.city}, {data.basic.country}
              </span>
            </Fact>
            <Fact label="Timezone">{timezoneLabel(data.basic.timezone, application.submittedAt ?? application.createdAt)}</Fact>
            <Fact label="Email">
              <span className="break-all">{application.applicantEmail}</span>
            </Fact>
            <Fact label="Submitted">{application.submittedAt ? formatDate(application.submittedAt) : "Not yet"}</Fact>
          </dl>
          <ul aria-label="Areas" className="mt-4 flex flex-wrap gap-1.5 border-t pt-4">
            {data.expertise.categories.map((categoryId) => (
              <li key={categoryId}>
                <Badge tone="accent">{getCategory(categoryId).label}</Badge>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4 lg:sticky lg:top-24 lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:self-start">
          <DecisionPanel application={application} reviewing={reviewing} dirty={dirty} act={act} clear={() => setFeedback(null)} />
          {feedback && (
            <Alert variant={feedback.tone === "error" ? "destructive" : "success"} role={feedback.tone === "error" ? "alert" : "status"}>
              {feedback.tone === "error" ? <CircleAlertIcon aria-hidden="true" /> : <CircleCheckIcon aria-hidden="true" />}
              <AlertDescription className="text-current">{feedback.text}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Panel title="Background" id="background">
            <dl className="divide-y text-sm">
              <Row label="Path">{pathLabels[data.background.path]}</Row>
              <Row label="Experience">{data.background.years} years</Row>
              <Row label="Education">{data.background.education}</Row>
              <Row label="Skills">{data.expertise.skills}</Row>
              <Row label="Helps">{data.expertise.audience}</Row>
              <Row label="Languages">{data.expertise.languages.join(", ")}</Row>
              {data.background.profileUrl && (
                <Row label="Profile link">
                  <a href={data.background.profileUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 break-all">
                    {data.background.profileUrl}
                    <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                </Row>
              )}
            </dl>
          </Panel>

          <Panel title="Offers proposed" id="offers">
            <ul aria-label="Offer types" className="flex flex-wrap gap-1.5">
              {data.offers.types.map((type) => (
                <li key={type}>
                  <Badge tone="neutral">{offerTypeLabels[type]}</Badge>
                </li>
              ))}
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Fact label="From">
                <span className="font-medium tabular-nums">{formatPrice(Number(data.offers.startingPrice))}</span>
              </Fact>
              <Fact label="Session">
                <span className="tabular-nums">{formatDuration(Number(data.offers.durationMinutes))}</span>
              </Fact>
              <Fact label="When">
                <span className="tabular-nums">
                  {data.offers.days.map((day) => weekdays[day]).join(", ") || "Not set"}
                  {data.offers.times.length > 0 && ` at ${data.offers.times.join(", ")}`}
                </span>
              </Fact>
            </dl>
          </Panel>

          <Panel title="Evidence" id="evidence" description="Opening an item is logged. Contents never are.">
            <ul className="divide-y">
              {data.evidence.map((item) => (
                <EvidenceRow key={item.id} item={item} seen={opened[item.id]} verdict={application.verdicts[item.kind]} onOpen={() => open(item)} />
              ))}
            </ul>
          </Panel>

          <Panel title="Checks" id="checks" description="Only verified checks appear on the profile.">
            <ul className="divide-y">
              {checkKinds.map((kind) => (
                <li key={kind} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3 first:pt-0">
                  <Label htmlFor={`check-${kind}`} className="flex items-center gap-2 text-sm font-medium">
                    <VerdictDot verdict={application.verdicts[kind]} />
                    {checkCopy[kind].label}
                  </Label>
                  <select
                    id={`check-${kind}`}
                    value={verdicts[kind]}
                    disabled={!reviewing}
                    onChange={(event) => {
                      setVerdicts({ ...verdicts, [kind]: event.target.value as Verdict })
                      setFeedback(null)
                    }}
                    className="h-9 w-full rounded-lg border bg-card px-3 text-sm focus-ring disabled:opacity-70 sm:w-48"
                  >
                    {(Object.keys(verdictLabels) as Verdict[]).map((verdict) => (
                      <option key={verdict} value={verdict}>
                        {verdictLabels[verdict]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            {reviewing && (
              <Button variant="outline" className="mt-4 w-full sm:w-auto" disabled={!dirty} onClick={() => act({ kind: "record-checks", verdicts }, "Check results saved.")}>
                Save check results
              </Button>
            )}
          </Panel>

          <ProfilePreview application={application} />

          <Panel title="Activity" id="activity">
            <ol aria-label="Audit trail" className="relative">
              {application.audit.map((entry, index) => (
                <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {index < application.audit.length - 1 && <span aria-hidden="true" className="absolute top-4 bottom-0 left-1 w-px bg-border" />}
                  <span aria-hidden="true" className={cn("relative mt-1.5 size-2 shrink-0 rounded-full", entry.actor === "reviewer" ? "bg-primary" : "bg-muted-foreground")} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-medium">{auditLabels[entry.action]}</span>
                      <time dateTime={entry.at} className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(entry.at)}, {formatTime(entry.at)}
                      </time>
                    </p>
                    <p className="mt-0.5 break-all text-muted-foreground">
                      {entry.actor === "applicant" ? "Applicant" : "Reviewer"} {entry.actorRef}
                      {entry.detail && <span className="block text-xs">{entry.detail}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  )
}

function DecisionPanel({
  application,
  reviewing,
  dirty,
  act,
  clear,
}: {
  application: Application
  reviewing: boolean
  dirty: boolean
  act: (action: Parameters<typeof reviewApplication>[2], success: string) => boolean
  clear: () => void
}) {
  const [mode, setMode] = useState<Mode>("approve")
  const [shared, setShared] = useState("")
  const [internal, setInternal] = useState("")
  const [kinds, setKinds] = useState<CheckKind[]>([])
  const blocker = approvalBlocker(application.verdicts)
  const name = application.data.basic.fullName

  return (
    <Panel title="Decision" id="decision" action={<ApplicationStatusBadge status={application.status} />} bodyClassName="space-y-4">
      {application.status === "submitted" && (
        <>
          <p className="text-sm text-muted-foreground">Start the review to record checks and decide.</p>
          <Button className="w-full" onClick={() => act({ kind: "start" }, "You're now reviewing this application.")}>
            Start review
          </Button>
        </>
      )}

      {application.status === "info-required" && application.infoRequest && (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">Asked {formatDate(application.infoRequest.at)}</p>
          <p className="rounded-lg bg-muted/60 p-3">{application.infoRequest.message}</p>
          {application.infoRequest.kinds.length > 0 && (
            <p className="flex flex-wrap gap-1.5">
              {application.infoRequest.kinds.map((kind) => (
                <Badge key={kind} tone="warning">
                  {checkCopy[kind].label}
                </Badge>
              ))}
            </p>
          )}
        </div>
      )}

      {reviewing && (
        <>
          <RadioGroup aria-label="Decision" value={mode} onValueChange={(value: Mode) => {
              setMode(value)
              clear()
            }} className="grid gap-1.5">
            {modes.map(([value, label]) => (
              <Radio.Root
                key={value}
                value={value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors focus-ring hover:bg-muted/60",
                  "data-checked:border-primary data-checked:bg-accent/60 data-checked:font-medium",
                  value === "reject" && "data-checked:border-destructive data-checked:bg-destructive/5"
                )}
              >
                <span aria-hidden="true" className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", mode === value && (value === "reject" ? "border-destructive" : "border-primary"))}>
                  {mode === value && <span className={cn("size-2 rounded-full", value === "reject" ? "bg-destructive" : "bg-primary")} />}
                </span>
                {label}
              </Radio.Root>
            ))}
          </RadioGroup>

          {mode === "request-info" && (
            <fieldset>
              <legend className="text-sm font-medium">What is needed?</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {checkKinds.map((kind) => (
                  <label key={kind} className="flex cursor-pointer items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-sm transition-colors has-checked:border-primary has-checked:bg-accent/60">
                    <input type="checkbox" checked={kinds.includes(kind)} onChange={() => setKinds(kinds.includes(kind) ? kinds.filter((item) => item !== kind) : [...kinds, kind])} className="size-4 accent-primary" />
                    {checkCopy[kind].label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="decision-message">{mode === "approve" ? "Message to the applicant (optional)" : mode === "request-info" ? "What should they add?" : "Reason shown to the applicant"}</Label>
            <Textarea id="decision-message" rows={3} maxLength={500} value={shared} onChange={(event) => {
              setShared(event.target.value)
              clear()
            }} className="bg-card" />
          </div>
          {mode !== "request-info" && (
            <div className="grid gap-1.5">
              <Label htmlFor="decision-internal">Internal note (reviewers only)</Label>
              <Textarea id="decision-internal" rows={2} maxLength={500} value={internal} onChange={(event) => setInternal(event.target.value)} aria-describedby="decision-internal-hint" className="bg-card" />
              <p id="decision-internal-hint" className="text-xs text-muted-foreground">
                No document contents or ID numbers.
              </p>
            </div>
          )}

          {mode === "approve" && blocker && (
            <p className="flex gap-2 text-sm text-warning">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{blocker}</span>
              <a href="#checks" className="ml-auto shrink-0 font-medium underline underline-offset-2 focus-ring">
                Go to checks
              </a>
            </p>
          )}
          {dirty && <p className="text-sm text-warning">Save the check results first.</p>}

          {mode === "approve" &&
            (dirty || blocker ? (
              <Button className="w-full" disabled>
                Approve application
              </Button>
            ) : (
              <ConfirmAction
                trigger={<Button className="w-full">Approve application</Button>}
                title={`Approve ${name}?`}
                description="This is a final decision. Their profile can go live with the checks you verified."
                confirmLabel="Approve"
                busyLabel="Saving…"
                cancelLabel="Go back"
                onConfirm={() => act({ kind: "approve", message: shared, internalNote: internal }, "Application approved.")}
              />
            ))}
          {mode === "request-info" && (
            <Button className="w-full" disabled={dirty} onClick={() => act({ kind: "request-info", message: shared, kinds }, "Information requested.")}>
              Send request
            </Button>
          )}
          {mode === "reject" &&
            // Without a reason the domain refuses the decision, so show that error before asking to confirm.
            (shared.trim() === "" || dirty ? (
              <Button variant="destructive" className="w-full" disabled={dirty} onClick={() => act({ kind: "reject", message: shared, internalNote: internal }, "Application not approved.")}>
                Not approve
              </Button>
            ) : (
              <ConfirmAction
                trigger={
                  <Button variant="destructive" className="w-full">
                    Not approve
                  </Button>
                }
                title={`Not approve ${name}?`}
                description={
                  <>
                    <p>This is a final decision. The applicant sees this reason:</p>
                    <p className="mt-2 rounded-lg bg-muted p-2 text-foreground">{shared.trim()}</p>
                  </>
                }
                confirmLabel="Not approve"
                busyLabel="Saving…"
                cancelLabel="Go back"
                destructive
                onConfirm={() => act({ kind: "reject", message: shared, internalNote: internal }, "Application not approved.")}
              />
            ))}
        </>
      )}

      {application.decision && (
        <div className="space-y-3 text-sm">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              {application.decision.outcome === "approved" ? <CircleCheckIcon className="size-4 text-success" aria-hidden="true" /> : <CircleAlertIcon className="size-4 text-destructive" aria-hidden="true" />}
              {application.decision.outcome === "approved" ? "Approved" : "Not approved"}
            </h3>
            <p className="mt-0.5 break-all text-muted-foreground">
              {application.decision.reviewer}, {formatDate(application.decision.at)}
            </p>
          </div>
          {application.decision.message && <p className="rounded-lg bg-muted/60 p-3">{application.decision.message}</p>}
          {application.decision.internalNote && (
            <p className="rounded-lg border border-dashed p-3 text-muted-foreground">
              <span className="font-medium text-foreground">Internal: </span>
              {application.decision.internalNote}
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}

function EvidenceRow({ item, seen, verdict, onOpen }: { item: EvidenceItem; seen?: EvidenceItem; verdict: Verdict; onOpen: () => void }) {
  const Icon = item.form === "link" ? LinkIcon : item.form === "reference" ? QuoteIcon : item.fileType?.startsWith("image/") ? FileImageIcon : FileTextIcon
  const formLabel = item.form === "file" ? fileKind(item.fileType) : item.form === "link" ? "Link" : "Reference"

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {checkCopy[item.kind].label}, {formLabel}
            <Badge tone={verdictTones[verdict]}>{verdictLabels[verdict]}</Badge>
          </p>
        </div>
        <Button variant={seen ? "ghost" : "outline"} size="sm" onClick={onOpen}>
          {seen ? <CheckIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          {seen ? "Opened" : "Open"}
          <span className="sr-only"> {item.label}</span>
        </Button>
      </div>
      {seen && (
        <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm sm:ml-12" data-testid={`evidence-${item.id}`}>
          {seen.form === "file" && (
            <p>
              <span className="font-medium break-all">{seen.fileName}</span>
              <span className="text-muted-foreground tabular-nums">
                {" "}
                {fileKind(seen.fileType)}, {Math.round((seen.fileSize ?? 0) / 1024)} KB
              </span>
              <span className="block text-xs text-muted-foreground">Demo keeps only the file details, not its contents.</span>
            </p>
          )}
          {seen.form === "link" && seen.url && (
            <a href={seen.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 break-all">
              {seen.url}
              <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          )}
          {seen.form === "reference" && <p>{seen.reference}</p>}
        </div>
      )}
    </li>
  )
}

const fileKind = (type?: string) => (type === "application/pdf" ? "PDF" : type === "image/png" ? "PNG" : type === "image/jpeg" ? "JPG" : "File")

function ProfilePreview({ application }: { application: Application }) {
  const { basic, background, expertise } = application.data
  return (
    <details className="group rounded-2xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 focus-ring [&::-webkit-details-marker]:hidden">
        <h2 className="text-base font-semibold">Public profile preview</h2>
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="flex gap-4 border-t px-5 py-5">
        <MentorAvatar name={basic.fullName} className="size-12 text-sm" />
        <div className="min-w-0 space-y-2 text-sm">
          <div>
            <p className="font-semibold">{basic.fullName}</p>
            <p className="text-muted-foreground">
              {background.role}, {background.organization}
            </p>
          </div>
          <p>{expertise.bio}</p>
          <p className="flex flex-wrap gap-1.5">
            {expertise.skills
              .split(",")
              .map((skill) => skill.trim())
              .filter(Boolean)
              .map((skill) => (
                <Badge key={skill} tone="neutral">
                  {skill}
                </Badge>
              ))}
          </p>
        </div>
      </div>
    </details>
  )
}

function VerdictDot({ verdict }: { verdict: Verdict }) {
  return <span aria-hidden="true" className={cn("size-2 rounded-full", verdict === "verified" ? "bg-success" : verdict === "not-verified" ? "bg-destructive" : "bg-border")} />
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-0.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word sm:col-span-3">{children}</dd>
    </div>
  )
}
