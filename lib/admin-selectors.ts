import { DHAKA_TZ } from "@/lib/format"
import { dateKeyInZone } from "@/lib/timezone"
import { accountStatusOf, mentorStatusOf, offerStatusOf, reviewStatusOf, type AccountRestriction, type AdminAuditEvent, type AdminState, type OfferModerationStatus, type ReviewModerationStatus, type ModerationStatus } from "@/lib/admin"
import { getAllReviews, getMentor, getMentors } from "@/lib/data"
import { summarize, type FinanceSummary, type Payout } from "@/lib/mentor-finance"
import type { Application } from "@/lib/mentor-application"
import { cancelDecision, policyFor } from "@/lib/booking-policy"
import { cancellationTerms } from "@/lib/offers"
import { isUnpaid, type Order, type Transaction } from "@/lib/orders"
import { refundAmount } from "@/lib/pricing"
import type { Booking, BookingStatus, CancellationPolicy, Mentor, Offer, OfferType, Profile, Review } from "@/lib/types"

// Pure selectors that flatten the store plus the static catalogue into the rows each admin module shows.
// They read the same records the rest of the app does and apply the moderation overlays on top.

export type AdminSource = {
  bookings: Booking[]
  orders: Order[]
  incoming: { bookings: Booking[]; orders: Order[] }
  payouts: Payout[]
  applications: Application[]
  admin: AdminState
  profile: Profile
  workspace: { offers: Offer[] | null }
}

const allOrders = (source: AdminSource) => [...source.orders, ...source.incoming.orders]
const allBookings = (source: AdminSource) => [...source.bookings, ...source.incoming.bookings]

export type AdminBookingRow = { id: string; booking: Booking; order?: Order; scope: "account" | "other"; learner: string }

export function adminBookingRows(source: AdminSource): AdminBookingRow[] {
  const own = source.bookings.map((booking) => ({
    id: booking.id,
    booking,
    order: source.orders.find((order) => order.bookingId === booking.id),
    scope: "account" as const,
    learner: booking.learnerName ?? source.profile.name,
  }))
  const other = source.incoming.bookings.map((booking) => ({
    id: booking.id,
    booking,
    order: source.incoming.orders.find((order) => order.bookingId === booking.id),
    scope: "other" as const,
    learner: booking.learnerName ?? "Other learner",
  }))
  return [...own, ...other].sort((a, b) => b.booking.date.localeCompare(a.booking.date))
}

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "Confirmed",
  "in-review": "In review",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
}

export const policyLabels: Record<CancellationPolicy, string> = {
  flexible: "Flexible",
  standard: "Standard",
  group: "Group session",
  review: "Written review",
  monthly: "Monthly mentorship",
}

export type CancelPreview =
  | { allowed: true; policy: CancellationPolicy; terms: string; charged: number; refundPercent: number; refund: number; currency: string }
  | { allowed: false; reason: string }

// What an admin cancellation would refund, mirroring cancelWithRefund so the confirmation shows the real outcome.
export function adminCancelPreview(row: Pick<AdminBookingRow, "booking" | "order">, now: Date): CancelPreview {
  const decision = cancelDecision(row.booking, now)
  if (!decision.allowed) return { allowed: false, reason: decision.reason }
  const unpaid = row.order ? isUnpaid(row.order.status) : row.booking.status === "pending"
  const total = row.order?.quote.total ?? row.booking.total
  const refundPercent = unpaid ? 0 : decision.refundPercent
  const policy = policyFor(row.booking)
  return {
    allowed: true,
    policy,
    terms: cancellationTerms[policy],
    charged: unpaid ? 0 : total,
    refundPercent,
    refund: unpaid ? 0 : refundAmount(total, refundPercent),
    currency: row.order?.quote.currency ?? "BDT",
  }
}

export type AdminTransactionRow = { id: string; transaction: Transaction; order: Order; scope: "account" | "other" }

export function adminTransactionRows(source: AdminSource): AdminTransactionRow[] {
  const collect = (orders: Order[], scope: "account" | "other") => orders.flatMap((order) => order.transactions.map((transaction) => ({ id: transaction.id, transaction, order, scope })))
  return [...collect(source.orders, "account"), ...collect(source.incoming.orders, "other")].sort((a, b) => b.transaction.at.localeCompare(a.transaction.at))
}

export const isRefundOrder = (order: Order) => order.status === "refund-pending" || order.status === "refunded" || order.refundAmount !== undefined

export function adminRefundOrders(source: AdminSource): Order[] {
  return allOrders(source).filter(isRefundOrder).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export type AdminPayoutRow = { payout: Payout; mentor?: Mentor }

export function adminPayoutRows(source: AdminSource): AdminPayoutRow[] {
  return source.payouts
    .map((payout) => ({ payout, mentor: getMentor(payout.mentorSlug) }))
    .sort((a, b) => b.payout.requestedAt.localeCompare(a.payout.requestedAt))
}

export type AdminMentorFinanceRow = { slug: string; mentor?: Mentor; summary: FinanceSummary }

export function adminMentorFinanceRows(source: AdminSource, now: Date): AdminMentorFinanceRow[] {
  const slugs = [...new Set(allOrders(source).map((order) => order.mentorSlug))]
  return slugs
    .map((slug) => ({ slug, mentor: getMentor(slug), summary: summarize({ orders: allOrders(source), bookings: allBookings(source), payouts: source.payouts }, slug, now) }))
    .sort((a, b) => b.summary.estimatedEarnings - a.summary.estimatedEarnings)
}

export type AdminMentorRow = { mentor: Mentor; status: ModerationStatus; moderation?: AdminState["mentors"][string] }

export function adminMentorRows(source: AdminSource): AdminMentorRow[] {
  return getMentors().map((mentor) => ({ mentor, status: mentorStatusOf(source.admin, mentor.slug), moderation: source.admin.mentors[mentor.slug] }))
}

export type AdminOfferRow = { offer: Offer; mentor?: Mentor; status: OfferModerationStatus; moderation?: AdminState["offers"][string] }

export function adminOfferRows(source: AdminSource): AdminOfferRow[] {
  const fromCatalog = getMentors().flatMap((mentor) => {
    const offers = mentor.slug === "tanvir-rahman" && source.workspace.offers ? source.workspace.offers : mentor.offers
    return offers.map((offer) => ({ offer, mentor }))
  })
  return fromCatalog.map(({ offer, mentor }) => ({ offer, mentor, status: offerStatusOf(source.admin, offer.id), moderation: source.admin.offers[offer.id] }))
}

export type AdminReviewRow = { review: Review & { offerType: OfferType }; mentor?: Mentor; status: ReviewModerationStatus; moderation?: AdminState["reviews"][string] }

export function adminReviewRows(source: AdminSource): AdminReviewRow[] {
  return getAllReviews()
    .map((review) => ({ review, mentor: getMentor(review.mentorSlug), status: reviewStatusOf(source.admin, review.id), moderation: source.admin.reviews[review.id] }))
    .sort((a, b) => b.review.date.localeCompare(a.review.date))
}

export type AdminAccountRow = { email: string; name: string; kinds: string[]; applications: number; restricted: boolean; moderation?: AccountRestriction }

export function adminAccountRows(source: AdminSource): AdminAccountRow[] {
  const map = new Map<string, AdminAccountRow>()
  const upsert = (email: string, name: string, kind: string) => {
    const key = email.toLowerCase()
    const existing = map.get(key)
    if (existing) {
      if (!existing.kinds.includes(kind)) existing.kinds.push(kind)
      if (name && existing.name === email.split("@")[0]) existing.name = name
      return existing
    }
    const row: AdminAccountRow = { email, name: name || email.split("@")[0], kinds: [kind], applications: 0, restricted: accountStatusOf(source.admin, email) === "restricted", moderation: source.admin.accounts[email] }
    map.set(key, row)
    return row
  }

  for (const application of source.applications) {
    const row = upsert(application.applicantEmail, application.data.basic.fullName, "Applicant")
    row.applications += 1
  }
  upsert(source.profile.email, source.profile.name, "Learner")
  for (const dispute of source.admin.disputes) upsert(dispute.learnerEmail, "", "Reporter")
  for (const ticket of source.admin.tickets) upsert(ticket.email, "", "Ticket")

  return [...map.values()].sort((a, b) => a.email.localeCompare(b.email))
}

export type AuditFilter = { from?: string; to?: string; actor?: string }

// Dates are YYYY-MM-DD keys compared in Dhaka time, the timezone the log is displayed in; both ends are inclusive.
export function filterAudit(events: AdminAuditEvent[], filter: AuditFilter): AdminAuditEvent[] {
  return events.filter((event) => {
    if (filter.actor && event.actor !== filter.actor) return false
    const day = dateKeyInZone(Date.parse(event.at), DHAKA_TZ)
    if (filter.from && day < filter.from) return false
    if (filter.to && day > filter.to) return false
    return true
  })
}

export const auditActors = (events: AdminAuditEvent[]) => [...new Set(events.map((event) => event.actor))].sort()
