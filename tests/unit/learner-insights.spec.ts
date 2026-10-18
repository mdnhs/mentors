import { expect, test } from "@playwright/test"

import { demoBookings, demoNotes } from "@/lib/data/bookings"
import { splitBookings } from "@/lib/dashboard"
import { getSession } from "@/lib/data"
import { completedCount, greeting, notedBookings, openSteps, paymentActivity, stepProgress, weekEvents, zoneName } from "@/lib/learner-insights"
import { applyPaymentEvent, beginPayment, cancelWithRefund, startGroupCheckout, type Commerce } from "@/lib/payment-service"
import type { GroupSession } from "@/lib/types"

const NOW = new Date("2026-10-18T06:00:00Z")
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)

function paidSeat(): Commerce {
  const state: Commerce = { bookings: [], orders: [], cancelledSessions: {}, sessionCapacity: {} }
  const first = startGroupCheckout(state, { requestId: "r1", bookingId: "b1", orderId: "o1", method: "bkash", session: getSession("sql-analytics-interview-prep") as GroupSession, timezone: "Asia/Dhaka" }, NOW)
  if (!first.outcome.ok) throw new Error("checkout failed")
  const order = first.outcome.order
  const processing = beginPayment(first, order.id, "bkash", later(1)) as Commerce
  return applyPaymentEvent(processing, { id: "e1", type: "payment.succeeded", orderId: order.id, amount: order.quote.total, currency: "BDT" }, later(1)) as Commerce
}

test.describe("greeting", () => {
  test("follows the time of day in the learner's zone", () => {
    expect(greeting(new Date("2026-10-18T02:00:00Z"), "Asia/Dhaka")).toBe("Good morning")
    expect(greeting(NOW, "Asia/Dhaka")).toBe("Good afternoon")
    expect(greeting(new Date("2026-10-18T14:00:00Z"), "Asia/Dhaka")).toBe("Good evening")
    expect(greeting(NOW, "Europe/London")).toBe("Good morning")
    expect(greeting(NOW, "America/New_York")).toBe("Good evening")
  })

  test("names the zone the way people say it", () => {
    expect(zoneName("Asia/Dhaka")).toBe("Dhaka time")
    expect(zoneName("America/New_York")).toBe("New York time")
  })
})

test.describe("action steps", () => {
  test("lists every open step, newest session first", () => {
    const steps = openSteps(demoBookings, demoNotes)
    expect(steps.map((step) => step.item.id)).toEqual(["a2", "a3", "b1"])
    expect(steps[0].booking.id).toBe("bk-0994")
  })

  test("progress counts done steps and handles a plan with none", () => {
    expect(stepProgress(demoNotes["bk-0994"])).toEqual({ done: 1, total: 3, percent: 33 })
    expect(stepProgress(undefined)).toEqual({ done: 0, total: 0, percent: 0 })
  })

  test("only bookings with something written are listed as noted", () => {
    expect(notedBookings(demoBookings, demoNotes).map((booking) => booking.id)).toEqual(["bk-0994", "bk-0981"])
    expect(notedBookings(demoBookings, { "bk-1001": { actions: [], personal: "  " } })).toEqual([])
  })
})

test.describe("week and counts", () => {
  test("the week strip skips reviews and links each session to its booking", () => {
    const { upcoming } = splitBookings(demoBookings, NOW)
    const events = weekEvents(upcoming, NOW)
    expect(events.map((event) => event.id)).toEqual(["bk-1001", "bk-1002"])
    expect(events[0]).toMatchObject({ href: "/dashboard/bookings/bk-1001", muted: false })
    expect(weekEvents(demoBookings.filter((booking) => booking.kind === "review"), NOW)).toEqual([])
  })

  test("completed sessions are counted by their effective status", () => {
    expect(completedCount(demoBookings, NOW)).toBe(2)
    expect(completedCount([], NOW)).toBe(0)
  })
})

test.describe("payment activity", () => {
  test("a paid seat shows as paid with its total", () => {
    const paid = paidSeat()
    const [event] = paymentActivity(paid.orders, paid.bookings)
    expect(event).toMatchObject({ label: "Paid", status: "confirmed", amount: paid.orders[0].quote.total, bookingId: paid.bookings[0].id })
  })

  test("a refund comes first and carries the refunded amount", () => {
    const paid = paidSeat()
    const cancelled = cancelWithRefund(paid, paid.bookings[0].id, later(5)) as Commerce
    const feed = paymentActivity(cancelled.orders, cancelled.bookings)
    expect(feed[0]).toMatchObject({ label: "Refund pending", amount: cancelled.orders[0].refundAmount })
    expect(feed.at(-1)?.label).toBe("Paid")
  })

  test("nothing paid means nothing listed", () => {
    expect(paymentActivity([], demoBookings)).toEqual([])
  })
})
