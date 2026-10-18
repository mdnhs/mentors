import { canManageMentor, FORBIDDEN, type Actor } from "@/lib/permissions"
import type { CancellationPolicy, GroupSession, Mentor, Offer, OfferStatus, OfferType } from "@/lib/types"

export const MIN_PRICE = 50
export const MAX_PRICE = 100_000
export const MAX_CAPACITY = 500

// Mentors set what they charge; the platform fee and commission are applied by the server and have no field here.
export type OfferDraft = {
  type: OfferType
  title: string
  description: string
  price: string
  durationMinutes: string
  // One deliverable or inclusion per line.
  includes: string
  deliveryDays: string
  learnerProvides: string
  sessionsPerMonth: string
  openSpots: string
  capacity: string
  // Group sessions only: a `datetime-local` value in Dhaka time, and the language it's run in.
  startsAt: string
  language: string
}

export type DraftErrors = Partial<Record<keyof OfferDraft, string>>

export const creatableTypes: OfferType[] = ["one-on-one", "mentorship", "review", "group"]

export const defaultPolicy: Record<OfferType, CancellationPolicy> = {
  "one-on-one": "flexible",
  mentorship: "monthly",
  review: "review",
  group: "group",
}

export const draftsEqual = (a: OfferDraft, b: OfferDraft) => (Object.keys(a) as (keyof OfferDraft)[]).every((key) => a[key] === b[key])

export function emptyDraft(type: OfferType): OfferDraft {
  return {
    type,
    title: "",
    description: "",
    price: "",
    durationMinutes: type === "mentorship" ? "45" : "60",
    includes: "",
    deliveryDays: "5",
    learnerProvides: "",
    sessionsPerMonth: "2",
    openSpots: "3",
    capacity: "30",
    startsAt: "",
    language: "English",
  }
}

const whole = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null)
const lines = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean)

function inRange(value: string, min: number, max: number, label: string) {
  const parsed = whole(value)
  if (parsed === null) return `${label} must be a whole number`
  if (parsed < min || parsed > max) return `${label} must be between ${min} and ${max}`
  return undefined
}

export function validateCapacity(value: string, minimum = 1) {
  const parsed = whole(value)
  if (parsed === null) return "Seats must be a whole number"
  if (parsed < Math.max(minimum, 1)) return minimum > 1 ? `At least ${minimum} seats are already taken` : "Add at least one seat"
  if (parsed > MAX_CAPACITY) return `Seats can't exceed ${MAX_CAPACITY}`
  return undefined
}

const STARTS_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/
const dhakaInstant = (startsAt: string) => new Date(`${startsAt}:00+06:00`)

export function validateDraft(draft: OfferDraft, context: { minCapacity?: number; sessionFields?: boolean; now?: Date } = {}): DraftErrors {
  const errors: DraftErrors = {}
  const title = draft.title.trim()
  if (title.length < 3 || title.length > 80) errors.title = "Use 3 to 80 characters"
  const description = draft.description.trim()
  if (description.length < 10 || description.length > 280) errors.description = "Use 10 to 280 characters"

  const price = whole(draft.price)
  if (price === null) errors.price = "Enter the price in whole taka, like 1500"
  else if (price < MIN_PRICE || price > MAX_PRICE) errors.price = `Price must be between ৳${MIN_PRICE} and ৳${MAX_PRICE.toLocaleString("en-US")}`

  const items = lines(draft.includes)
  if (items.length === 0) errors.includes = draft.type === "review" ? "List at least one deliverable" : "List at least one thing that's included"
  else if (items.length > 6) errors.includes = "Keep it to 6 items"
  else if (items.some((item) => item.length > 100)) errors.includes = "Keep each item under 100 characters"

  if (draft.type !== "review") {
    const error = inRange(draft.durationMinutes, 15, 180, "Duration")
    if (error) errors.durationMinutes = error
  }
  if (draft.type === "review") {
    const error = inRange(draft.deliveryDays, 1, 14, "Delivery time")
    if (error) errors.deliveryDays = error
    const provides = draft.learnerProvides.trim()
    if (provides.length < 3 || provides.length > 120) errors.learnerProvides = "Say what the learner sends, in 3 to 120 characters"
  }
  if (draft.type === "mentorship") {
    const calls = inRange(draft.sessionsPerMonth, 1, 8, "Calls a month")
    if (calls) errors.sessionsPerMonth = calls
    const spots = inRange(draft.openSpots, 0, 20, "Open spots")
    if (spots) errors.openSpots = spots
  }
  if (draft.type === "group") {
    const error = validateCapacity(draft.capacity, context.minCapacity)
    if (error) errors.capacity = error
    if (context.sessionFields) {
      const starts = dhakaInstant(draft.startsAt)
      if (!STARTS_AT.test(draft.startsAt) || Number.isNaN(starts.getTime())) errors.startsAt = "Pick a date and start time"
      else if (context.now && starts <= context.now) errors.startsAt = "Pick a time in the future"
      const language = draft.language.trim()
      if (language.length < 2 || language.length > 40) errors.language = "Use 2 to 40 characters"
    }
  }
  return errors
}

export const isValid = (errors: DraftErrors) => Object.keys(errors).length === 0

const dhakaLocal = (iso: string) => new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 16)

// A mentor can reshape a session they created until someone holds a seat or it starts; catalog sessions are fixed.
export const sessionEditable = (created: boolean, session: GroupSession, heldSeats: number, now: Date | null) =>
  created && heldSeats === 0 && now !== null && new Date(session.startsAt) > now

export function offerToDraft(offer: Offer, capacity?: number, session?: GroupSession): OfferDraft {
  return {
    ...emptyDraft(offer.type),
    title: offer.title,
    description: offer.description,
    price: String(offer.price),
    includes: offer.includes.join("\n"),
    durationMinutes: "durationMinutes" in offer ? String(offer.durationMinutes) : "60",
    ...(offer.type === "review" && { deliveryDays: String(offer.deliveryDays), learnerProvides: offer.learnerProvides }),
    ...(offer.type === "mentorship" && { sessionsPerMonth: String(offer.sessionsPerMonth), openSpots: String(offer.openSpots) }),
    ...(offer.type === "group" && capacity !== undefined && { capacity: String(capacity) }),
    ...(offer.type === "group" && session && { startsAt: dhakaLocal(session.startsAt), language: session.language }),
  }
}

// Builds an offer only from known fields, so anything else a caller sends (a commission, say) is dropped.
export function draftToOffer(draft: OfferDraft, id: string, status: OfferStatus, existing?: Offer, sessionEditable = false): Offer {
  const base = {
    id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    // A catalog session's price comes with the session, so it can't be edited here.
    price: draft.type === "group" && existing && !sessionEditable ? existing.price : Number(draft.price.trim()),
    includes: lines(draft.includes),
    cancellation: existing?.cancellation ?? defaultPolicy[draft.type],
    status,
  }
  const duration = Number(draft.durationMinutes.trim())
  switch (draft.type) {
    case "one-on-one":
      return { ...base, type: "one-on-one", durationMinutes: duration }
    case "mentorship":
      return { ...base, type: "mentorship", durationMinutes: duration, sessionsPerMonth: Number(draft.sessionsPerMonth.trim()), openSpots: Number(draft.openSpots.trim()) }
    case "review":
      return { ...base, type: "review", deliveryDays: Number(draft.deliveryDays.trim()), learnerProvides: draft.learnerProvides.trim() }
    case "group": {
      if (existing?.type !== "group") return { ...base, type: "group", durationMinutes: duration, sessionId: id }
      return { ...base, type: "group", durationMinutes: sessionEditable ? duration : existing.durationMinutes, sessionId: existing.sessionId }
    }
  }
}

// A new group offer owns a session with the same id, so the offer and its seats are created together.
export function draftToSession(draft: OfferDraft, id: string, mentor: Pick<Mentor, "slug" | "categories" | "skills">): GroupSession {
  return {
    id,
    title: draft.title.trim(),
    mentorSlug: mentor.slug,
    category: mentor.categories[0],
    expertise: mentor.skills.slice(0, 3),
    format: "Live workshop",
    startsAt: `${draft.startsAt}:00+06:00`,
    timezone: "Asia/Dhaka",
    durationMinutes: Number(draft.durationMinutes.trim()),
    price: Number(draft.price.trim()),
    language: draft.language.trim(),
    summary: draft.description.trim(),
    agenda: lines(draft.includes),
    seats: { total: Number(draft.capacity.trim()), taken: 0 },
  }
}

export const applyDraftToSession = (session: GroupSession, draft: OfferDraft): GroupSession => ({
  ...session,
  title: draft.title.trim(),
  summary: draft.description.trim(),
  agenda: lines(draft.includes),
  startsAt: `${draft.startsAt}:00+06:00`,
  language: draft.language.trim(),
  durationMinutes: Number(draft.durationMinutes.trim()),
  price: Number(draft.price.trim()),
  seats: { ...session.seats, total: Number(draft.capacity.trim()) },
})

export const statusMoves: Record<OfferStatus, readonly OfferStatus[]> = {
  draft: ["published", "archived"],
  published: ["paused", "archived"],
  paused: ["published", "archived"],
  archived: ["draft"],
}

export const canMove = (from: OfferStatus, to: OfferStatus) => statusMoves[from].includes(to)

export const statusLabels: Record<OfferStatus, string> = { published: "Live", paused: "Paused", draft: "Draft", archived: "Archived" }

export type OfferChange =
  | { kind: "create"; draft: OfferDraft; id: string }
  | { kind: "update"; id: string; draft: OfferDraft }
  | { kind: "status"; id: string; status: OfferStatus }

export type OfferFailure = "forbidden" | "not-found" | "invalid" | "invalid-transition" | "duplicate"

export type OfferResult =
  | { ok: true; offers: Offer[]; offer: Offer }
  | { ok: false; code: OfferFailure; message: string; errors?: DraftErrors }

const refuse = (code: OfferFailure, message: string, errors?: DraftErrors): OfferResult => ({ ok: false, code, message, errors })

// Every change is checked against the signed-in mentor, so one mentor can never edit another's offers.
export function manageOffers(actor: Actor | null, mentorSlug: string, offers: Offer[], change: OfferChange, context: { minCapacity?: number; now?: Date; sessionEditable?: boolean } = {}): OfferResult {
  if (!canManageMentor(actor, mentorSlug)) return refuse("forbidden", FORBIDDEN)

  if (change.kind === "create") {
    if (!creatableTypes.includes(change.draft.type)) return refuse("invalid", "This offer type can't be created here.")
    if (offers.some((offer) => offer.id === change.id)) return refuse("duplicate", "An offer with this id already exists.")
    const errors = validateDraft(change.draft, { sessionFields: true, now: context.now })
    if (!isValid(errors)) return refuse("invalid", "Fix the highlighted fields.", errors)
    const offer = draftToOffer(change.draft, change.id, "draft")
    return { ok: true, offers: [...offers, offer], offer }
  }

  const existing = offers.find((offer) => offer.id === change.id)
  if (!existing) return refuse("not-found", "We couldn't find that offer.")

  if (change.kind === "update") {
    if (existing.status === "archived") return refuse("invalid-transition", "Restore an archived offer before editing it.")
    // The type can't change after creation, since each type has its own fields and booking rules.
    const draft = { ...change.draft, type: existing.type }
    const errors = validateDraft(draft, { ...context, sessionFields: context.sessionEditable })
    if (!isValid(errors)) return refuse("invalid", "Fix the highlighted fields.", errors)
    const offer = draftToOffer(draft, existing.id, existing.status, existing, context.sessionEditable)
    return { ok: true, offers: offers.map((item) => (item.id === offer.id ? offer : item)), offer }
  }

  if (!canMove(existing.status, change.status)) {
    return refuse("invalid-transition", `A ${statusLabels[existing.status].toLowerCase()} offer can't become ${statusLabels[change.status].toLowerCase()}.`)
  }
  if (change.status === "published") {
    const errors = validateDraft(offerToDraft(existing, context.minCapacity), context)
    delete errors.capacity
    if (!isValid(errors)) return refuse("invalid", "Finish the offer details before publishing.", errors)
  }
  const offer = { ...existing, status: change.status } as Offer
  return { ok: true, offers: offers.map((item) => (item.id === offer.id ? offer : item)), offer }
}
