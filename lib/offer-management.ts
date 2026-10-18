import { canManageMentor, FORBIDDEN, type Actor } from "@/lib/permissions"
import type { CancellationPolicy, Offer, OfferStatus, OfferType } from "@/lib/types"

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
}

export type DraftErrors = Partial<Record<keyof OfferDraft, string>>

export const creatableTypes: OfferType[] = ["one-on-one", "mentorship", "review"]

export const defaultPolicy: Record<OfferType, CancellationPolicy> = {
  "one-on-one": "flexible",
  mentorship: "monthly",
  review: "review",
  group: "group",
}

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

export function validateDraft(draft: OfferDraft, context: { minCapacity?: number } = {}): DraftErrors {
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
  }
  return errors
}

export const isValid = (errors: DraftErrors) => Object.keys(errors).length === 0

export function offerToDraft(offer: Offer, capacity?: number): OfferDraft {
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
  }
}

// Builds an offer only from known fields, so anything else a caller sends (a commission, say) is dropped.
export function draftToOffer(draft: OfferDraft, id: string, status: OfferStatus, existing?: Offer): Offer {
  const base = {
    id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    // A group seat's price comes with its scheduled session, so it can't be edited here.
    price: draft.type === "group" && existing ? existing.price : Number(draft.price.trim()),
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
      if (existing?.type !== "group") throw new Error("A group offer needs its scheduled session")
      return { ...base, type: "group", durationMinutes: existing.durationMinutes, sessionId: existing.sessionId }
    }
  }
}

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
export function manageOffers(actor: Actor | null, mentorSlug: string, offers: Offer[], change: OfferChange, context: { minCapacity?: number } = {}): OfferResult {
  if (!canManageMentor(actor, mentorSlug)) return refuse("forbidden", FORBIDDEN)

  if (change.kind === "create") {
    if (!creatableTypes.includes(change.draft.type)) return refuse("invalid", "This offer type can't be created here.")
    if (offers.some((offer) => offer.id === change.id)) return refuse("duplicate", "An offer with this id already exists.")
    const errors = validateDraft(change.draft)
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
    const errors = validateDraft(draft, context)
    if (!isValid(errors)) return refuse("invalid", "Fix the highlighted fields.", errors)
    const offer = draftToOffer(draft, existing.id, existing.status, existing)
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
