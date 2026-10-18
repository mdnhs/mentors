"use client"

import { cloneElement, useEffect, useEffectEvent, useRef, useState, type ReactElement } from "react"
import { CheckIcon, Loader2Icon, LockIcon, PencilIcon } from "lucide-react"

import { EvidenceEditor } from "@/components/apply/evidence-editor"
import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { startTimes, weekdays } from "@/lib/availability-settings"
import { categories, offerTypeLabels } from "@/lib/categories"
import { timezoneLabel } from "@/lib/format"
import { zonePickerOptions } from "@/lib/timezones-list"
import { steps, validateAll, validateStep, type Application, type ApplicationData, type Step, type StepErrors } from "@/lib/mentor-application"
import type { Principal } from "@/lib/permissions"
import { saveApplication, submitApplication } from "@/lib/store"
import type { Language, OfferType } from "@/lib/types"
import { checkCopy } from "@/lib/verification"
import { cn } from "@/lib/utils"

const labels: Record<Step | "review", string> = {
  basic: "Basics",
  background: "Background",
  expertise: "Expertise",
  evidence: "Evidence",
  offers: "Offers",
  review: "Review",
}
const order = [...steps, "review"] as const
const languages: Language[] = ["Bangla", "English", "Japanese"]
const offerTypes: OfferType[] = ["one-on-one", "group", "review", "mentorship"]

const MAX_CATEGORIES = 3
const MAX_SKILLS = 8
const SAVE_DELAY_MS = 400
const savedTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })

type Props = { application: Application; principal: Principal; startAt?: Step | "review" }
type SaveStatus = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date }

const stepValid = (step: Step | "review", data: ApplicationData) => step === "review" || Object.keys(validateStep(step, data)).length === 0

export function ApplicationWizard({ application, principal, startAt }: Props) {
  const [index, setIndex] = useState(() => Math.max(order.indexOf(startAt ?? "basic"), 0))
  const [furthest, setFurthest] = useState(index)
  const [showErrors, setShowErrors] = useState(false)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Edits live here first and reach the store after a pause, so typing doesn't rewrite storage on every key.
  const [data, setData] = useState(application.data)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle" })
  const [focusRequest, setFocusRequest] = useState<{ target: "heading" | "error"; id: number } | null>(null)
  const latest = useRef(data)
  const persisted = useRef(application.data)
  const stepRef = useRef<HTMLDivElement>(null)
  const current = order[index]
  const errors: StepErrors = current === "review" ? {} : validateStep(current, data)
  const shown = showErrors ? errors : {}
  const requested = application.status === "info-required" ? application.infoRequest?.kinds : undefined
  const skillCount = data.expertise.skills.split(",").map((item) => item.trim()).filter(Boolean).length
  const categoriesFull = data.expertise.categories.length >= MAX_CATEGORIES

  const flush = () => {
    if (latest.current === persisted.current) return true
    const result = saveApplication(principal, application.id, latest.current)
    persisted.current = latest.current
    if (!result.ok) {
      setMessage(result.message)
      setSaveStatus({ kind: "idle" })
      return false
    }
    setSaveStatus({ kind: "saved", at: new Date() })
    return true
  }
  const flushFromEffect = useEffectEvent(() => {
    flush()
  })

  useEffect(() => {
    latest.current = data
    if (data === persisted.current) return
    const timer = setTimeout(flushFromEffect, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [data])

  useEffect(() => {
    window.addEventListener("pagehide", flushFromEffect)
    return () => {
      window.removeEventListener("pagehide", flushFromEffect)
      flushFromEffect()
    }
  }, [])

  useEffect(() => {
    if (!focusRequest) return
    const root = stepRef.current
    if (!root) return
    const target =
      focusRequest.target === "error"
        ? root.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid] button:not(:disabled), [data-invalid] input, [data-focus-error]')
        : root.querySelector<HTMLElement>("h2")
    target?.focus()
  }, [focusRequest])

  const requestFocus = (target: "heading" | "error") => setFocusRequest((previous) => ({ target, id: (previous?.id ?? 0) + 1 }))
  const update = (change: (current: ApplicationData) => ApplicationData) => {
    setData(change)
    setSaveStatus({ kind: "saving" })
    setMessage(null)
  }
  const patch = <K extends keyof ApplicationData>(section: K, value: Partial<ApplicationData[K]>) => update((current) => ({ ...current, [section]: { ...(current[section] as object), ...value } }) as ApplicationData)
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  // Back is always open; forward only when every step before the target validates, so the stepper can't skip checks.
  const reachable = (target: number) => target <= index || order.slice(0, target).every((step) => stepValid(step, data))

  const go = (target: number) => {
    flush()
    setIndex(target)
    setFurthest((value) => Math.max(value, target))
    setShowErrors(false)
    requestFocus("heading")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const next = () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      requestFocus("error")
      return
    }
    go(index + 1)
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    if (!flush()) {
      setSubmitting(false)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
    const result = submitApplication(principal, application.id)
    setSubmitting(false)
    if (!result.ok) {
      setMessage(result.message)
      const failing = steps.find((step) => result.errors?.[step])
      if (failing) {
        setShowErrors(true)
        setIndex(order.indexOf(failing))
        requestFocus("error")
      }
    }
  }

  return (
    <div className="surface p-5 shadow-card sm:p-6">
      <p className="text-sm font-medium text-muted-foreground">
        Step {index + 1} of {order.length}
      </p>
      <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Application steps">
        {order.map((step, position) => {
          const done = position !== index && position <= furthest && step !== "review" && stepValid(step, data)
          const open = reachable(position)
          return (
            <li key={step} className="flex items-center gap-2">
              {position > 0 && <span className="h-px w-3 bg-border" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => go(position)}
                disabled={!open}
                aria-current={position === index ? "step" : undefined}
                className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 focus-ring disabled:cursor-not-allowed disabled:opacity-50", position === index ? "font-medium" : "text-muted-foreground")}
              >
                <span className={cn("flex size-5 items-center justify-center rounded-full text-xs", done ? "bg-success text-success-foreground" : position === index ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {done ? <CheckIcon className="size-3" aria-hidden="true" /> : position + 1}
                </span>
                <span className={cn(position !== index && "sr-only sm:not-sr-only")}>{labels[step]}</span>
                {done && <span className="sr-only">{" (complete)"}</span>}
              </button>
            </li>
          )
        })}
      </ol>

      <p aria-live="polite" className="mt-3 text-xs text-muted-foreground">
        {saveStatus.kind === "saving" ? "Saving draft…" : saveStatus.kind === "saved" ? `Draft saved · ${savedTime.format(saveStatus.at)}` : "Your answers are saved as a draft as you type."}
      </p>

      {application.status === "info-required" && application.infoRequest && (
        <div role="note" className="mt-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          <p className="font-medium">A reviewer needs more information</p>
          <p>{application.infoRequest.message}</p>
        </div>
      )}

      <div ref={stepRef} className="mt-6">
        {current === "basic" && (
          <Section title="Basic information" note="We only ask for what we need to verify you. No date of birth, home address or phone number.">
            <Field id="ap-name" label="Full name" tag="Public" error={shown.fullName}>
              <Input id="ap-name" autoComplete="name" value={data.basic.fullName} onChange={(event) => patch("basic", { fullName: event.target.value })} />
            </Field>
            <Field id="ap-email" label="Email" tag="Private" hint="From your account. Used to contact you, never shown publicly.">
              <Input id="ap-email" value={principal.email} readOnly disabled />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ap-city" label="City" tag="Public" error={shown.city}>
                <Input id="ap-city" value={data.basic.city} onChange={(event) => patch("basic", { city: event.target.value })} />
              </Field>
              <Field id="ap-country" label="Country" tag="Public" error={shown.country}>
                <Input id="ap-country" value={data.basic.country} onChange={(event) => patch("basic", { country: event.target.value })} />
              </Field>
            </div>
            <Field id="ap-timezone" label="Timezone" error={shown.timezone}>
              <select id="ap-timezone" value={data.basic.timezone} onChange={(event) => patch("basic", { timezone: event.target.value })} className="h-10 rounded-lg border bg-card px-3 text-sm focus-ring">
                {zonePickerOptions([data.basic.timezone]).map((zone) => (
                  <option key={zone} value={zone}>
                    {timezoneLabel(zone, new Date("2026-01-01T00:00:00Z"))}
                  </option>
                ))}
              </select>
            </Field>
          </Section>
        )}

        {current === "background" && (
          <Section title="Professional or academic background">
            <fieldset>
              <legend className="text-sm font-medium">Your background is mainly</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["professional", "academic", "both"] as const).map((value) => (
                  <label key={value} className="flex cursor-pointer items-center justify-center rounded-xl border bg-card p-2.5 text-sm capitalize has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                    <input type="radio" name="path" value={value} checked={data.background.path === value} onChange={() => patch("background", { path: value })} className="sr-only" />
                    {value}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ap-role" label={data.background.path === "academic" ? "Position or program" : "Current or latest role"} tag="Public" error={shown.role}>
                <Input id="ap-role" value={data.background.role} onChange={(event) => patch("background", { role: event.target.value })} />
              </Field>
              <Field id="ap-org" label="Where" tag="Public" hint="Describe it generally if you prefer, like “payments company”." error={shown.organization}>
                <Input id="ap-org" value={data.background.organization} onChange={(event) => patch("background", { organization: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ap-years" label="Years of experience" tag="Public" error={shown.years}>
                <Input id="ap-years" inputMode="numeric" value={data.background.years} onChange={(event) => patch("background", { years: event.target.value })} />
              </Field>
              <Field id="ap-education" label="Highest degree and institution" tag="Public" error={shown.education}>
                <Input id="ap-education" value={data.background.education} onChange={(event) => patch("background", { education: event.target.value })} />
              </Field>
            </div>
            <Field id="ap-profile" label="LinkedIn or portfolio (optional)" tag="Private" hint="Only reviewers see this link." error={shown.profileUrl}>
              <Input id="ap-profile" type="url" inputMode="url" placeholder="https://" value={data.background.profileUrl} onChange={(event) => patch("background", { profileUrl: event.target.value })} />
            </Field>
          </Section>
        )}

        {current === "expertise" && (
          <Section title="Expertise and audience">
            <fieldset {...groupProps("categories", shown.categories, "ap-categories-count")}>
              <legend className="text-sm font-medium">
                Areas you can help with <span className="font-normal text-muted-foreground">(up to {MAX_CATEGORIES}, public)</span>
              </legend>
              <p id="ap-categories-count" aria-live="polite" className="mt-1 text-xs text-muted-foreground">
                {data.expertise.categories.length}/{MAX_CATEGORIES} selected{categoriesFull && ". Deselect one to choose another."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((category) => {
                  const on = data.expertise.categories.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={on}
                      disabled={!on && categoriesFull}
                      onClick={() => patch("expertise", { categories: toggle(data.expertise.categories, category.id), track: category.track })}
                      className={cn("inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm focus-ring disabled:cursor-not-allowed disabled:opacity-50", on && "border-primary bg-accent/60 font-medium")}
                    >
                      <category.icon className="size-4" aria-hidden="true" />
                      {category.label}
                    </button>
                  )
                })}
              </div>
              <GroupError name="categories" error={shown.categories} />
            </fieldset>
            <Field id="ap-skills" label="Skills" tag="Public" hint={`Separate with commas, up to ${MAX_SKILLS}.`} error={shown.skills}>
              <Input id="ap-skills" value={data.expertise.skills} onChange={(event) => patch("expertise", { skills: event.target.value })} />
            </Field>
            <p aria-live="polite" className={cn("-mt-2 text-xs", skillCount > MAX_SKILLS ? "font-medium text-destructive" : "text-muted-foreground")}>
              {skillCount}/{MAX_SKILLS} skills{skillCount > MAX_SKILLS && ` — remove ${skillCount - MAX_SKILLS} to continue`}
            </p>
            <Field id="ap-audience" label="Who do you help?" tag="Public" error={shown.audience}>
              <Input id="ap-audience" value={data.expertise.audience} onChange={(event) => patch("expertise", { audience: event.target.value })} />
            </Field>
            <fieldset {...groupProps("languages", shown.languages)}>
              <legend className="text-sm font-medium">Languages you mentor in</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {languages.map((language) => (
                  <button key={language} type="button" aria-pressed={data.expertise.languages.includes(language)} onClick={() => patch("expertise", { languages: toggle(data.expertise.languages, language) })} className={cn("h-10 rounded-lg border bg-card px-3 text-sm focus-ring", data.expertise.languages.includes(language) && "border-primary bg-accent/60 font-medium")}>
                    {language}
                  </button>
                ))}
              </div>
              <GroupError name="languages" error={shown.languages} />
            </fieldset>
            <Field id="ap-bio" label="About you" tag="Public" hint="What learners read first. 40 to 600 characters." error={shown.bio}>
              <Textarea id="ap-bio" rows={4} value={data.expertise.bio} onChange={(event) => patch("expertise", { bio: event.target.value })} className="bg-card" />
            </Field>
          </Section>
        )}

        {current === "evidence" && (
          <Section title="Evidence of your experience" note="Reviewers use this to check your identity, education, employment and expertise. It is never shown on your profile.">
            <EvidenceEditor items={data.evidence} errors={shown} requested={requested} onChange={(change) => update((current) => ({ ...current, evidence: change(current.evidence) }))} />
          </Section>
        )}

        {current === "offers" && (
          <Section title="Mentorship offers and availability" note="A starting point. You'll fine-tune offers in your workspace once approved.">
            <fieldset {...groupProps("types", shown.types)}>
              <legend className="text-sm font-medium">What would you like to offer?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {offerTypes.map((type) => (
                  <label key={type} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                    <input type="checkbox" checked={data.offers.types.includes(type)} onChange={() => patch("offers", { types: toggle(data.offers.types, type) })} className="size-4 accent-primary" />
                    {offerTypeLabels[type]}
                  </label>
                ))}
              </div>
              <GroupError name="types" error={shown.types} />
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ap-price" label="Starting price (৳)" error={shown.startingPrice}>
                <Input id="ap-price" inputMode="numeric" value={data.offers.startingPrice} onChange={(event) => patch("offers", { startingPrice: event.target.value })} />
              </Field>
              <Field id="ap-duration" label="Typical call length (minutes)" error={shown.durationMinutes}>
                <Input id="ap-duration" inputMode="numeric" value={data.offers.durationMinutes} onChange={(event) => patch("offers", { durationMinutes: event.target.value })} />
              </Field>
            </div>
            <fieldset {...groupProps("days", shown.days)}>
              <legend className="text-sm font-medium">Days you can mentor</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map((day, value) => (
                  <button key={day} type="button" aria-pressed={data.offers.days.includes(value)} onClick={() => patch("offers", { days: toggle(data.offers.days, value) })} className={cn("h-10 min-w-12 rounded-lg border bg-card px-3 text-sm focus-ring", data.offers.days.includes(value) && "border-primary bg-accent/60 font-medium")}>
                    {day}
                  </button>
                ))}
              </div>
              <GroupError name="days" error={shown.days} />
            </fieldset>
            <fieldset {...groupProps("times", shown.times)}>
              <legend className="text-sm font-medium">Start times (your timezone)</legend>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {startTimes.map((time) => (
                  <button key={time} type="button" aria-pressed={data.offers.times.includes(time)} onClick={() => patch("offers", { times: toggle(data.offers.times, time).sort() })} className={cn("h-10 rounded-lg border bg-card text-sm focus-ring", data.offers.times.includes(time) && "border-primary bg-accent/60 font-medium")}>
                    {time}
                  </button>
                ))}
              </div>
              <GroupError name="times" error={shown.times} />
            </fieldset>
          </Section>
        )}

        {current === "review" && <ReviewStep data={data} go={(step) => go(order.indexOf(step))} consent={consent} onConsent={setConsent} />}
      </div>

      {message && (
        <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          {message}
        </p>
      )}
      <p role="alert" className="mt-4 text-sm font-medium text-destructive empty:hidden">
        {showErrors && Object.keys(errors).length > 0 ? "Some answers on this step need attention. Fix the highlighted fields to continue." : null}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {index > 0 && (
            <Button type="button" variant="ghost" size="lg" disabled={submitting} onClick={() => go(index - 1)}>
              Back
            </Button>
          )}
          <Link href="/dashboard" onClick={() => flush()} className={buttonVariants({ variant: "link", size: "lg" })}>
            Save &amp; finish later
          </Link>
        </div>
        {current === "review" ? (
          <Button type="button" size="lg" disabled={!consent || submitting} onClick={submit}>
            {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            {submitting ? "Submitting…" : application.status === "info-required" ? "Resubmit application" : "Submit application"}
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={next}>
            Continue
          </Button>
        )}
      </div>
    </div>
  )
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4">
      <div>
        <h2 tabIndex={-1} className="text-subheading outline-none">
          {title}
        </h2>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ id, label, tag, hint, error, children }: { id: string; label: string; tag?: "Public" | "Private"; hint?: string; error?: string; children: ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }> }) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {tag && <span className={cn("rounded px-1.5 py-0.5 text-xs font-normal", tag === "Public" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>{tag === "Public" ? "Shown on profile" : "Reviewers only"}</span>}
      </Label>
      {cloneElement(children, { "aria-invalid": error ? true : undefined, "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined })}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

// Links a chip group's error to its fieldset, and marks it so a failed Continue can focus its first control.
function groupProps(name: string, error: string | undefined, describedBy?: string) {
  const ids = [error && `ap-${name}-error`, describedBy].filter(Boolean).join(" ")
  return { "aria-describedby": ids || undefined, "data-invalid": error ? true : undefined }
}

function GroupError({ name, error }: { name: string; error?: string }) {
  if (!error) return null
  return (
    <p id={`ap-${name}-error`} className="mt-1 text-sm text-destructive">
      {error}
    </p>
  )
}

function ReviewStep({ data, go, consent, onConsent }: { data: ApplicationData; go: (step: Step) => void; consent: boolean; onConsent: (value: boolean) => void }) {
  const problems = validateAll(data)
  const rows: { step: Step; title: string; lines: string[] }[] = [
    { step: "basic", title: "Basics", lines: [data.basic.fullName, `${data.basic.city}, ${data.basic.country}`] },
    { step: "background", title: "Background", lines: [`${data.background.role}, ${data.background.organization}`, `${data.background.years} years · ${data.background.education}`] },
    { step: "expertise", title: "Expertise", lines: [data.expertise.categories.map((id) => categories.find((category) => category.id === id)?.label).join(", "), data.expertise.skills, data.expertise.audience] },
    { step: "evidence", title: "Evidence", lines: data.evidence.map((item) => `${checkCopy[item.kind].label}: ${item.label}`) },
    { step: "offers", title: "Offers", lines: [data.offers.types.map((type) => offerTypeLabels[type]).join(", "), `From ৳${data.offers.startingPrice}`] },
  ]

  return (
    <div className="grid gap-4">
      <h2 tabIndex={-1} className="text-subheading outline-none">
        Review and submit
      </h2>
      <dl className="divide-y rounded-xl border">
        {rows.map((row) => (
          <div key={row.step} className="flex items-start justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <dt className="font-medium">
                {row.title}
                {problems[row.step] && <span className="ml-2 text-xs font-normal text-destructive">Needs attention</span>}
              </dt>
              {row.lines.filter(Boolean).map((line) => (
                <dd key={line} className="wrap-break-word text-muted-foreground">
                  {line}
                </dd>
              ))}
            </div>
            <button type="button" aria-label={`Change ${row.title.toLowerCase()}`} onClick={() => go(row.step)} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-ring">
              <PencilIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </dl>
      <p className="flex gap-2 text-sm text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Your documents, email and links are seen only by reviewers. Your profile shows only the fields marked “Shown on profile”, and only after approval.
      </p>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(event) => onConsent(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
        <span>I confirm this is accurate, and I agree to MentorBridge checking my identity and credentials.</span>
      </label>
    </div>
  )
}
