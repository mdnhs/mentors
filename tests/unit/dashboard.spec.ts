import { expect, test } from "@playwright/test"

import { demoBookings, demoNotes } from "@/lib/data/bookings"
import { mentorUpdates, nextActions, nextSession, recentActivity, recommendedMentors, splitBookings, type LearnerData } from "@/lib/dashboard"
import { getMentor } from "@/lib/data"
import { applyPaymentEvent, beginPayment, cancelWithRefund, startGroupCheckout, type Commerce } from "@/lib/payment-service"
import { formatCountdown } from "@/lib/format"
import type { GroupSession } from "@/lib/types"
import { getSession } from "@/lib/data"

const NOW = new Date("2026-10-18T06:00:00Z")
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)
const empty: LearnerData = { bookings: [], orders: [], saved: [], notes: {}, cancelledSessions: {}, sessionCapacity: {} }
const sample: LearnerData = { ...empty, bookings: demoBookings, notes: demoNotes, saved: ["nusrat-jahan"] }
const session = (id: string) => getSession(id) as GroupSession

let counter = 0
function enrolled(id: string, pay: boolean) {
  counter += 1
  const state: Commerce = { bookings: [], orders: [], cancelledSessions: {}, sessionCapacity: {} }
  const first = startGroupCheckout(state, { requestId: `r${counter}`, bookingId: `b${counter}`, orderId: `o${counter}`, method: "bkash", session: session(id), timezone: "Asia/Dhaka" }, NOW)
  if (!first.outcome.ok || !pay) return first
  const order = first.outcome.order
  const processing = beginPayment(first, order.id, "bkash", later(1)) as Commerce
  return applyPaymentEvent(processing, { id: `e${counter}`, type: "payment.succeeded", orderId: order.id, amount: order.quote.total, currency: "BDT" }, later(1)) as Commerce
}

const data = (commerce: Commerce, extra: Partial<LearnerData> = {}): LearnerData => ({ ...empty, ...commerce, ...extra })

test.describe("bookings overview", () => {
  test("splits active bookings from finished ones and finds the next confirmed call", () => {
    const { upcoming, past } = splitBookings(demoBookings, NOW)
    expect(upcoming.map((item) => item.id)).toEqual(["bk-1001", "bk-1002"])
    expect(past.map((item) => item.id)).toEqual(["bk-0994", "bk-0981"])
    expect(nextSession(upcoming, NOW)?.id).toBe("bk-1001")
  })

  test("a new learner has nothing: no next session, actions, activity or notes", () => {
    const { upcoming, past } = splitBookings([], NOW)
    expect(upcoming).toEqual([])
    expect(past).toEqual([])
    expect(nextSession(upcoming, NOW)).toBeUndefined()
    expect(nextActions(empty, NOW)).toEqual([])
    expect(recentActivity(empty)).toEqual([])
    expect(mentorUpdates(empty, NOW)).toEqual([])
  })

  test("an unpaid hold is upcoming but is not the next session", () => {
    const held = data(enrolled("sql-analytics-interview-prep", false) as Commerce)
    const { upcoming } = splitBookings(held.bookings, later(1))
    expect(upcoming).toHaveLength(1)
    expect(nextSession(upcoming, later(1))).toBeUndefined()
  })

  test("countdown wording", () => {
    expect(formatCountdown(20 * 60_000)).toBe("in 20 min")
    expect(formatCountdown(3 * 3_600_000)).toBe("in 3 hours")
    expect(formatCountdown(49 * 3_600_000)).toBe("in 2 days")
  })
})

test.describe("what to do next", () => {
  test("unpaid bookings come first, with the hold deadline", () => {
    const commerce = enrolled("sql-analytics-interview-prep", false) as Commerce
    const held = data(commerce, { notes: demoNotes, bookings: [...demoBookings, ...commerce.bookings] })
    const actions = nextActions(held, later(1))
    expect(actions[0]).toMatchObject({ tone: "warning", title: expect.stringContaining("Finish payment") })
  })

  test("an expired hold is no longer an action", () => {
    const held = data(enrolled("sql-analytics-interview-prep", false) as Commerce)
    expect(nextActions(held, later(60))).toEqual([])
  })

  test("open steps from session notes are listed once per booking, and done ones are not", () => {
    const actions = nextActions(sample, NOW)
    expect(actions.map((item) => item.id)).toEqual(expect.arrayContaining(["plan-bk-0994", "plan-bk-0981"]))
    const plan = actions.find((item) => item.id === "plan-bk-0994")!
    expect(plan.title).toContain("2 open steps")
    expect(plan.detail).toBe("Draft a one-page research statement")
    const finished = { ...sample, notes: { "bk-0994": { ...demoNotes["bk-0994"], actions: demoNotes["bk-0994"].actions.map((item) => ({ ...item, done: true })) } } }
    expect(nextActions(finished, NOW).some((item) => item.id === "plan-bk-0994")).toBe(false)
  })

  test("a session within 48 hours asks the learner to prepare", () => {
    const soon = new Date("2026-10-21T10:00:00Z")
    expect(nextActions(sample, soon).some((item) => item.id === "prep-bk-1001")).toBe(true)
    expect(nextActions(sample, NOW).some((item) => item.id === "prep-bk-1001")).toBe(false)
  })

  test("a pending refund is surfaced", () => {
    const paid = enrolled("sql-analytics-interview-prep", true) as Commerce
    const cancelled = cancelWithRefund(paid, paid.bookings[0].id, later(5)) as Commerce
    expect(nextActions(data(cancelled), later(6))[0].title).toMatch(/Refund of ৳\d+ is pending/)
  })

  test("never shows more than four", () => {
    const many = { ...sample, notes: { ...demoNotes, "bk-1001": { actions: [{ id: "x", text: "t", done: false, by: "you" as const }], personal: "" }, "bk-1002": { actions: [{ id: "y", text: "t", done: false, by: "you" as const }], personal: "" } } }
    expect(nextActions(many, NOW).length).toBeLessThanOrEqual(4)
  })
})

test.describe("activity and guidance", () => {
  test("activity lists payment and refund events newest first", () => {
    const paid = enrolled("sql-analytics-interview-prep", true) as Commerce
    const cancelled = cancelWithRefund(paid, paid.bookings[0].id, later(5)) as Commerce
    const feed = recentActivity(data(cancelled))
    expect(feed.map((item) => item.text)).toEqual([expect.stringContaining("Refund started"), expect.stringContaining("Booking confirmed")])
  })

  test("mentor updates only come from followed mentors and only while open", () => {
    expect(mentorUpdates({ ...empty, saved: ["farzana-haque"] }, NOW).map((item) => item.session.id)).toContain("sql-analytics-interview-prep")
    expect(mentorUpdates({ ...empty, saved: ["farzana-haque"] }, NOW).map((item) => item.session.id)).not.toContain("product-metrics-crash-course")
    expect(mentorUpdates({ ...empty, saved: ["sadia-islam"] }, NOW)).toEqual([])
    const booked = enrolled("sql-analytics-interview-prep", true) as Commerce
    expect(mentorUpdates(data(booked), later(2)).some((item) => item.session.id === "sql-analytics-interview-prep")).toBe(false)
  })

  test("recommendations skip saved and booked mentors and share a field with them", () => {
    const picks = recommendedMentors(sample, NOW)
    expect(picks.length).toBeGreaterThan(0)
    const taken = new Set(["nusrat-jahan", ...demoBookings.map((item) => item.mentorSlug)])
    const interests = new Set([...taken].flatMap((slug) => getMentor(slug)!.categories))
    for (const mentor of picks) {
      expect(taken.has(mentor.slug)).toBe(false)
      expect(mentor.categories.some((category) => interests.has(category))).toBe(true)
    }
  })

  test("a new learner still gets popular mentors to start with", () => {
    expect(recommendedMentors(empty, NOW)).toHaveLength(3)
  })
})
