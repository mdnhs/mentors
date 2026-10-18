import { expect, test } from "@playwright/test"

import { demoApplications } from "@/lib/data/applications"
import type { Application } from "@/lib/mentor-application"
import { ageOf, overdueCount, parseView, queueCounts, queueFor, waitingSince } from "@/lib/review-insights"

const now = new Date("2026-10-18T06:00:00Z")
const byId = (id: string) => demoApplications.find((item) => item.id === id)!

test("unknown views fall back to the needs-attention queue", () => {
  expect(parseView(null)).toBe("open")
  expect(parseView("nonsense")).toBe("open")
  expect(parseView("decided")).toBe("decided")
})

test("counts each view and only recent decisions", () => {
  expect(queueCounts(demoApplications, now)).toEqual({ open: 2, submitted: 1, "under-review": 1, "info-required": 1, decided: 1 })
  expect(queueCounts(demoApplications, new Date("2026-12-01T00:00:00Z")).decided).toBe(0)
})

test("needs attention is served oldest first, decisions newest first", () => {
  expect(queueFor(demoApplications, "open").map((item) => item.id)).toEqual(["app-s2", "app-s1"])
  const decided: Application = { ...byId("app-s4"), id: "later", decision: { ...byId("app-s4").decision!, at: "2026-10-15T00:00:00Z" } }
  expect(queueFor([...demoApplications, decided], "decided").map((item) => item.id)).toEqual(["later", "app-s4"])
})

test("age reads as waiting time and flags anything past three days", () => {
  expect(ageOf(byId("app-s2"), now)).toEqual({ label: "Waiting 7 days", overdue: true })
  expect(ageOf(byId("app-s1"), now)).toEqual({ label: "Waiting 3 days", overdue: false })
  expect(ageOf(byId("app-s1"), new Date("2026-10-14T09:00:00Z"))).toEqual({ label: "Arrived today", overdue: false })
  expect(ageOf(byId("app-s3"), now)).toEqual({ label: "Asked 4 days ago", overdue: false })
  expect(ageOf(byId("app-s4"), now)).toEqual({ label: "Decided 12 days ago", overdue: false })
  expect(overdueCount(demoApplications, now)).toBe(1)
})

test("a resubmission restarts the clock", () => {
  const base = byId("app-s1")
  const resubmitted: Application = { ...base, audit: [...base.audit, { id: "x", at: "2026-10-17T06:00:00Z", actor: "applicant", actorRef: base.applicantEmail, action: "resubmitted" }] }
  expect(waitingSince(resubmitted)).toBe("2026-10-17T06:00:00Z")
  expect(ageOf(resubmitted, now)).toEqual({ label: "Waiting 1 day", overdue: false })
})
