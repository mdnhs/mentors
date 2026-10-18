"use client"

import { useState } from "react"
import { CheckIcon, Loader2Icon, LockIcon, PencilIcon } from "lucide-react"

import { EvidenceEditor } from "@/components/apply/evidence-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { startTimes, weekdays } from "@/lib/availability-settings"
import { categories, offerTypeLabels } from "@/lib/categories"
import { timezoneLabel } from "@/lib/format"
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
const zones = ["Asia/Dhaka", "Asia/Singapore", "Asia/Tokyo", "Europe/London", "Europe/Berlin", "America/New_York", "America/Toronto", "America/Los_Angeles", "Australia/Sydney"]
const languages: Language[] = ["Bangla", "English", "Japanese"]
const offerTypes: OfferType[] = ["one-on-one", "group", "review", "mentorship"]

type Props = { application: Application; principal: Principal; startAt?: Step | "review" }

export function ApplicationWizard({ application, principal, startAt }: Props) {
  const [index, setIndex] = useState(() => Math.max(order.indexOf(startAt ?? "basic"), 0))
  const [showErrors, setShowErrors] = useState(false)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const data = application.data
  const current = order[index]
  const errors: StepErrors = current === "review" ? {} : validateStep(current, data)
  const shown = showErrors ? errors : {}
  const requested = application.status === "info-required" ? application.infoRequest?.kinds : undefined

  const save = (next: ApplicationData) => {
    saveApplication(principal, application.id, next)
    setMessage(null)
  }
  const patch = <K extends keyof ApplicationData>(section: K, value: Partial<ApplicationData[K]>) => save({ ...data, [section]: { ...(data[section] as object), ...value } } as ApplicationData)
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])

  const go = (target: number) => {
    setIndex(target)
    setShowErrors(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const next = () => {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true)
      return
    }
    go(index + 1)
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setMessage(null)
    await new Promise((resolve) => setTimeout(resolve, 500))
    const result = submitApplication(principal, application.id)
    setSubmitting(false)
    if (!result.ok) {
      setMessage(result.message)
      const failing = steps.find((step) => result.errors?.[step])
      if (failing) {
        setShowErrors(true)
        setIndex(order.indexOf(failing))
      }
    }
  }

  return (
    <div className="surface p-5 shadow-card sm:p-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" aria-label="Application steps">
        {order.map((step, position) => (
          <li key={step} className="flex items-center gap-2">
            {position > 0 && <span className="h-px w-3 bg-border" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => go(position)}
              aria-current={position === index ? "step" : undefined}
              className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 focus-ring", position === index ? "font-medium" : "text-muted-foreground")}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-full text-xs", position < index ? "bg-success text-success-foreground" : position === index ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {position < index ? <CheckIcon className="size-3" aria-hidden="true" /> : position + 1}
              </span>
              <span className={cn(position !== index && "hidden sm:inline")}>{labels[step]}</span>
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs text-muted-foreground">Your answers are saved as a draft as you type.</p>

      {application.status === "info-required" && application.infoRequest && (
        <div role="note" className="mt-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          <p className="font-medium">A reviewer needs more information</p>
          <p>{application.infoRequest.message}</p>
        </div>
      )}

      <div className="mt-6">
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
                {[...new Set([data.basic.timezone, ...zones])].map((zone) => (
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
            <fieldset>
              <legend className="text-sm font-medium">
                Areas you can help with <span className="font-normal text-muted-foreground">(up to 3, public)</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((category) => {
                  const on = data.expertise.categories.includes(category.id)
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => patch("expertise", { categories: toggle(data.expertise.categories, category.id), track: category.track })}
                      className={cn("inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-sm focus-ring", on && "border-primary bg-accent/60 font-medium")}
                    >
                      <category.icon className="size-4" aria-hidden="true" />
                      {category.label}
                    </button>
                  )
                })}
              </div>
              {shown.categories && <p className="mt-1 text-sm text-destructive">{shown.categories}</p>}
            </fieldset>
            <Field id="ap-skills" label="Skills" tag="Public" hint="Separate with commas, up to 8." error={shown.skills}>
              <Input id="ap-skills" value={data.expertise.skills} onChange={(event) => patch("expertise", { skills: event.target.value })} />
            </Field>
            <Field id="ap-audience" label="Who do you help?" tag="Public" error={shown.audience}>
              <Input id="ap-audience" value={data.expertise.audience} onChange={(event) => patch("expertise", { audience: event.target.value })} />
            </Field>
            <fieldset>
              <legend className="text-sm font-medium">Languages you mentor in</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {languages.map((language) => (
                  <button key={language} type="button" aria-pressed={data.expertise.languages.includes(language)} onClick={() => patch("expertise", { languages: toggle(data.expertise.languages, language) })} className={cn("h-10 rounded-lg border bg-card px-3 text-sm focus-ring", data.expertise.languages.includes(language) && "border-primary bg-accent/60 font-medium")}>
                    {language}
                  </button>
                ))}
              </div>
              {shown.languages && <p className="mt-1 text-sm text-destructive">{shown.languages}</p>}
            </fieldset>
            <Field id="ap-bio" label="About you" tag="Public" hint="What learners read first. 40 to 600 characters." error={shown.bio}>
              <Textarea id="ap-bio" rows={4} value={data.expertise.bio} onChange={(event) => patch("expertise", { bio: event.target.value })} className="bg-card" />
            </Field>
          </Section>
        )}

        {current === "evidence" && (
          <Section title="Evidence of your experience" note="Reviewers use this to check your identity, education, employment and expertise. It is never shown on your profile.">
            <EvidenceEditor items={data.evidence} errors={shown} requested={requested} onChange={(evidence) => save({ ...data, evidence })} />
          </Section>
        )}

        {current === "offers" && (
          <Section title="Mentorship offers and availability" note="A starting point. You'll fine-tune offers in your workspace once approved.">
            <fieldset>
              <legend className="text-sm font-medium">What would you like to offer?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {offerTypes.map((type) => (
                  <label key={type} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-card p-3 text-sm has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                    <input type="checkbox" checked={data.offers.types.includes(type)} onChange={() => patch("offers", { types: toggle(data.offers.types, type) })} className="size-4 accent-primary" />
                    {offerTypeLabels[type]}
                  </label>
                ))}
              </div>
              {shown.types && <p className="mt-1 text-sm text-destructive">{shown.types}</p>}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="ap-price" label="Starting price (৳)" error={shown.startingPrice}>
                <Input id="ap-price" inputMode="numeric" value={data.offers.startingPrice} onChange={(event) => patch("offers", { startingPrice: event.target.value })} />
              </Field>
              <Field id="ap-duration" label="Typical call length (minutes)" error={shown.durationMinutes}>
                <Input id="ap-duration" inputMode="numeric" value={data.offers.durationMinutes} onChange={(event) => patch("offers", { durationMinutes: event.target.value })} />
              </Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Days you can mentor</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {weekdays.map((day, value) => (
                  <button key={day} type="button" aria-pressed={data.offers.days.includes(value)} onClick={() => patch("offers", { days: toggle(data.offers.days, value) })} className={cn("h-10 min-w-12 rounded-lg border bg-card px-3 text-sm focus-ring", data.offers.days.includes(value) && "border-primary bg-accent/60 font-medium")}>
                    {day}
                  </button>
                ))}
              </div>
              {shown.days && <p className="mt-1 text-sm text-destructive">{shown.days}</p>}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Start times (your timezone)</legend>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {startTimes.map((time) => (
                  <button key={time} type="button" aria-pressed={data.offers.times.includes(time)} onClick={() => patch("offers", { times: toggle(data.offers.times, time).sort() })} className={cn("h-10 rounded-lg border bg-card text-sm focus-ring", data.offers.times.includes(time) && "border-primary bg-accent/60 font-medium")}>
                    {time}
                  </button>
                ))}
              </div>
              {shown.times && <p className="mt-1 text-sm text-destructive">{shown.times}</p>}
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

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="lg" disabled={index === 0 || submitting} onClick={() => go(index - 1)}>
          Back
        </Button>
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
        <h2 className="text-subheading">{title}</h2>
        {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  )
}

function Field({ id, label, tag, hint, error, children }: { id: string; label: string; tag?: "Public" | "Private"; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {tag && <span className={cn("rounded px-1.5 py-0.5 text-xs font-normal", tag === "Public" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>{tag === "Public" ? "Shown on profile" : "Reviewers only"}</span>}
      </Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
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
      <h2 className="text-subheading">Review and submit</h2>
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
