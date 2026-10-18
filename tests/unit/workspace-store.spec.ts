import { expect, test } from "@playwright/test"

import { getMentor } from "@/lib/data"
import { offerToDraft } from "@/lib/offer-management"
import { cancelBookingWithRefund } from "@/lib/payment-client"
import { actorFor, DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { resetDemoData, saveOffer } from "@/lib/store"
import type { Offer } from "@/lib/types"

// The store persists to localStorage, so give it an in-memory one for these tests.
const memory = new Map<string, string>()
Object.assign(globalThis, {
  window: {
    localStorage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) },
    addEventListener() {},
  },
})

const STORAGE_KEY = "mentorbridge:v1"
const stored = () => JSON.parse(memory.get(STORAGE_KEY) ?? "{}")
const mentor = actorFor("mentor")
const group = getMentor(DEMO_MENTOR_SLUG)!.offers.find((offer): offer is Extract<Offer, { type: "group" }> => offer.type === "group")!

test.describe.configure({ mode: "serial" })

test.beforeEach(() => {
  memory.clear()
  resetDemoData()
})

test.describe("saving a group offer with its seat count", () => {
  const draft = offerToDraft(group, 40)

  test("a rejected offer leaves the seat count unchanged", () => {
    const result = saveOffer(mentor, { kind: "update", id: group.id, draft: { ...draft, title: "Hi" } }, { sessionId: group.sessionId, value: "50" })
    expect(result.ok).toBe(false)
    expect(stored().sessionCapacity).toEqual({})
    expect(stored().workspace.offers).toBeNull()
  })

  test("a rejected seat count leaves the offer unchanged", () => {
    const result = saveOffer(mentor, { kind: "update", id: group.id, draft: { ...draft, title: "Renamed group session" } }, { sessionId: group.sessionId, value: "0" })
    expect(result).toMatchObject({ ok: false, errors: { capacity: expect.any(String) } })
    expect(stored().sessionCapacity).toEqual({})
    expect(stored().workspace.offers).toBeNull()
  })

  test("a valid offer and seat count are saved together", () => {
    const result = saveOffer(mentor, { kind: "update", id: group.id, draft: { ...draft, title: "Renamed group session" } }, { sessionId: group.sessionId, value: "50" })
    expect(result.ok).toBe(true)
    expect(stored().sessionCapacity).toEqual({ [group.sessionId]: 50 })
    expect(stored().workspace.offers.find((offer: Offer) => offer.id === group.id).title).toBe("Renamed group session")
  })
})

test.describe("learner cancellation", () => {
  test("is refused for other signed-in roles and changes nothing", async () => {
    for (const role of ["mentor", "reviewer", "admin"] as const) {
      const outcome = await cancelBookingWithRefund({ role, email: `${role}@example.com` }, "bk-1001")
      expect(outcome).toMatchObject({ ok: false, code: "not-allowed" })
    }
    expect(stored().bookings.find((booking: { id: string }) => booking.id === "bk-1001").status).toBe("confirmed")
  })
})
