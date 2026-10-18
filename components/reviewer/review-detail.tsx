"use client"

import { useState } from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { CircleAlertIcon, CircleCheckIcon, ExternalLinkIcon, EyeIcon, FileTextIcon } from "lucide-react"

import { SamplePill } from "@/components/dashboard/booking-row"
import { ApplicationStatusBadge } from "@/components/reviewer/status-badge"
import { ConfirmAction } from "@/components/site/confirm-action"
import { EmptyState } from "@/components/site/empty-state"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PageBreadcrumbs, type Crumb } from "@/components/ui/page-breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { usePrincipal } from "@/lib/auth"
import { categories, offerTypeLabels } from "@/lib/categories"
import { formatDate, formatTime } from "@/lib/format"
import { approvalBlocker, visibleTo, type Application, type EvidenceItem, type Verdict, type Verdicts } from "@/lib/mentor-application"
import { openEvidence, reviewApplication, useAppState } from "@/lib/store"
import { checkCopy, checkKinds, type CheckKind } from "@/lib/verification"

const verdictLabels: Record<Verdict, string> = { verified: "Verified", "not-verified": "Could not verify", unchecked: "Not checked yet" }

export function ReviewDetail({ id, crumbs }: { id: string; crumbs: Crumb[] }) {
  const { applications } = useAppState()
  const principal = usePrincipal()
  // visibleTo already leaves out drafts and the reviewer's own application.
  const application = principal ? visibleTo(principal, applications).find((item) => item.id === id) : undefined

  return (
    <>
      <PageBreadcrumbs items={[...crumbs, { label: application?.data.basic.fullName ?? "Application" }]} />
      {!principal ? (
        <Skeleton className="mt-6 h-64 rounded-2xl" />
      ) : application ? (
        <Detail application={application} />
      ) : (
        <EmptyState icon={FileTextIcon} headingAs="h1" title="We couldn't find that application" description="It may not be submitted yet, or it may be your own." className="mt-6" />
      )}
    </>
  )
}

const modes = [
  ["approve", "Approve"],
  ["request-info", "Ask for info"],
  ["reject", "Not approve"],
] as const

function Detail({ application }: { application: Application }) {
  const principal = usePrincipal()
  const { data } = application
  const [opened, setOpened] = useState<Record<string, EvidenceItem>>({})
  const [verdicts, setVerdicts] = useState<Verdicts>(application.verdicts)
  const [mode, setMode] = useState<"approve" | "request-info" | "reject">("approve")
  const [shared, setShared] = useState("")
  const [internal, setInternal] = useState("")
  const [kinds, setKinds] = useState<CheckKind[]>([])
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const reviewing = application.status === "under-review"
  const dirty = checkKinds.some((kind) => verdicts[kind] !== application.verdicts[kind])
  const blocker = approvalBlocker(application.verdicts)

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
    <div className="mt-5 grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <header>
          <h1 className="text-title">{data.basic.fullName}</h1>
          <p className="mt-1 text-muted-foreground">
            {data.background.role}, {data.background.organization}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <ApplicationStatusBadge status={application.status} />
            {application.sample && <SamplePill />}
          </p>
        </header>

        <Card title="Applicant" id="applicant">
          <Row label="Email">{application.applicantEmail}</Row>
          <Row label="Location">
            {data.basic.city}, {data.basic.country} · {data.basic.timezone}
          </Row>
          <Row label="Background">{data.background.path}</Row>
          <Row label="Experience">
            {data.background.years} years · {data.background.education}
          </Row>
          {data.background.profileUrl && (
            <Row label="Profile link">
              <a href={data.background.profileUrl} target="_blank" rel="noopener noreferrer" className="link">
                {data.background.profileUrl}
              </a>
            </Row>
          )}
        </Card>

        <Card title="Expertise and audience" id="expertise-card">
          <Row label="Areas">{data.expertise.categories.map((categoryId) => categories.find((category) => category.id === categoryId)?.label).join(", ")}</Row>
          <Row label="Skills">{data.expertise.skills}</Row>
          <Row label="Helps">{data.expertise.audience}</Row>
          <Row label="Languages">{data.expertise.languages.join(", ")}</Row>
          <Row label="Profile text">{data.expertise.bio}</Row>
          <Row label="Plans to offer">
            {data.offers.types.map((type) => offerTypeLabels[type]).join(", ")} from ৳{data.offers.startingPrice}
          </Row>
        </Card>

        <Card title="Evidence" id="evidence-card">
          <p className="mb-3 text-xs text-muted-foreground">Opening an item is recorded in the audit trail. Contents are never stored in the log.</p>
          <ul className="divide-y rounded-xl border">
            {data.evidence.map((item) => {
              const seen = opened[item.id]
              return (
                <li key={item.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{checkCopy[item.kind].label}</span>
                    <span className="min-w-0 flex-1 font-medium">{item.label}</span>
                    <span className="text-muted-foreground">{item.form === "file" ? "File" : item.form === "link" ? "Link" : "Reference"}</span>
                    <Button variant="outline" size="sm" onClick={() => open(item)}>
                      <EyeIcon aria-hidden="true" />
                      {seen ? "Opened" : "Open"}
                      <span className="sr-only"> {item.label}</span>
                    </Button>
                  </div>
                  {seen && (
                    <div className="mt-3 rounded-lg bg-muted/60 p-3" data-testid={`evidence-${item.id}`}>
                      {seen.form === "file" && (
                        <p>
                          {seen.fileName} · {seen.fileType} · {Math.round((seen.fileSize ?? 0) / 1024)} KB
                          <span className="block text-xs text-muted-foreground">This demo keeps only the file&apos;s details, not its contents.</span>
                        </p>
                      )}
                      {seen.form === "link" && seen.url && (
                        <a href={seen.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                          {seen.url}
                          <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                      {seen.form === "reference" && <p>{seen.reference}</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title="Audit trail" id="audit-card">
          <ol className="divide-y rounded-xl border text-sm" aria-label="Audit trail">
            {application.audit.map((entry) => (
              <li key={entry.id} className="grid gap-x-3 p-3 sm:grid-cols-[8rem_1fr_auto]">
                <span className="font-medium">{entry.action.replace(/-/g, " ")}</span>
                <span className="text-muted-foreground">
                  {entry.actor === "applicant" ? "Applicant" : "Reviewer"} · {entry.actorRef}
                  {entry.from && entry.to && ` · ${entry.from} → ${entry.to}`}
                  {entry.detail && ` · ${entry.detail}`}
                </span>
                <time dateTime={entry.at} className="text-muted-foreground">
                  {formatDate(entry.at)}, {formatTime(entry.at)}
                </time>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        {application.status === "submitted" && (
          <div className="surface p-4 sm:p-5">
            <h2 className="text-subheading">Review</h2>
            <p className="mt-1 text-sm text-muted-foreground">Take this application to start recording checks and a decision.</p>
            <Button className="mt-4 w-full" onClick={() => act({ kind: "start" }, "You're now reviewing this application.")}>
              Start review
            </Button>
          </div>
        )}

        <div className="surface p-4 sm:p-5">
          <h2 className="text-subheading">Checks</h2>
          <p className="mt-1 text-xs text-muted-foreground">Each check is recorded separately and appears on the profile only if verified.</p>
          <ul className="mt-3 space-y-3">
            {checkKinds.map((kind) => (
              <li key={kind}>
                <Label htmlFor={`check-${kind}`} className="text-sm font-medium">
                  {checkCopy[kind].label}
                </Label>
                <select
                  id={`check-${kind}`}
                  value={verdicts[kind]}
                  disabled={!reviewing}
                  onChange={(event) => { setVerdicts({ ...verdicts, [kind]: event.target.value as Verdict }); setFeedback(null) }}
                  className="mt-1 h-10 w-full rounded-lg border bg-card px-3 text-sm focus-ring disabled:opacity-70"
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
            <Button variant="outline" className="mt-4 w-full" disabled={!dirty} onClick={() => act({ kind: "record-checks", verdicts }, "Check results saved.")}>
              Save check results
            </Button>
          )}
        </div>

        {reviewing && (
          <div className="surface space-y-4 p-4 sm:p-5">
            <h2 className="text-subheading">Decision</h2>
            <RadioGroup
              aria-label="Decision"
              value={mode}
              onValueChange={(value: (typeof modes)[number][0]) => {
                setMode(value)
                setFeedback(null)
              }}
              className="grid grid-cols-3 gap-1.5 text-sm"
            >
              {modes.map(([value, label]) => (
                <Radio.Root key={value} value={value} className="flex cursor-pointer items-center justify-center rounded-lg border bg-card px-2 py-2 text-center focus-ring data-checked:border-primary data-checked:bg-accent/60 data-checked:font-medium">
                  {label}
                </Radio.Root>
              ))}
            </RadioGroup>

            {mode === "request-info" && (
              <fieldset>
                <legend className="text-sm font-medium">What is needed?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {checkKinds.map((kind) => (
                    <label key={kind} className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-sm has-checked:border-primary has-checked:bg-accent/60">
                      <input type="checkbox" checked={kinds.includes(kind)} onChange={() => setKinds(kinds.includes(kind) ? kinds.filter((item) => item !== kind) : [...kinds, kind])} className="size-4 accent-primary" />
                      {checkCopy[kind].label}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="decision-message">{mode === "approve" ? "Message to the applicant (optional)" : mode === "request-info" ? "What should they add?" : "Reason shown to the applicant"}</Label>
              <Textarea id="decision-message" rows={3} maxLength={500} value={shared} onChange={(event) => { setShared(event.target.value); setFeedback(null) }} className="bg-card" />
            </div>
            {mode !== "request-info" && (
              <div className="grid gap-1.5">
                <Label htmlFor="decision-internal">Internal note (reviewers only)</Label>
                <Textarea id="decision-internal" rows={2} maxLength={500} value={internal} onChange={(event) => setInternal(event.target.value)} className="bg-card" />
                <p className="text-xs text-muted-foreground">Don&apos;t paste document contents or ID numbers here.</p>
              </div>
            )}

            {mode === "approve" && blocker && <p className="text-sm text-warning">{blocker}</p>}
            {dirty && <p className="text-sm text-warning">Save the check results first.</p>}

            {mode === "approve" && (
              <Button className="w-full" disabled={dirty || Boolean(blocker)} onClick={() => act({ kind: "approve", message: shared, internalNote: internal }, "Application approved.")}>
                Approve application
              </Button>
            )}
            {mode === "request-info" && (
              <Button className="w-full" disabled={dirty} onClick={() => act({ kind: "request-info", message: shared, kinds }, "Information requested.")}>
                Send request
              </Button>
            )}
            {mode === "reject" &&
              // Without a reason the domain refuses the decision, so show that error before asking to confirm.
              (shared.trim() === "" ? (
                <Button variant="destructive" className="w-full" disabled={dirty} onClick={() => act({ kind: "reject", message: shared, internalNote: internal }, "Application not approved.")}>
                  Not approve
                </Button>
              ) : (
                <ConfirmAction
                  trigger={
                    <Button variant="destructive" className="w-full" disabled={dirty}>
                      Not approve
                    </Button>
                  }
                  title={`Not approve ${data.basic.fullName}?`}
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
          </div>
        )}

        {application.decision && (
          <div className="surface p-4 sm:p-5">
            <h2 className="text-subheading">{application.decision.outcome === "approved" ? "Approved" : "Not approved"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {application.decision.reviewer} · {formatDate(application.decision.at)}
            </p>
            {application.decision.message && <p className="mt-3 text-sm">{application.decision.message}</p>}
            {application.decision.internalNote && <p className="mt-3 rounded-lg bg-muted/60 p-2 text-sm text-muted-foreground">Internal: {application.decision.internalNote}</p>}
          </div>
        )}

        {feedback && (
          <Alert variant={feedback.tone === "error" ? "destructive" : "success"} role={feedback.tone === "error" ? "alert" : "status"}>
            {feedback.tone === "error" ? <CircleAlertIcon aria-hidden="true" /> : <CircleCheckIcon aria-hidden="true" />}
            <AlertDescription className="text-current">{feedback.text}</AlertDescription>
          </Alert>
        )}
      </aside>
    </div>
  )
}

function Card({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="surface p-4 sm:p-5">
      <h2 id={id} className="text-subheading">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 py-1.5 text-sm sm:grid-cols-[8rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word">{children}</dd>
    </div>
  )
}
