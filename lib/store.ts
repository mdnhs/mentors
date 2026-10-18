"use client"

import { useSyncExternalStore } from "react"

import { demoBookings, demoNotes, demoSavedMentors } from "@/lib/data/bookings"
import { demoApplications } from "@/lib/data/applications"
import { demoDisputes, demoTickets } from "@/lib/data/admin"
import { incomingBookings, incomingOrders } from "@/lib/data/incoming"
import {
  emptyAdminState,
  logAdminAction,
  setAccountStatus,
  setMentorStatus,
  setOfferStatus,
  setReviewStatus,
  updateDispute,
  updateTicket,
  type AdminAction,
  type AdminState,
} from "@/lib/admin"
import { createDraft, review, submit, updateDraft, viewEvidence, type Application, type ApplicationData, type ReviewAction } from "@/lib/mentor-application"
import { getMentor, getMentors, getReviewById, getSession } from "@/lib/data"
import { validateAvailability, type AvailabilityErrors } from "@/lib/availability-settings"
import { deliverReview } from "@/lib/booking-service"
import { manageOffers, validateCapacity, type OfferChange, type OfferResult } from "@/lib/offer-management"
import { requestPayout, settlePayout, type Payout, type PayoutResult } from "@/lib/mentor-finance"
import { canManageMentor, DEMO_MENTOR_SLUG, FORBIDDEN, isAdmin, ADMIN_FORBIDDEN, type Actor, type Principal } from "@/lib/permissions"
import type { Order } from "@/lib/orders"
import type { Commerce } from "@/lib/payment-service"
import { site } from "@/lib/site"
import type { ActionItem, Booking, BookingNotes, MentorAvailability, NotificationPrefs, Offer, Profile } from "@/lib/types"

type State = {
  saved: string[]
  notes: Record<string, BookingNotes>
  profile: Profile
  notifications: NotificationPrefs
  // Other learners' sample bookings with the demo mentor, kept apart from the signed-in learner's own.
  incoming: { bookings: Booking[]; orders: Order[] }
  payouts: Payout[]
  applications: Application[]
  // Administration: moderation overrides, refund disputes, support tickets and the audit trail.
  admin: AdminState
  // The demo mentor's edits; null means "as in the catalog".
  workspace: { offers: Offer[] | null; availability: MentorAvailability | null }
} & Commerce

const STORAGE_KEY = "mentorbridge:v1"
const defaultProfile: Profile = { name: site.learner.name, email: site.learner.email, timezone: "Asia/Dhaka" }
const defaultNotifications: NotificationPrefs = { reminders: true, bookingUpdates: true, mentorActivity: true, tips: false }

const initialState: State = {
  saved: demoSavedMentors,
  bookings: demoBookings,
  orders: [],
  cancelledSessions: {},
  sessionCapacity: {},
  incoming: { bookings: incomingBookings, orders: incomingOrders },
  payouts: [],
  applications: demoApplications,
  admin: { ...emptyAdminState, disputes: demoDisputes, tickets: demoTickets },
  workspace: { offers: null, availability: null },
  notes: demoNotes,
  profile: defaultProfile,
  notifications: defaultNotifications,
}

let state = initialState
let hydrated = false
const listeners = new Set<() => void>()

function loadFromStorage(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const stored = JSON.parse(raw)
    const bookings: Booking[] = Array.isArray(stored.bookings) ? stored.bookings : initialState.bookings
    const orders: Order[] = Array.isArray(stored.orders) ? stored.orders : []
    return {
      ...initialState,
      ...stored,
      orders,
      sessionCapacity: stored.sessionCapacity && typeof stored.sessionCapacity === "object" ? stored.sessionCapacity : {},
      incoming: stored.incoming?.bookings && stored.incoming?.orders ? stored.incoming : initialState.incoming,
      payouts: Array.isArray(stored.payouts) ? stored.payouts : [],
      applications: Array.isArray(stored.applications) ? stored.applications : initialState.applications,
      admin: {
        ...initialState.admin,
        ...(stored.admin && typeof stored.admin === "object" ? stored.admin : {}),
        audit: Array.isArray(stored.admin?.audit) ? stored.admin.audit : [],
        mentors: stored.admin?.mentors && typeof stored.admin.mentors === "object" ? stored.admin.mentors : {},
        offers: stored.admin?.offers && typeof stored.admin.offers === "object" ? stored.admin.offers : {},
        reviews: stored.admin?.reviews && typeof stored.admin.reviews === "object" ? stored.admin.reviews : {},
        accounts: stored.admin?.accounts && typeof stored.admin.accounts === "object" ? stored.admin.accounts : {},
        disputes: Array.isArray(stored.admin?.disputes) ? stored.admin.disputes : initialState.admin.disputes,
        tickets: Array.isArray(stored.admin?.tickets) ? stored.admin.tickets : initialState.admin.tickets,
      },
      workspace: { ...initialState.workspace, ...stored.workspace },
      notes: stored.notes && typeof stored.notes === "object" ? stored.notes : initialState.notes,
      profile: { ...defaultProfile, ...stored.profile },
      notifications: { ...defaultNotifications, ...stored.notifications },
      cancelledSessions: stored.cancelledSessions && typeof stored.cancelledSessions === "object" ? stored.cancelledSessions : {},
      bookings: bookings.map((booking) => ((booking.status as string) === "upcoming" ? { ...booking, status: "confirmed" } : booking)),
    }
  } catch {
    return initialState
  }
}

function readStorage() {
  if (hydrated) return
  hydrated = true
  state = loadFromStorage()
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return
    state = loadFromStorage()
    listeners.forEach((listener) => listener())
  })
}

function setState(next: State) {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  readStorage()
  return state
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState)
}

export function toggleSaved(slug: string) {
  const saved = state.saved.includes(slug)
    ? state.saved.filter((item) => item !== slug)
    : [...state.saved, slug]
  setState({ ...state, saved })
}

const randomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase()

function updateNotes(bookingId: string, change: (notes: BookingNotes) => BookingNotes) {
  const current = state.notes[bookingId] ?? { actions: [], personal: "" }
  setState({ ...state, notes: { ...state.notes, [bookingId]: change(current) } })
}

export const setPersonalNote = (bookingId: string, personal: string) => updateNotes(bookingId, (notes) => ({ ...notes, personal }))

export const toggleActionItem = (bookingId: string, itemId: string) =>
  updateNotes(bookingId, (notes) => ({ ...notes, actions: notes.actions.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item)) }))

export function addActionItem(bookingId: string, text: string) {
  const item: ActionItem = { id: `you-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, text: text.trim(), done: false, by: "you" }
  if (item.text) updateNotes(bookingId, (notes) => ({ ...notes, actions: [...notes.actions, item] }))
}

// Only the learner's own items can be removed; the mentor's plan stays as written.
export const removeActionItem = (bookingId: string, itemId: string) =>
  updateNotes(bookingId, (notes) => ({ ...notes, actions: notes.actions.filter((item) => item.id !== itemId || item.by === "mentor") }))

export function saveProfile(profile: Profile) {
  setState({ ...state, profile })
}

export function setNotification(key: keyof NotificationPrefs, value: boolean) {
  setState({ ...state, notifications: { ...state.notifications, [key]: value } })
}

// Drops the made-up records so a new learner's empty states can be seen; real activity stays.
// Returns an undo that puts back only what was removed, so changes made in between survive.
export function clearSampleData() {
  const before = state
  const bookings = state.bookings.filter((booking) => !booking.sample)
  const kept = new Set(bookings.map((booking) => booking.id))
  const notes = Object.fromEntries(Object.entries(state.notes).filter(([id, item]) => !item.sample && kept.has(id)))
  const applications = state.applications.filter((application) => !application.sample)
  setState({ ...state, bookings, notes, saved: [], incoming: { bookings: [], orders: [] }, applications })

  return function undo() {
    const has = <T extends { id: string }>(list: T[]) => new Set(list.map((item) => item.id))
    const bookingIds = has(state.bookings)
    const applicationIds = has(state.applications)
    const incomingBookingIds = has(state.incoming.bookings)
    const incomingOrderIds = has(state.incoming.orders)
    setState({
      ...state,
      bookings: [...state.bookings, ...before.bookings.filter((booking) => !kept.has(booking.id) && !bookingIds.has(booking.id))],
      notes: { ...Object.fromEntries(Object.entries(before.notes).filter(([id]) => !(id in notes))), ...state.notes },
      saved: [...new Set([...before.saved, ...state.saved])],
      incoming: {
        bookings: [...state.incoming.bookings, ...before.incoming.bookings.filter((booking) => !incomingBookingIds.has(booking.id))],
        orders: [...state.incoming.orders, ...before.incoming.orders.filter((order) => !incomingOrderIds.has(order.id))],
      },
      applications: [...state.applications, ...before.applications.filter((application) => application.sample && !applicationIds.has(application.id))],
    })
  }
}

export function resetDemoData() {
  setState(initialState)
}

export function createBookingId() {
  return `MB-${randomCode()}`
}

export function createOrderId() {
  return `ORD-${randomCode()}`
}

// Demo only: browser storage has no real transactions. The lock and the fresh read stop two tabs of the
// same browser from double-booking a slot, but separate browsers are not protected.
export async function transact<O>(change: (current: Commerce) => Commerce & { outcome: O }, scope: "learner" | "incoming" = "learner"): Promise<O> {
  const run = () => {
    readStorage()
    state = loadFromStorage()
    const source = scope === "incoming" ? state.incoming : state
    const otherBookings = scope === "incoming" ? state.bookings : state.incoming.bookings
    const result = change({ bookings: source.bookings, orders: source.orders, otherBookings, cancelledSessions: state.cancelledSessions, sessionCapacity: state.sessionCapacity })
    const changed = result.bookings !== source.bookings || result.orders !== source.orders || result.cancelledSessions !== state.cancelledSessions
    if (changed) {
      const shared = { cancelledSessions: result.cancelledSessions }
      if (scope === "incoming") setState({ ...state, ...shared, incoming: { bookings: result.bookings, orders: result.orders } })
      else setState({ ...state, ...shared, bookings: result.bookings, orders: result.orders })
    }
    return result.outcome
  }
  return navigator.locks ? navigator.locks.request("mentorbridge:bookings", run) : run()
}

export function addBooking(booking: Booking) {
  setState({ ...state, bookings: [booking, ...state.bookings] })
}

const SEARCH_KEY = "mentorbridge:mentor-search"

function readSearch() {
  try {
    return window.sessionStorage.getItem(SEARCH_KEY) ?? ""
  } catch {
    return ""
  }
}

export function rememberMentorSearch(query: string) {
  if (query === readSearch()) return
  try {
    window.sessionStorage.setItem(SEARCH_KEY, query)
  } catch {}
  listeners.forEach((listener) => listener())
}

export function useMentorsHref() {
  const query = useSyncExternalStore(subscribe, readSearch, () => "")
  return query ? `/mentors?${query}` : "/mentors"
}

const noop = () => () => {}

function subscribeClock(listener: () => void) {
  const id = setInterval(listener, 60_000)
  return () => clearInterval(id)
}

// Null while rendering on the server, so time-derived text can't mismatch during hydration.
export function useNow() {
  const ms = useSyncExternalStore(subscribeClock, () => Math.floor(Date.now() / 60_000) * 60_000, () => null)
  return ms === null ? null : new Date(ms)
}

export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false)
}

// Mentor workspace changes. Each one re-checks the actor, so the UI hiding a button is never the only guard.
const mentorOffers = () => state.workspace.offers ?? getMentor(DEMO_MENTOR_SLUG)!.offers

// A group offer's seat count is validated with the offer and both persist together, or neither does.
export function saveOffer(actor: Actor | null, change: OfferChange, capacity?: { sessionId: string; value: string }): OfferResult {
  readStorage()
  const offers = mentorOffers()
  const existing = "id" in change ? offers.find((offer) => offer.id === change.id) : undefined
  const session = existing?.type === "group" ? getSession(existing.sessionId) : undefined
  const result = manageOffers(actor, DEMO_MENTOR_SLUG, offers, change, { minCapacity: session?.seats.taken })
  if (!result.ok) return result
  const capacityError = capacity && groupCapacityError(capacity.sessionId, capacity.value)
  if (capacityError) return { ok: false, code: "invalid", message: capacityError, errors: { capacity: capacityError } }
  const sessionCapacity = capacity ? { ...state.sessionCapacity, [capacity.sessionId]: Number(capacity.value) } : state.sessionCapacity
  setState({ ...state, sessionCapacity, workspace: { ...state.workspace, offers: result.offers } })
  return result
}

function groupCapacityError(sessionId: string, value: string): string | undefined {
  const session = getSession(sessionId)
  if (!session || session.mentorSlug !== DEMO_MENTOR_SLUG) return "We couldn't find that session."
  const own = state.bookings.filter((booking) => booking.sessionId === sessionId && (booking.status === "confirmed" || booking.status === "pending")).length
  return validateCapacity(value, session.seats.taken + own)
}

export function deliverReviewAsMentor(actor: Actor | null, bookingId: string, scope: "learner" | "incoming") {
  return transact((current) => ({ ...current, ...deliverReview(current.bookings, bookingId, actor) }), scope)
}

export function saveAvailability(actor: Actor | null, availability: MentorAvailability): { ok: true } | { ok: false; errors: AvailabilityErrors; message?: string } {
  readStorage()
  if (!canManageMentor(actor, DEMO_MENTOR_SLUG)) return { ok: false, errors: {}, message: FORBIDDEN }
  const errors = validateAvailability(availability)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  setState({ ...state, workspace: { ...state.workspace, availability } })
  return { ok: true }
}

export function requestDemoPayout(actor: Actor | null, amount?: number): PayoutResult {
  readStorage()
  const orders = [...state.orders, ...state.incoming.orders]
  const bookings = [...state.bookings, ...state.incoming.bookings]
  const result = requestPayout(actor, DEMO_MENTOR_SLUG, { orders, bookings, payouts: state.payouts }, { id: `PO-${randomCode()}`, amount }, new Date())
  if (result.ok) setState({ ...state, payouts: result.payouts })
  return result
}

export function settleDemoPayout(actor: Actor | null, id: string): PayoutResult {
  readStorage()
  const result = settlePayout(actor, DEMO_MENTOR_SLUG, state.payouts, id, new Date())
  if (result.ok) setState({ ...state, payouts: result.payouts })
  return result
}

// The demo mentor as learners see them: catalog profile plus the workspace's offers and availability.
export function useManagedMentor(slug: string) {
  const { workspace } = useAppState()
  const mentor = getMentor(slug)
  if (!mentor || slug !== DEMO_MENTOR_SLUG) return mentor
  return { ...mentor, offers: workspace.offers ?? mentor.offers, availability: workspace.availability ?? mentor.availability }
}

// Mentor applications. The domain functions decide who may do what; these only persist an accepted result.
function persistApplications<R extends { ok: boolean }>(result: R & { applications?: Application[] }): R {
  if (result.ok && result.applications) setState({ ...state, applications: result.applications })
  return result
}

export function startApplication(principal: Principal | null) {
  readStorage()
  return persistApplications(createDraft(principal, state.applications, `APP-${randomCode()}`, new Date()))
}

export function saveApplication(principal: Principal | null, id: string, data: ApplicationData) {
  readStorage()
  return persistApplications(updateDraft(principal, state.applications, id, data, new Date()))
}

export function submitApplication(principal: Principal | null, id: string) {
  readStorage()
  return persistApplications(submit(principal, state.applications, id, new Date()))
}

export function reviewApplication(principal: Principal | null, id: string, action: ReviewAction) {
  readStorage()
  const result = persistApplications(review(principal, state.applications, id, action, new Date()))
  // An administrator's decision is a sensitive action, so it is mirrored into the admin audit trail.
  if (result.ok && isAdmin(principal)) {
    const audit = logAdminAction(principal, state.admin, "application-decision", id, action.kind, new Date())
    if (audit.ok) setState({ ...state, admin: audit.state })
  }
  return result
}

export function openEvidence(principal: Principal | null, id: string, evidenceId: string) {
  readStorage()
  return persistApplications(viewEvidence(principal, state.applications, id, evidenceId, new Date()))
}

// Administration. Every action re-checks the caller inside the domain module and appends a metadata-only
// audit event, so hiding a control is never the guard and each sensitive change is recorded.
function persistAdmin<R extends { ok: boolean }>(result: R & { state?: AdminState }): R {
  if (result.ok && result.state) setState({ ...state, admin: result.state })
  return result
}

function findOfferForAdmin(id: string) {
  return state.workspace.offers?.find((offer) => offer.id === id) ?? getMentors().flatMap((mentor) => mentor.offers).find((offer) => offer.id === id) ?? null
}

export function adminModerateMentor(principal: Principal | null, slug: string, status: "active" | "suspended", reason?: string) {
  readStorage()
  return persistAdmin(setMentorStatus(principal, state.admin, getMentor(slug) ?? null, { status, reason }, new Date()))
}

export function adminModerateOffer(principal: Principal | null, offerId: string, status: "live" | "paused", reason?: string) {
  readStorage()
  return persistAdmin(setOfferStatus(principal, state.admin, findOfferForAdmin(offerId), { status, reason }, new Date()))
}

export function adminModerateReview(principal: Principal | null, reviewId: string, status: "visible" | "hidden", reason?: string) {
  readStorage()
  return persistAdmin(setReviewStatus(principal, state.admin, getReviewById(reviewId) ?? null, { status, reason }, new Date()))
}

export function adminRestrictAccount(principal: Principal | null, email: string, status: "active" | "restricted", reason?: string) {
  readStorage()
  return persistAdmin(setAccountStatus(principal, state.admin, email, { status, reason }, new Date()))
}

export function adminUpdateDispute(principal: Principal | null, id: string, status: "open" | "investigating" | "refunded" | "declined", note?: string) {
  readStorage()
  const target = state.admin.disputes.find((dispute) => dispute.id === id) ?? null
  return persistAdmin(updateDispute(principal, state.admin, target, { status, note }, new Date()))
}

export function adminUpdateTicket(principal: Principal | null, id: string, status: "open" | "pending" | "closed") {
  readStorage()
  const target = state.admin.tickets.find((ticket) => ticket.id === id) ?? null
  return persistAdmin(updateTicket(principal, state.admin, target, { status }, new Date()))
}

// Marks a pending payout as paid. The demo holds no real transfer; this only records the state change.
export function adminSettlePayout(principal: Principal | null, id: string): { ok: true } | { ok: false; message: string } {
  readStorage()
  if (!isAdmin(principal)) return { ok: false, message: ADMIN_FORBIDDEN }
  const payout = state.payouts.find((item) => item.id === id)
  if (!payout) return { ok: false, message: "We couldn't find that payout." }
  if (payout.status !== "pending") return { ok: false, message: "This payout is already paid." }
  const paid: Payout = { ...payout, status: "paid", paidAt: new Date().toISOString() }
  const audit = logAdminAction(principal, state.admin, "payout-settled", id, payout.mentorSlug, new Date())
  setState({ ...state, payouts: state.payouts.map((item) => (item.id === id ? paid : item)), ...(audit.ok ? { admin: audit.state } : {}) })
  return { ok: true }
}

// Appends an audit line for an action whose state change lives in lib/admin-client.ts (bookings, refunds).
export function logAdmin(principal: Principal | null, action: AdminAction, target: string, detail?: string) {
  readStorage()
  const result = logAdminAction(principal, state.admin, action, target, detail, new Date())
  if (result.ok) setState({ ...state, admin: result.state })
  return result
}
