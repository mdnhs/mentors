import { expect, test } from "@playwright/test"

import { businessMetrics } from "@/lib/admin-metrics"
import {
  accountStatusOf,
  emptyAdminState,
  logAdminAction,
  mentorStatusOf,
  offerStatusOf,
  reviewStatusOf,
  setAccountStatus,
  setMentorStatus,
  setOfferStatus,
  setReviewStatus,
  updateDispute,
  updateTicket,
  type AdminState,
} from "@/lib/admin"
import { adminAccountRows, adminMentorRows, adminOfferRows, adminRefundOrders, adminReviewRows, type AdminSource } from "@/lib/admin-selectors"
import { demoApplications } from "@/lib/data/applications"
import { demoDisputes, demoTickets } from "@/lib/data/admin"
import { incomingBookings, incomingOrders } from "@/lib/data/incoming"
import { getMentor, getMentors } from "@/lib/data"
import { createDraft, review, visibleTo } from "@/lib/mentor-application"
import { canReviewApplications, isAdmin, type Principal } from "@/lib/permissions"
import type { Profile } from "@/lib/types"

const NOW = new Date("2026-10-18T06:00:00Z")
const admin: Principal = { role: "admin", email: "admin@example.com" }
const reviewer: Principal = { role: "reviewer", email: "reviewer@example.com" }
const learner: Principal = { role: "learner", email: "sara@example.com" }

const state = (overrides: Partial<AdminState> = {}): AdminState => ({ ...emptyAdminState, disputes: demoDisputes, tickets: demoTickets, ...overrides })

const profile: Profile = { name: "Rafi Ahmed", email: "rafi@example.com", timezone: "Asia/Dhaka" }

const source = (overrides: Partial<AdminSource> = {}): AdminSource => ({
  bookings: incomingBookings,
  orders: incomingOrders,
  incoming: { bookings: [], orders: [] },
  payouts: [],
  applications: demoApplications,
  admin: state(),
  profile,
  workspace: { offers: null },
  ...overrides,
})

test.describe("roles", () => {
  test("administration is its own role, separate from reviewing", () => {
    expect(isAdmin(admin)).toBe(true)
    expect(isAdmin(reviewer)).toBe(false)
    expect(isAdmin(null)).toBe(false)
    expect(canReviewApplications(reviewer)).toBe(true)
    expect(canReviewApplications(admin)).toBe(true)
    expect(canReviewApplications(learner)).toBe(false)
  })

  test("only an administrator passes admin checks; a reviewer does not", () => {
    expect(setMentorStatus(reviewer, state(), getMentor("tanvir-rahman") ?? null, { status: "suspended", reason: "test reason here" }, NOW)).toMatchObject({ ok: false, code: "forbidden" })
    expect(setMentorStatus(null, state(), getMentor("tanvir-rahman") ?? null, { status: "suspended", reason: "test reason here" }, NOW)).toMatchObject({ ok: false, code: "forbidden" })
  })
})

test.describe("moderation", () => {
  test("suspending a mentor needs a reason and is recorded in the audit trail", () => {
    const mentor = getMentor("tanvir-rahman")!
    expect(setMentorStatus(admin, state(), mentor, { status: "suspended" }, NOW)).toMatchObject({ ok: false, code: "invalid" })
    expect(setMentorStatus(admin, state(), mentor, { status: "suspended", reason: "short" }, NOW)).toMatchObject({ ok: false, code: "invalid" })

    const result = setMentorStatus(admin, state(), mentor, { status: "suspended", reason: "Repeated no-shows reported" }, NOW)
    if (!result.ok) throw new Error(result.message)
    expect(mentorStatusOf(result.state, mentor.slug)).toBe("suspended")
    expect(result.state.audit[0]).toMatchObject({ actor: admin.email, action: "mentor-suspended", target: mentor.slug, detail: "Repeated no-shows reported" })
  })

  test("restoring a mentor needs no reason and flips the status back", () => {
    const mentor = getMentor("tanvir-rahman")!
    const suspended = setMentorStatus(admin, state(), mentor, { status: "suspended", reason: "Under investigation" }, NOW)
    if (!suspended.ok) throw new Error("setup")
    const restored = setMentorStatus(admin, suspended.state, mentor, { status: "active" }, NOW)
    if (!restored.ok) throw new Error(restored.message)
    expect(mentorStatusOf(restored.state, mentor.slug)).toBe("active")
    expect(restored.state.audit[0].action).toBe("mentor-restored")
  })

  test("an unknown mentor is not found", () => {
    expect(setMentorStatus(admin, state(), null, { status: "active" }, NOW)).toMatchObject({ ok: false, code: "not-found" })
  })

  test("offers can be paused with a reason and restored", () => {
    const offer = getMentor("tanvir-rahman")!.offers[0]
    expect(setOfferStatus(admin, state(), offer, { status: "paused" }, NOW)).toMatchObject({ ok: false, code: "invalid" })
    const paused = setOfferStatus(admin, state(), offer, { status: "paused", reason: "Claims not verified" }, NOW)
    if (!paused.ok) throw new Error(paused.message)
    expect(offerStatusOf(paused.state, offer.id)).toBe("paused")
    const restored = setOfferStatus(admin, paused.state, offer, { status: "live" }, NOW)
    expect(restored.ok && offerStatusOf(restored.state, offer.id)).toBe("live")
  })

  test("reviews can be hidden with a reason and restored", () => {
    const review = adminReviewRows(source())[0].review
    expect(setReviewStatus(admin, state(), review, { status: "hidden" }, NOW)).toMatchObject({ ok: false, code: "invalid" })
    const hidden = setReviewStatus(admin, state(), review, { status: "hidden", reason: "Contains personal details" }, NOW)
    if (!hidden.ok) throw new Error(hidden.message)
    expect(reviewStatusOf(hidden.state, review.id)).toBe("hidden")
  })

  test("a reason is trimmed and stored as metadata only", () => {
    const mentor = getMentor("nusrat-jahan")!
    const result = setMentorStatus(admin, state(), mentor, { status: "suspended", reason: "   Policy breach reviewed   " }, NOW)
    if (!result.ok) throw new Error(result.message)
    expect(result.state.audit[0].detail).toBe("Policy breach reviewed")
    // The trail holds a reason and a target, never document contents or ID numbers.
    expect(JSON.stringify(result.state.audit)).not.toMatch(/base64|nid-front|passport\.pdf/i)
  })
})

test.describe("accounts, disputes and tickets", () => {
  test("restricting an account needs a reason; the status reads back", () => {
    expect(setAccountStatus(admin, state(), "someone@example.com", { status: "restricted" }, NOW)).toMatchObject({ ok: false, code: "invalid" })
    const result = setAccountStatus(admin, state(), "Someone@Example.com", { status: "restricted", reason: "Chargeback abuse" }, NOW)
    if (!result.ok) throw new Error(result.message)
    expect(accountStatusOf(result.state, "Someone@Example.com")).toBe("restricted")
    expect(result.state.audit[0]).toMatchObject({ action: "account-restricted", target: "Someone@Example.com" })
  })

  test("a dispute moves open -> investigating, then needs a note to resolve", () => {
    const open = demoDisputes.find((dispute) => dispute.status === "open")!
    const investigating = updateDispute(admin, state(), open, { status: "investigating" }, NOW)
    if (!investigating.ok) throw new Error(investigating.message)
    expect(investigating.dispute.status).toBe("investigating")
    expect(updateDispute(admin, investigating.state, investigating.dispute, { status: "refunded", note: "short" }, NOW)).toMatchObject({ ok: false, code: "invalid" })

    const refunded = updateDispute(admin, investigating.state, investigating.dispute, { status: "refunded", note: "Mentor cancellation confirmed" }, NOW)
    if (!refunded.ok) throw new Error(refunded.message)
    expect(refunded.dispute).toMatchObject({ status: "refunded", note: "Mentor cancellation confirmed" })
    expect(refunded.dispute.resolvedAt).toBe(NOW.toISOString())
    // Terminal disputes can't move again.
    expect(updateDispute(admin, refunded.state, refunded.dispute, { status: "declined", note: "changed my mind" }, NOW)).toMatchObject({ ok: false, code: "invalid-transition" })
  })

  test("a resolved dispute can't be reopened, and reviewers can't touch disputes", () => {
    const resolved = demoDisputes.find((dispute) => dispute.status === "refunded")!
    expect(updateDispute(admin, state(), resolved, { status: "investigating" }, NOW)).toMatchObject({ ok: false, code: "invalid-transition" })
    expect(updateDispute(reviewer, state(), resolved, { status: "investigating" }, NOW)).toMatchObject({ ok: false, code: "forbidden" })
  })

  test("support tickets change status and are audited", () => {
    const ticket = demoTickets.find((item) => item.status === "open")!
    const closed = updateTicket(admin, state(), ticket, { status: "closed" }, NOW)
    if (!closed.ok) throw new Error(closed.message)
    expect(closed.ticket.status).toBe("closed")
    expect(closed.state.audit[0]).toMatchObject({ action: "ticket-updated", target: ticket.id })
  })

  test("free-form audit logging is admin-only", () => {
    expect(logAdminAction(learner, state(), "booking-cancelled", "bk-1", undefined, NOW)).toMatchObject({ ok: false, code: "forbidden" })
    const logged = logAdminAction(admin, state(), "booking-cancelled", "bk-1", "refund 100%", NOW)
    expect(logged.ok && logged.state.audit[0]).toMatchObject({ action: "booking-cancelled", target: "bk-1", detail: "refund 100%" })
  })
})

test.describe("application review by admins", () => {
  test("an administrator can work the review queue like a reviewer", () => {
    const submitted = demoApplications.find((item) => item.status === "submitted")!
    const started = review(admin, demoApplications, submitted.id, { kind: "start" }, NOW)
    if (!started.ok) throw new Error(started.message)
    expect(started.application.status).toBe("under-review")
    expect(visibleTo(admin, started.applications).map((item) => item.id)).toContain(submitted.id)
  })

  test("a learner cannot review, and an administrator cannot apply", () => {
    const submitted = demoApplications.find((item) => item.status === "submitted")!
    expect(review(learner, demoApplications, submitted.id, { kind: "start" }, NOW)).toMatchObject({ ok: false, code: "forbidden" })
    expect(createDraft(admin, demoApplications, "APP-X", NOW)).toMatchObject({ ok: false, code: "forbidden" })
    expect(createDraft(reviewer, demoApplications, "APP-X", NOW)).toMatchObject({ ok: false, code: "forbidden" })
  })
})

test.describe("business metrics", () => {
  test("derives value, rates and counts from orders and bookings", () => {
    const metrics = businessMetrics({ bookings: incomingBookings, orders: incomingOrders, mentors: getMentors() }, NOW)
    expect(metrics).toMatchObject({
      grossBookingValue: 8400,
      refundedValue: 0,
      platformRevenue: 1200,
      mentorEarnings: 7200,
      completedBookings: 2,
      cancellationRate: 0,
      refundRate: 0,
      bookingConversion: 1,
      demoOnly: true,
    })
    expect(metrics.counts).toMatchObject({ bookings: 3, orders: 3, paidOrders: 3, learners: 3, repeatLearners: 0 })
  })

  test("repeat bookings are counted per learner", () => {
    const bookings = [
      { ...incomingBookings[0], learnerName: "Anika" },
      { ...incomingBookings[1], learnerName: "Anika" },
      { ...incomingBookings[2], learnerName: "Imtiaz" },
    ]
    const metrics = businessMetrics({ bookings, orders: incomingOrders, mentors: getMentors() }, NOW)
    expect(metrics.repeatBookingRate).toBe(0.5)
    expect(metrics.counts.repeatLearners).toBe(1)
  })

  test("refunds lower net value and platform revenue", () => {
    const order = incomingOrders[0]
    const refunded = { ...order, status: "refunded" as const, transactions: [...order.transactions, { id: "r", kind: "refund" as const, amount: order.quote.total, currency: "BDT", status: "succeeded" as const, eventId: "e", at: NOW.toISOString(), simulated: true }] }
    const metrics = businessMetrics({ bookings: incomingBookings, orders: [refunded, ...incomingOrders.slice(1)], mentors: getMentors() }, NOW)
    expect(metrics.refundedValue).toBe(order.quote.total)
    expect(metrics.netBookingValue).toBe(8400 - order.quote.total)
    expect(metrics.refundRate).toBeCloseTo(order.quote.total / 8400, 5)
  })

  test("suspended mentors stop counting as active", () => {
    const open = businessMetrics({ bookings: incomingBookings, orders: incomingOrders, mentors: getMentors() }, NOW).activeMentors
    const suspended = businessMetrics({ bookings: incomingBookings, orders: incomingOrders, mentors: getMentors(), suspendedMentors: new Set(["tanvir-rahman"]) }, NOW).activeMentors
    const listed = getMentors().filter((mentor) => mentor.offers.some((offer) => offer.status === "published")).length
    expect(open).toBe(listed)
    expect(suspended).toBe(listed - 1)
  })
})

test.describe("selectors", () => {
  test("lists mentors and offers from the catalogue", () => {
    expect(adminMentorRows(source())).toHaveLength(getMentors().length)
    const totalOffers = getMentors().reduce((count, mentor) => count + mentor.offers.length, 0)
    expect(adminOfferRows(source())).toHaveLength(totalOffers)
  })

  test("builds account rows from applicants and the signed-in learner", () => {
    const accounts = adminAccountRows(source())
    expect(accounts.some((row) => row.email === "nadia.sample@example.com" && row.applications === 1)).toBe(true)
    expect(accounts.some((row) => row.email === profile.email)).toBe(true)
  })

  test("finds orders with a refund", () => {
    const order = { ...incomingOrders[0], refundAmount: 100, refundPercent: 100 }
    expect(adminRefundOrders(source({ orders: [order, ...incomingOrders.slice(1)] })).map((item) => item.id)).toContain(order.id)
    expect(adminRefundOrders(source({ orders: [], incoming: { bookings: [], orders: [] } }))).toEqual([])
    expect(adminReviewRows(source()).length).toBeGreaterThan(0)
  })
})
