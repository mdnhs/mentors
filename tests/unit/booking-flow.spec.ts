import { expect, test } from "@playwright/test"

import { blockedReason, documentLinkError, nextStep, parseStep, previousStep, resolveStep, stepComplete, type FlowState } from "@/components/booking/steps/flow"

const SLOT = "2026-10-20T08:00:00.000Z"
const GOALS = "I want to plan my path into ML engineering."
const scheduled = (overrides: Partial<FlowState> = {}): FlowState => ({ isReview: false, slot: SLOT, note: GOALS, documentLink: "", contactValid: true, ...overrides })
const review = (overrides: Partial<FlowState> = {}): FlowState => ({ isReview: true, slot: null, note: GOALS, documentLink: "", contactValid: true, ...overrides })

test.describe("booking flow steps", () => {
  test("pay is blocked on review when the slot was cleared after a failed checkout", () => {
    const state = scheduled({ slot: null })
    expect(stepComplete("review", state)).toBe(false)
    expect(blockedReason("review", state)).toMatch(/Pick a date and time/)
  })

  test("a cleared slot sends the learner from review back to the schedule step", () => {
    expect(resolveStep("review", scheduled())).toBe("review")
    expect(resolveStep("review", scheduled({ slot: null }))).toBe("schedule")
  })

  test("deep links land on the first incomplete step", () => {
    expect(resolveStep("review", scheduled({ slot: null, note: "" }))).toBe("schedule")
    expect(resolveStep("review", scheduled({ note: "short" }))).toBe("goals")
    expect(resolveStep("goals", scheduled({ slot: null }))).toBe("schedule")
    expect(resolveStep("schedule", scheduled({ slot: null }))).toBe("schedule")
    expect(resolveStep("review", review({ note: "" }))).toBe("schedule")
  })

  test("review offers have no goals step", () => {
    expect(resolveStep("goals", review())).toBe("review")
    expect(resolveStep("goals", review({ note: "" }))).toBe("schedule")
    expect(nextStep("schedule", true)).toBe("review")
    expect(previousStep("review", true)).toBe("schedule")
    expect(nextStep("schedule", false)).toBe("goals")
    expect(nextStep("review", false)).toBeNull()
    expect(previousStep("offer", false)).toBeNull()
  })

  test("review offers don't need a slot to pay, but need valid contact", () => {
    expect(blockedReason("review", review())).toBeNull()
    expect(blockedReason("review", review({ contactValid: false }))).toMatch(/name and email/)
  })

  test("goals need the minimum length", () => {
    expect(stepComplete("goals", scheduled({ note: "  short   " }))).toBe(false)
    expect(blockedReason("goals", scheduled({ note: "short" }))).toMatch(/at least 10 characters/)
    expect(stepComplete("goals", scheduled())).toBe(true)
  })

  test("an optional document link must be a full web address", () => {
    expect(documentLinkError("")).toBeNull()
    expect(documentLinkError("https://drive.google.com/file/1")).toBeNull()
    expect(documentLinkError("drive.google.com/file")).not.toBeNull()
    expect(documentLinkError("javascript:alert(1)")).not.toBeNull()
    expect(stepComplete("schedule", review({ documentLink: "not a link" }))).toBe(false)
    expect(resolveStep("review", review({ documentLink: "not a link" }))).toBe("schedule")
  })

  test("unknown step values are ignored", () => {
    expect(parseStep("review")).toBe("review")
    expect(parseStep("pay")).toBeNull()
    expect(parseStep(null)).toBeNull()
  })
})
