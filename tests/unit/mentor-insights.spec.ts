import { expect, test } from "@playwright/test"

import { getMentor, getSession } from "@/lib/data"
import { incomingBookings, incomingOrders } from "@/lib/data/incoming"
import { mentorBookings, type MentorTask } from "@/lib/mentor-dashboard"
import { earningsByMonth } from "@/lib/mentor-finance"
import { bookingsPerOffer, MENTOR_BOOKINGS_HREF, monthTrend, parsePayoutInput, seatShare, splitSessions, withBookingsPage } from "@/lib/mentor-insights"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"
import type { GroupSession } from "@/lib/types"

const NOW = new Date("2026-10-18T06:00:00Z")
const mentor = getMentor(DEMO_MENTOR_SLUG)!
const items = mentorBookings({ bookings: [], orders: [] }, { bookings: incomingBookings, orders: incomingOrders }, DEMO_MENTOR_SLUG, "Rafi Ahmed")

test.describe("mentor overview insights", () => {
  test("tasks that pointed at the old bookings anchor open the Bookings page", () => {
    const tasks: MentorTask[] = [
      { id: "a", title: "A", detail: "", href: "#bookings", cta: "View booking" },
      { id: "b", title: "B", detail: "", href: "/dashboard/mentor/earnings", cta: "Request payout" },
    ]
    expect(withBookingsPage(tasks).map((task) => task.href)).toEqual([MENTOR_BOOKINGS_HREF, "/dashboard/mentor/earnings"])
  })

  test("this month's earnings come with a trend and a delta only when last month had earnings", () => {
    const sample = monthTrend(earningsByMonth({ orders: incomingOrders, payouts: [] }, DEMO_MENTOR_SLUG, NOW, 6, mentor.timezone))
    expect(sample).toMatchObject({ current: 7200, previous: 0, delta: null })
    expect(sample.trend).toHaveLength(6)
    expect(monthTrend([{ month: "2026-09", earnings: 1000 }, { month: "2026-10", earnings: 1500 }]).delta).toBeCloseTo(0.5)
    expect(monthTrend([])).toMatchObject({ current: 0, delta: null, trend: [] })
  })

  test("counts active and completed bookings per offer", () => {
    expect(bookingsPerOffer(items, NOW)).toEqual({ "tanvir-mock": 2, "tanvir-career": 1 })
  })
})

test.describe("group sessions", () => {
  const base = getSession("system-design-essentials")!

  test("seat share is clamped between empty and full", () => {
    expect(seatShare(15, 30)).toBe(0.5)
    expect(seatShare(40, 30)).toBe(1)
    expect(seatShare(3, 0)).toBe(0)
  })

  test("upcoming sessions exclude cancelled and started ones", () => {
    const cancelled: GroupSession = { ...base, id: "x", status: "cancelled" }
    const past: GroupSession = { ...base, id: "y", startsAt: "2026-10-01T10:00:00Z" }
    const split = splitSessions([past, cancelled, base], NOW)
    expect(split.upcoming.map((session) => session.id)).toEqual([base.id])
    expect(split.past.map((session) => session.id).sort()).toEqual(["x", "y"])
  })
})

test.describe("payout amount input", () => {
  test("blank requests everything available", () => {
    expect(parsePayoutInput("", 4500, 500)).toEqual({ ok: true, amount: 4500 })
    expect(parsePayoutInput(" 2000 ", 4500, 500)).toEqual({ ok: true, amount: 2000 })
  })

  test("refuses non-numbers, tiny and excessive amounts with the same rules as the server", () => {
    expect(parsePayoutInput("abc", 4500, 500)).toMatchObject({ ok: false, message: "Enter the amount in whole taka." })
    expect(parsePayoutInput("12.5", 4500, 500).ok).toBe(false)
    expect(parsePayoutInput("10", 4500, 500)).toMatchObject({ ok: false, message: "The smallest payout is ৳500." })
    expect(parsePayoutInput("999999", 4500, 500)).toMatchObject({ ok: false, message: "That is more than your available balance." })
    expect(parsePayoutInput("", 200, 500).ok).toBe(false)
  })
})
