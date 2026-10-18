import { ADMIN_FORBIDDEN, isAdmin, type Principal } from "@/lib/permissions"
import type { Mentor } from "@/lib/types"

// Administration domain. Every function here re-checks that the caller is an administrator and records a
// metadata-only audit event, so the UI hiding a button is never the guard and every sensitive change leaves
// a trail. Nothing stored here holds document contents, payment secrets or card data.

export type AdminAction =
  | "mentor-suspended"
  | "mentor-restored"
  | "offer-paused"
  | "offer-restored"
  | "review-hidden"
  | "review-restored"
  | "account-restricted"
  | "account-restored"
  | "booking-cancelled"
  | "refund-completed"
  | "payout-settled"
  | "dispute-updated"
  | "ticket-updated"
  | "application-decision"

// One line of the administrative audit trail. `detail` is metadata such as a reason or a status change,
// never the contents of a document or anything from a payment provider.
export type AdminAuditEvent = {
  id: string
  at: string
  actor: string
  action: AdminAction
  target: string
  detail?: string
}

export type ModerationStatus = "active" | "suspended"
export type OfferModerationStatus = "live" | "paused"
export type ReviewModerationStatus = "visible" | "hidden"
export type AccountStatus = "active" | "restricted"

export type MentorModeration = { status: ModerationStatus; reason?: string; at: string; by: string }
export type OfferModeration = { status: OfferModerationStatus; reason?: string; at: string; by: string }
export type ReviewModeration = { status: ReviewModerationStatus; reason?: string; at: string; by: string }
export type AccountRestriction = { status: AccountStatus; reason?: string; at: string; by: string }

export type DisputeStatus = "open" | "investigating" | "refunded" | "declined"
export type Dispute = {
  id: string
  orderId: string
  mentorSlug: string
  learnerEmail: string
  amount: number
  currency: string
  reason: string
  status: DisputeStatus
  openedAt: string
  resolvedAt?: string
  note?: string
  // Made-up dispute for the demo; it is not a real complaint and controls nothing.
  sample?: true
}

export type SupportTicketStatus = "open" | "pending" | "closed"
export type SupportTicket = {
  id: string
  email: string
  subject: string
  status: SupportTicketStatus
  priority: "low" | "normal" | "high"
  updatedAt: string
  // Made-up ticket for the demo.
  sample?: true
}

export type AdminState = {
  audit: AdminAuditEvent[]
  mentors: Record<string, MentorModeration>
  offers: Record<string, OfferModeration>
  reviews: Record<string, ReviewModeration>
  accounts: Record<string, AccountRestriction>
  disputes: Dispute[]
  tickets: SupportTicket[]
}

export const emptyAdminState: AdminState = { audit: [], mentors: {}, offers: {}, reviews: {}, accounts: {}, disputes: [], tickets: [] }

export type AdminFailure = "forbidden" | "not-found" | "invalid" | "invalid-transition" | "duplicate"

export type AdminResult<T = object> = ({ ok: true; state: AdminState } & T) | { ok: false; code: AdminFailure; message: string }

const refuse = (code: AdminFailure, message: string): { ok: false; code: AdminFailure; message: string } => ({ ok: false, code, message })

const REASON_MIN = 8
const REASON_MAX = 300

function cleanReason(value: string | undefined): string | undefined {
  const text = (value ?? "").trim()
  return text.length === 0 ? undefined : text
}

function reasonError(reason: string | undefined): string | null {
  if (!reason) return `Add a short reason (${REASON_MIN}–${REASON_MAX} characters).`
  if (reason.length < REASON_MIN || reason.length > REASON_MAX) return `Keep the reason between ${REASON_MIN} and ${REASON_MAX} characters.`
  return null
}

export function event(state: AdminState, principal: Principal, action: AdminAction, target: string, detail: string | undefined, now: Date): AdminAuditEvent {
  return { id: `ADM-${state.audit.length + 1}`, at: now.toISOString(), actor: principal.email, action, target, ...(detail ? { detail } : {}) }
}

const withEvent = (state: AdminState, entry: AdminAuditEvent, patch: Partial<AdminState>): AdminState => ({ ...state, ...patch, audit: [entry, ...state.audit] })

// Records an audit line for an action whose state change lives in another module (bookings, refunds, payouts).
export function logAdminAction(principal: Principal | null, state: AdminState, action: AdminAction, target: string, detail: string | undefined, now: Date): AdminResult {
  if (!isAdmin(principal)) return refuse("forbidden", ADMIN_FORBIDDEN)
  return { ok: true, state: withEvent(state, event(state, principal, action, target, cleanReason(detail), now), {}) }
}

export function setMentorStatus(principal: Principal | null, state: AdminState, target: Mentor | null, input: { status: ModerationStatus; reason?: string }, now: Date): AdminResult {
  if (!isAdmin(principal)) return refuse("forbidden", ADMIN_FORBIDDEN)
  if (!target) return refuse("not-found", "We couldn't find that mentor.")
  const reason = cleanReason(input.reason)
  if (input.status === "suspended") {
    const problem = reasonError(reason)
    if (problem) return refuse("invalid", problem)
  }
  const entry = event(state, principal, input.status === "suspended" ? "mentor-suspended" : "mentor-restored", target.slug, reason, now)
  return { ok: true, state: withEvent(state, entry, { mentors: { ...state.mentors, [target.slug]: { status: input.status, reason, at: now.toISOString(), by: principal.email } } }) }
}

export function setOfferStatus(principal: Principal | null, state: AdminState, target: { id: string } | null, input: { status: OfferModerationStatus; reason?: string }, now: Date): AdminResult {
  if (!isAdmin(principal)) return refuse("forbidden", ADMIN_FORBIDDEN)
  if (!target) return refuse("not-found", "We couldn't find that offer.")
  const reason = cleanReason(input.reason)
  if (input.status === "paused") {
    const problem = reasonError(reason)
    if (problem) return refuse("invalid", problem)
  }
  const entry = event(state, principal, input.status === "paused" ? "offer-paused" : "offer-restored", target.id, reason, now)
  return { ok: true, state: withEvent(state, entry, { offers: { ...state.offers, [target.id]: { status: input.status, reason, at: now.toISOString(), by: principal.email } } }) }
}

export function setReviewStatus(principal: Principal | null, state: AdminState, target: { id: string } | null, input: { status: ReviewModerationStatus; reason?: string }, now: Date): AdminResult {
  if (!isAdmin(principal)) return refuse("forbidden", ADMIN_FORBIDDEN)
  if (!target) return refuse("not-found", "We couldn't find that review.")
  const reason = cleanReason(input.reason)
  if (input.status === "hidden") {
    const problem = reasonError(reason)
    if (problem) return refuse("invalid", problem)
  }
  const entry = event(state, principal, input.status === "hidden" ? "review-hidden" : "review-restored", target.id, reason, now)
  return { ok: true, state: withEvent(state, entry, { reviews: { ...state.reviews, [target.id]: { status: input.status, reason, at: now.toISOString(), by: principal.email } } }) }
}

export function setAccountStatus(principal: Principal | null, state: AdminState, email: string | null, input: { status: AccountStatus; reason?: string }, now: Date): AdminResult {
  if (!isAdmin(principal)) return refuse("forbidden", ADMIN_FORBIDDEN)
  if (!email) return refuse("not-found", "We couldn't find that account.")
  const reason = cleanReason(input.reason)
  if (input.status === "restricted") {
    const problem = reasonError(reason)
    if (problem) return refuse("invalid", problem)
  }
  const entry = event(state, principal, input.status === "restricted" ? "account-restricted" : "account-restored", email, reason, now)
  return { ok: true, state: withEvent(state, entry, { accounts: { ...state.accounts, [email]: { status: input.status, reason, at: now.toISOString(), by: principal.email } } }) }
}

export const disputeMoves: Record<DisputeStatus, readonly DisputeStatus[]> = {
  open: ["investigating", "refunded", "declined"],
  investigating: ["refunded", "declined"],
  refunded: [],
  declined: [],
}

export const disputeStatusLabels: Record<DisputeStatus, string> = {
  open: "Open",
  investigating: "Investigating",
  refunded: "Refunded",
  declined: "Declined",
}

export function updateDispute(principal: Principal | null, state: AdminState, target: Dispute | null, input: { status: DisputeStatus; note?: string }, now: Date): AdminResult<{ dispute: Dispute }> {
  if (!isAdmin(principal)) return refuse("forbidden", ADMIN_FORBIDDEN)
  if (!target) return refuse("not-found", "We couldn't find that dispute.")
  if (!disputeMoves[target.status].includes(input.status)) return refuse("invalid-transition", `A ${target.status} dispute can't become ${input.status}.`)
  const note = cleanReason(input.note)
  if (input.status === "refunded" || input.status === "declined") {
    const problem = reasonError(note)
    if (problem) return refuse("invalid", problem)
  }
  const terminal = input.status === "refunded" || input.status === "declined"
  const dispute: Dispute = { ...target, status: input.status, note, ...(terminal ? { resolvedAt: now.toISOString() } : {}) }
  const entry = event(state, principal, "dispute-updated", target.id, `${target.status} → ${input.status}${note ? ` · ${note}` : ""}`, now)
  return { ok: true, state: withEvent(state, entry, { disputes: state.disputes.map((item) => (item.id === target.id ? dispute : item)) }), dispute }
}

export function updateTicket(principal: Principal | null, state: AdminState, target: SupportTicket | null, input: { status: SupportTicketStatus }, now: Date): AdminResult<{ ticket: SupportTicket }> {
  if (!isAdmin(principal)) return refuse("forbidden", ADMIN_FORBIDDEN)
  if (!target) return refuse("not-found", "We couldn't find that ticket.")
  const ticket: SupportTicket = { ...target, status: input.status, updatedAt: now.toISOString() }
  const entry = event(state, principal, "ticket-updated", target.id, `${target.status} → ${input.status}`, now)
  return { ok: true, state: withEvent(state, entry, { tickets: state.tickets.map((item) => (item.id === target.id ? ticket : item)) }), ticket }
}

// Which moderation state applies to an entity, defaulting to the untouched value.
export const mentorStatusOf = (state: AdminState, slug: string): ModerationStatus => state.mentors[slug]?.status ?? "active"
export const offerStatusOf = (state: AdminState, offerId: string): OfferModerationStatus => state.offers[offerId]?.status ?? "live"
export const reviewStatusOf = (state: AdminState, reviewId: string): ReviewModerationStatus => state.reviews[reviewId]?.status ?? "visible"
export const accountStatusOf = (state: AdminState, email: string): AccountStatus => state.accounts[email]?.status ?? "active"

export const suspendedMentorSlugs = (state: AdminState) => new Set(Object.entries(state.mentors).filter(([, value]) => value.status === "suspended").map(([slug]) => slug))
