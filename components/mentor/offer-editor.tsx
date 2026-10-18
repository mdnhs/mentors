"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { cloneElement, useState, type ReactElement } from "react"
import { Radio } from "@base-ui/react/radio"
import { RadioGroup } from "@base-ui/react/radio-group"
import { CalendarOffIcon, CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { OfferPreviewCard } from "@/components/mentor/offer-preview"
import { GuardedLink, UnsavedIndicator, useUnsavedGuard } from "@/components/mentor/unsaved-guard"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { offerIcons } from "@/components/mentors/offer-meta"
import { EmptyState } from "@/components/site/empty-state"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageBreadcrumbs } from "@/components/ui/page-breadcrumbs"
import { Textarea } from "@/components/ui/textarea"
import { offerTypeLabels } from "@/lib/categories"
import { getSession } from "@/lib/data"
import { creatableTypes, draftsEqual, draftToOffer, emptyDraft, isValid, offerToDraft, statusLabels, validateDraft, type DraftErrors, type OfferDraft } from "@/lib/offer-management"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { saveGroupCapacity, saveOffer } from "@/lib/store"
import type { Offer, OfferType } from "@/lib/types"

const typeBlurbs: Record<OfferType, string> = {
  "one-on-one": "A video call at a time the learner picks.",
  mentorship: "Ongoing monthly calls with a small number of mentees.",
  review: "Written feedback on a CV, SOP or project, delivered by a date.",
  group: "A scheduled live session with a seat limit.",
}

// DOM order, so submitting focuses the first invalid field a reader would reach.
const fieldIds: [keyof OfferDraft, string][] = [
  ["title", "offer-title"],
  ["description", "offer-description"],
  ["price", "offer-price"],
  ["durationMinutes", "offer-duration"],
  ["sessionsPerMonth", "offer-calls"],
  ["openSpots", "offer-spots"],
  ["capacity", "offer-capacity"],
  ["deliveryDays", "offer-delivery"],
  ["learnerProvides", "offer-provides"],
  ["includes", "offer-includes"],
]

const focusFirstInvalid = (errors: DraftErrors) => {
  for (const [field, id] of fieldIds) {
    const element = errors[field] ? document.getElementById(id) : null
    if (element && !(element as HTMLInputElement).disabled) {
      element.focus()
      return
    }
  }
}

const newId = () => `${DEMO_MENTOR_SLUG}-${Math.random().toString(36).slice(2, 8)}`

export function OfferEditor({ id }: { id: string }) {
  const { mentor, state } = useMentorWorkspace()
  const existing = id === "new" ? undefined : mentor.offers.find((offer) => offer.id === id)

  if (id !== "new" && !existing) {
    return (
      <EmptyState icon={CalendarOffIcon} headingAs="h1" title="We couldn't find that offer" description="It may belong to another account or no longer exist." className="mt-6">
        <Link href="/dashboard/mentor/offers" className={buttonVariants()}>
          Back to offers
        </Link>
      </EmptyState>
    )
  }
  if (existing?.status === "archived") {
    return (
      <EmptyState icon={CalendarOffIcon} headingAs="h1" title="This offer is archived" description="Restore it from the offers list before editing." className="mt-6">
        <Link href="/dashboard/mentor/offers" className={buttonVariants()}>
          Back to offers
        </Link>
      </EmptyState>
    )
  }

  const capacity = existing?.type === "group" ? (state.sessionCapacity[existing.sessionId] ?? getSession(existing.sessionId)?.seats.total) : undefined
  return <Form key={existing?.id ?? "new"} existing={existing} capacity={capacity} />
}


function Form({ existing, capacity }: { existing?: Offer; capacity?: number }) {
  const router = useRouter()
  const { actor, mentor, state } = useMentorWorkspace()
  const [draft, setDraft] = useState<OfferDraft>(() => (existing ? offerToDraft(existing, capacity) : emptyDraft("one-on-one")))
  const [saved, setSaved] = useState<OfferDraft | null>(() => (existing ? offerToDraft(existing, capacity) : null))
  const [chosen, setChosen] = useState(Boolean(existing))
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof OfferDraft, boolean>>>({})
  const [serverErrors, setServerErrors] = useState<DraftErrors>({})
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const session = existing?.type === "group" ? getSession(existing.sessionId) : undefined
  const ownSeats = session ? state.bookings.filter((booking) => booking.sessionId === session.id && (booking.status === "confirmed" || booking.status === "pending")).length : 0
  const minCapacity = session ? session.seats.taken + ownSeats : undefined
  const errors = { ...validateDraft(draft, { minCapacity }), ...serverErrors }
  const show = (field: keyof OfferDraft) => (submitted || touched[field] ? errors[field] : undefined)
  // Errors appear once a field is edited or the form is submitted, never on blur: a message appearing
  // under a field on blur shifts the buttons below it and can swallow the click that caused the blur.
  const set = (field: keyof OfferDraft, value: string) => {
    setTouched((current) => ({ ...current, [field]: true }))
    setDraft((current) => ({ ...current, [field]: value }))
    setServerErrors({})
    setMessage(null)
  }

  const dirty = chosen && !draftsEqual(draft, saved ?? emptyDraft(draft.type))
  useUnsavedGuard(dirty)

  const preview = draftToPreview(draft, existing)
  const isGroup = draft.type === "group"
  const isReview = draft.type === "review"

  const save = (publish: boolean) => {
    setSubmitted(true)
    const invalid = validateDraft(draft, { minCapacity })
    if (!isValid(invalid)) {
      setMessage({ tone: "error", text: "Fix the highlighted fields to continue." })
      focusFirstInvalid(invalid)
      return
    }
    if (existing?.type === "group" && existing.sessionId) {
      const capacityError = saveGroupCapacity(actor, existing.sessionId, draft.capacity)
      if (capacityError) {
        setServerErrors({ capacity: capacityError })
        setMessage({ tone: "error", text: capacityError })
        focusFirstInvalid({ capacity: capacityError })
        return
      }
    }
    const id = existing?.id ?? newId()
    const result = saveOffer(actor, existing ? { kind: "update", id, draft } : { kind: "create", id, draft })
    if (!result.ok) {
      setServerErrors(result.errors ?? {})
      setMessage({ tone: "error", text: result.message })
      focusFirstInvalid(result.errors ?? {})
      return
    }
    setSaved(draft)
    if (publish && result.offer.status !== "published") {
      const published = saveOffer(actor, { kind: "status", id, status: "published" })
      if (!published.ok) {
        setMessage({ tone: "error", text: published.message })
        router.replace(`/dashboard/mentor/offers/${id}`)
        return
      }
    }
    const text = publish ? "Saved and live on your profile." : "Saved."
    // Creating swaps the route to the new offer's id, which remounts this form, so confirm with a toast too.
    if (!existing) {
      toast.success(text)
      router.replace(`/dashboard/mentor/offers/${id}`)
    }
    setMessage({ tone: "ok", text })
  }

  const crumbs = (
    <PageBreadcrumbs
      link={GuardedLink}
      items={[{ label: "Offers", href: "/dashboard/mentor/offers" }, { label: existing ? existing.title : "New offer" }]}
    />
  )

  if (!chosen) {
    return (
      <div className="mt-6">
        {crumbs}
        <h1 id="offer-type-heading" className="mt-4 text-heading">
          What kind of offer?
        </h1>
        <RadioGroup
          aria-labelledby="offer-type-heading"
          value={draft.type}
          onValueChange={(value: OfferType) => setDraft(emptyDraft(value))}
          className="mt-4 grid gap-2 sm:grid-cols-3"
        >
          {creatableTypes.map((type) => {
            const Icon = offerIcons[type]
            return (
              <Radio.Root
                key={type}
                value={type}
                className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition hover:border-foreground/20 focus-ring data-checked:border-primary data-checked:bg-accent/60"
              >
                <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{offerTypeLabels[type]}</span>
                <span className="text-sm text-muted-foreground">{typeBlurbs[type]}</span>
              </Radio.Root>
            )
          })}
        </RadioGroup>
        <p className="mt-3 text-xs text-muted-foreground">Live group sessions are scheduled separately, so they appear in your offers once created.</p>
        <Button size="lg" className="mt-6" onClick={() => setChosen(true)}>
          Continue
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {crumbs}
      <div className="mt-4 grid gap-8 lg:grid-cols-5">
        <form
          noValidate
          className="space-y-5 lg:col-span-3"
          onSubmit={(event) => {
            event.preventDefault()
            save(false)
          }}
        >
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-heading">{existing ? "Edit offer" : `New ${offerTypeLabels[draft.type].toLowerCase()}`}</h1>
              <UnsavedIndicator dirty={dirty} />
            </div>
            <p className="text-sm text-muted-foreground">
              {offerTypeLabels[draft.type]}
              {existing && ` · ${statusLabels[existing.status]}`}
            </p>
          </div>

          <Field id="offer-title" label="Title" error={show("title")}>
            <Input id="offer-title" value={draft.title} maxLength={80} onChange={(event) => set("title", event.target.value)} />
          </Field>

          <Field id="offer-description" label="Short description" error={show("description")}>
            <Textarea id="offer-description" rows={3} value={draft.description} maxLength={280} onChange={(event) => set("description", event.target.value)} className="bg-card" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="offer-price" label={isGroup ? "Price per seat (৳)" : draft.type === "mentorship" ? "Price per month (৳)" : "Price (৳)"} error={show("price")} hint={isGroup ? "Set by the scheduled session." : "What you earn is this price minus the platform commission."}>
              <Input id="offer-price" inputMode="numeric" value={draft.price} disabled={isGroup} onChange={(event) => set("price", event.target.value)} />
            </Field>
            {!isReview && (
              <Field id="offer-duration" label="Duration (minutes)" error={show("durationMinutes")}>
                <Input id="offer-duration" inputMode="numeric" value={draft.durationMinutes} disabled={isGroup} onChange={(event) => set("durationMinutes", event.target.value)} />
              </Field>
            )}
          </div>

          {draft.type === "mentorship" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="offer-calls" label="Calls a month" error={show("sessionsPerMonth")}>
                <Input id="offer-calls" inputMode="numeric" value={draft.sessionsPerMonth} onChange={(event) => set("sessionsPerMonth", event.target.value)} />
              </Field>
              <Field id="offer-spots" label="Open mentee spots" error={show("openSpots")}>
                <Input id="offer-spots" inputMode="numeric" value={draft.openSpots} onChange={(event) => set("openSpots", event.target.value)} />
              </Field>
            </div>
          )}

          {isGroup && (
            <Field id="offer-capacity" label="Seat capacity" error={show("capacity")} hint={minCapacity ? `At least ${minCapacity} seats are already taken.` : undefined}>
              <Input id="offer-capacity" inputMode="numeric" value={draft.capacity} onChange={(event) => set("capacity", event.target.value)} className="sm:w-40" />
            </Field>
          )}

          {isReview && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="offer-delivery" label="Delivered within (days)" error={show("deliveryDays")}>
                <Input id="offer-delivery" inputMode="numeric" value={draft.deliveryDays} onChange={(event) => set("deliveryDays", event.target.value)} />
              </Field>
              <Field id="offer-provides" label="What the learner sends" error={show("learnerProvides")}>
                <Input id="offer-provides" value={draft.learnerProvides} placeholder="e.g. Your CV as a PDF" onChange={(event) => set("learnerProvides", event.target.value)} />
              </Field>
            </div>
          )}

          <Field id="offer-includes" label={isReview ? "Deliverables (one per line)" : "What's included (one per line)"} error={show("includes")}>
            <Textarea id="offer-includes" rows={4} value={draft.includes} onChange={(event) => set("includes", event.target.value)} placeholder={isReview ? "Line-by-line comments\nA one-page summary of fixes" : "Review of your goals\nWritten action list"} className="bg-card" />
          </Field>

          {message && (
            <Alert variant={message.tone === "error" ? "destructive" : "success"} role={message.tone === "error" ? "alert" : "status"}>
              {message.tone === "error" ? <CircleAlertIcon aria-hidden="true" /> : <CircleCheckIcon aria-hidden="true" />}
              <AlertDescription className="text-current">{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" variant={existing?.status === "published" ? "default" : "outline"}>
              {existing ? "Save changes" : "Save draft"}
            </Button>
            {existing?.status !== "published" && (
              <Button type="button" size="lg" onClick={() => save(true)}>
                {existing?.status === "paused" ? "Save and resume" : "Save and publish"}
              </Button>
            )}
          </div>
        </form>

        <aside className="lg:col-span-2">
          <div className="lg:sticky lg:top-24">
            <OfferPreviewCard mentor={mentor} offer={preview} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }> }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

// Builds what the learner would see from a half-finished draft, falling back to the saved offer for group seats.
function draftToPreview(draft: OfferDraft, existing?: Offer): Offer {
  if (draft.type === "group" && existing?.type === "group") return draftToOffer(draft, existing.id, existing.status, existing)
  const base = draft.type === "group" ? "one-on-one" : draft.type
  return draftToOffer({ ...draft, type: base }, existing?.id ?? "preview", existing?.status ?? "draft", existing)
}
