import { expect, test } from "@playwright/test"

import { emptyAdminState, type AdminAuditEvent } from "@/lib/admin"
import { adminRefundStats, adminTransactionRows, adminTransactionTotals, adminWorkQueues, recentAudit, type AdminSource } from "@/lib/admin-selectors"
import { demoApplications } from "@/lib/data/applications"
import { demoDisputes, demoTickets } from "@/lib/data/admin"
import { incomingBookings, incomingOrders } from "@/lib/data/incoming"
import type { Order } from "@/lib/orders"

const NOW = new Date("2026-10-18T06:00:00Z")

const source = (overrides: Partial<AdminSource> = {}): AdminSource => ({
  bookings: [],
  orders: [],
  incoming: { bookings: incomingBookings, orders: incomingOrders },
  payouts: [],
  applications: demoApplications,
  admin: { ...emptyAdminState, disputes: demoDisputes, tickets: demoTickets },
  profile: { name: "Rafi Ahmed", email: "rafi@example.com", timezone: "Asia/Dhaka" },
  workspace: { offers: null },
  ...overrides,
})

const refundOrder = (at: string, amount: number): Order => ({
  ...incomingOrders[0],
  id: `ORD-T-${at}`,
  status: "refunded",
  transactions: [{ id: `TX-${at}`, kind: "refund", amount, currency: "BDT", status: "succeeded", eventId: "evt", at, simulated: true }],
})

test.describe("overview work queues", () => {
  test("counts each queue and links to a pre-filtered module", () => {
    const queues = adminWorkQueues(source())
    const byId = Object.fromEntries(queues.map((queue) => [queue.id, queue]))
    expect(byId.applications.count).toBe(demoApplications.filter((item) => item.status === "submitted" || item.status === "under-review").length)
    expect(byId.disputes.count).toBe(2)
    expect(byId.disputes.href).toContain("disputes.status=unresolved")
    expect(byId.tickets.count).toBe(1)
    expect(byId.payouts.count).toBe(0)
    expect(byId.moderated.count).toBe(0)
  })

  test("moderated items add up suspensions, paused offers and hidden reviews", () => {
    const at = NOW.toISOString()
    const admin = {
      ...emptyAdminState,
      mentors: { a: { status: "suspended" as const, reason: "x", at, by: "a" } },
      offers: { o: { status: "paused" as const, reason: "x", at, by: "a" } },
      reviews: { r: { status: "hidden" as const, reason: "x", at, by: "a" } },
    }
    expect(adminWorkQueues(source({ admin })).find((queue) => queue.id === "moderated")?.count).toBe(3)
  })

  test("recent activity is the newest events first, capped", () => {
    const events: AdminAuditEvent[] = ["2026-10-01", "2026-10-03", "2026-10-02"].map((day, index) => ({ id: `e${index}`, at: `${day}T00:00:00Z`, actor: "a", action: "ticket-updated", target: "t" }))
    expect(recentAudit(events, 2).map((event) => event.id)).toEqual(["e1", "e2"])
    expect(events[0].id).toBe("e0")
  })
})

test.describe("refund and transaction summaries", () => {
  test("refunded this month counts only this calendar month in Dhaka", () => {
    // 2026-09-30T19:00Z is already 1 October in Dhaka.
    const orders = [refundOrder("2026-10-05T10:00:00Z", 500), refundOrder("2026-09-30T19:00:00Z", 300), refundOrder("2026-09-29T10:00:00Z", 900)]
    const stats = adminRefundStats(source({ orders, incoming: { bookings: [], orders: [] } }), NOW)
    expect(stats.refundedThisMonth).toBe(800)
    expect(stats.refundedThisMonthCount).toBe(2)
    expect(stats.openDisputes).toBe(2)
    expect(stats.refundsPending).toBe(0)
  })

  test("pending refunds sum the amounts set at cancellation", () => {
    const pending = { ...incomingOrders[0], status: "refund-pending" as const, refundAmount: 1200 }
    const stats = adminRefundStats(source({ orders: [pending], incoming: { bookings: [], orders: [] } }), NOW)
    expect(stats).toMatchObject({ refundsPending: 1, refundsPendingValue: 1200 })
  })

  test("transaction totals ignore failed attempts in the sums", () => {
    const order: Order = {
      ...incomingOrders[0],
      transactions: [
        { id: "a", kind: "charge", amount: 1000, currency: "BDT", status: "succeeded", eventId: "1", at: "2026-10-01T00:00:00Z", simulated: true },
        { id: "b", kind: "charge", amount: 700, currency: "BDT", status: "failed", eventId: "2", at: "2026-10-01T00:00:00Z", simulated: true },
        { id: "c", kind: "refund", amount: 400, currency: "BDT", status: "succeeded", eventId: "3", at: "2026-10-02T00:00:00Z", simulated: true },
      ],
    }
    const rows = adminTransactionRows(source({ orders: [order], incoming: { bookings: [], orders: [] } }))
    expect(adminTransactionTotals(rows)).toEqual({ charged: 1000, refunded: 400, failed: 1 })
  })
})
