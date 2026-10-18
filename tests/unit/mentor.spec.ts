import { expect, test } from "@playwright/test"

import { addDayOff, availabilityEqual, validateAvailability } from "@/lib/availability-settings"
import { deliverReview } from "@/lib/booking-service"
import { getMentor } from "@/lib/data"
import { incomingBookings, incomingOrders } from "@/lib/data/incoming"
import { mentorBookings, mentorTasks, splitMentorBookings } from "@/lib/mentor-dashboard"
import { earningsByMonth, requestPayout, settlePayout, statement, summarize, type FinanceData, type Payout } from "@/lib/mentor-finance"
import { draftsEqual, draftToOffer, draftToSession, emptyDraft, manageOffers, offerToDraft, validateDraft, type OfferDraft } from "@/lib/offer-management"
import { advance, withRefund } from "@/lib/orders"
import { cancelWithRefund } from "@/lib/payment-service"
import { actorFor, DEMO_MENTOR_SLUG } from "@/lib/permissions"
import type { Offer } from "@/lib/types"

const NOW = new Date("2026-10-18T06:00:00Z")
const mentorActor = actorFor("mentor")
const learnerActor = actorFor("learner")
const catalog = getMentor(DEMO_MENTOR_SLUG)!.offers

const goodDraft = (overrides: Partial<OfferDraft> = {}): OfferDraft => ({
  ...emptyDraft("one-on-one"),
  title: "Portfolio review call",
  description: "A focused call on your portfolio with concrete next steps.",
  price: "1500",
  durationMinutes: "45",
  includes: "Portfolio walkthrough\nWritten action list",
  ...overrides,
})

const create = (offers: Offer[], draft: OfferDraft, id = "new-offer") => manageOffers(mentorActor, DEMO_MENTOR_SLUG, offers, { kind: "create", draft, id })

test.describe("offer validation", () => {
  test("a complete draft passes", () => {
    expect(validateDraft(goodDraft())).toEqual({})
  })

  test("rejects invalid prices", () => {
    for (const price of ["", "abc", "0", "49", "100001", "12.5", "-100", "1e3", "1,500", " "]) {
      expect(validateDraft(goodDraft({ price })).price, `price "${price}"`).toBeTruthy()
    }
    for (const price of ["50", "1500", "100000"]) expect(validateDraft(goodDraft({ price })).price, price).toBeUndefined()
  })

  test("checks title, description, deliverables and duration", () => {
    expect(validateDraft(goodDraft({ title: "Hi" })).title).toBeTruthy()
    expect(validateDraft(goodDraft({ title: "x".repeat(81) })).title).toBeTruthy()
    expect(validateDraft(goodDraft({ description: "short" })).description).toBeTruthy()
    expect(validateDraft(goodDraft({ includes: "  \n " })).includes).toBeTruthy()
    expect(validateDraft(goodDraft({ includes: "a\nb\nc\nd\ne\nf\ng" })).includes).toBeTruthy()
    expect(validateDraft(goodDraft({ durationMinutes: "10" })).durationMinutes).toBeTruthy()
    expect(validateDraft(goodDraft({ durationMinutes: "181" })).durationMinutes).toBeTruthy()
    expect(validateDraft(goodDraft({ durationMinutes: "45.5" })).durationMinutes).toBeTruthy()
  })

  test("expert reviews need deliverables, a turnaround and what the learner sends", () => {
    const review = goodDraft({ type: "review", durationMinutes: "", deliveryDays: "5", learnerProvides: "Your CV as a PDF" })
    expect(validateDraft(review)).toEqual({})
    expect(validateDraft({ ...review, deliveryDays: "0" }).deliveryDays).toBeTruthy()
    expect(validateDraft({ ...review, deliveryDays: "15" }).deliveryDays).toBeTruthy()
    expect(validateDraft({ ...review, learnerProvides: "" }).learnerProvides).toBeTruthy()
    expect(validateDraft({ ...review, includes: "" }).includes).toContain("deliverable")
  })

  test("mentorships need sensible calls and spots", () => {
    const mentorship = goodDraft({ type: "mentorship" })
    expect(validateDraft(mentorship)).toEqual({})
    expect(validateDraft({ ...mentorship, sessionsPerMonth: "9" }).sessionsPerMonth).toBeTruthy()
    expect(validateDraft({ ...mentorship, openSpots: "-1" }).openSpots).toBeTruthy()
  })

  test("group capacity can't drop below seats already taken", () => {
    const group = goodDraft({ type: "group", capacity: "30" })
    expect(validateDraft(group, { minCapacity: 22 }).capacity).toBeUndefined()
    expect(validateDraft({ ...group, capacity: "21" }, { minCapacity: 22 }).capacity).toContain("22")
    expect(validateDraft({ ...group, capacity: "0" }).capacity).toBeTruthy()
    expect(validateDraft({ ...group, capacity: "501" }).capacity).toBeTruthy()
    expect(validateDraft({ ...group, capacity: "ten" }).capacity).toBeTruthy()
  })
})

test.describe("managing offers", () => {
  test("a new offer starts as a draft and is added to the list", () => {
    const result = create(catalog, goodDraft())
    expect(result.ok && result.offer).toMatchObject({ id: "new-offer", status: "draft", price: 1500, type: "one-on-one", cancellation: "flexible" })
    expect(result.ok && result.offers).toHaveLength(catalog.length + 1)
  })

  test("an invalid draft is refused with field errors and changes nothing", () => {
    const result = create(catalog, goodDraft({ price: "abc", title: "" }))
    expect(result).toMatchObject({ ok: false, code: "invalid", errors: { price: expect.any(String), title: expect.any(String) } })
  })

  test("a group offer needs a start time in the future", () => {
    const group = goodDraft({ type: "group", language: "English" })
    expect(create(catalog, group)).toMatchObject({ ok: false, code: "invalid", errors: { startsAt: expect.any(String) } })
    const past = manageOffers(mentorActor, DEMO_MENTOR_SLUG, catalog, { kind: "create", draft: { ...group, startsAt: "2026-01-01T10:00" }, id: "g" }, { now: new Date("2026-06-01T00:00:00Z") })
    expect(past).toMatchObject({ ok: false, errors: { startsAt: "Pick a time in the future" } })
  })

  test("a valid group offer is created as a draft linked to its own session", () => {
    const draft = goodDraft({ type: "group", startsAt: "2099-01-01T19:00", language: "English", capacity: "25" })
    const result = create(catalog, draft, "g-new")
    expect(result.ok && result.offer).toMatchObject({ type: "group", status: "draft", sessionId: "g-new" })
    const session = draftToSession(draft, "g-new", getMentor(DEMO_MENTOR_SLUG)!)
    expect(session).toMatchObject({ id: "g-new", mentorSlug: DEMO_MENTOR_SLUG, startsAt: "2099-01-01T19:00:00+06:00", seats: { total: 25, taken: 0 } })
  })

  test("duplicate ids are refused", () => {
    const once = create(catalog, goodDraft())
    expect(once.ok && create(once.offers, goodDraft())).toMatchObject({ ok: false, code: "duplicate" })
  })

  test("editing keeps the id, type and status, and rejects bad values", () => {
    const published = catalog.find((offer) => offer.status === "published" && offer.type === "one-on-one")!
    const edited = manageOffers(mentorActor, DEMO_MENTOR_SLUG, catalog, { kind: "update", id: published.id, draft: { ...offerToDraft(published), title: "Renamed call", price: "2500", type: "review" } })
    expect(edited.ok && edited.offer).toMatchObject({ id: published.id, type: "one-on-one", status: "published", title: "Renamed call", price: 2500 })
    const bad = manageOffers(mentorActor, DEMO_MENTOR_SLUG, catalog, { kind: "update", id: published.id, draft: { ...offerToDraft(published), price: "-5" } })
    expect(bad).toMatchObject({ ok: false, code: "invalid" })
  })

  test("a group offer's price comes from its session and can't be edited", () => {
    const group = catalog.find((offer) => offer.type === "group")!
    const edited = manageOffers(mentorActor, DEMO_MENTOR_SLUG, catalog, { kind: "update", id: group.id, draft: { ...offerToDraft(group, 30), price: "99999" } })
    expect(edited.ok && edited.offer.price).toBe(group.price)
  })

  test("offers are built from known fields only, so a commission can't be smuggled in", () => {
    const rogue = { ...goodDraft(), commission: "0", platformFee: "0", mentorEarnings: "999999" } as OfferDraft
    const offer = draftToOffer(rogue, "x", "draft")
    expect(Object.keys(offer)).not.toEqual(expect.arrayContaining(["commission"]))
    expect(Object.keys(offer)).not.toEqual(expect.arrayContaining(["platformFee"]))
    expect(JSON.stringify(offer)).not.toContain("999999")
  })

  test("publish, pause, resume and archive follow the allowed moves", () => {
    let offers = (create(catalog, goodDraft()) as { offers: Offer[] }).offers
    const move = (status: "published" | "paused" | "archived" | "draft") => {
      const result = manageOffers(mentorActor, DEMO_MENTOR_SLUG, offers, { kind: "status", id: "new-offer", status })
      if (result.ok) offers = result.offers
      return result
    }
    expect(move("paused")).toMatchObject({ ok: false, code: "invalid-transition" })
    expect(move("published")).toMatchObject({ ok: true, offer: { status: "published" } })
    expect(move("draft")).toMatchObject({ ok: false, code: "invalid-transition" })
    expect(move("paused")).toMatchObject({ ok: true, offer: { status: "paused" } })
    expect(move("published")).toMatchObject({ ok: true })
    expect(move("archived")).toMatchObject({ ok: true })
    expect(move("published")).toMatchObject({ ok: false, code: "invalid-transition" })
    expect(manageOffers(mentorActor, DEMO_MENTOR_SLUG, offers, { kind: "update", id: "new-offer", draft: goodDraft() })).toMatchObject({ ok: false, code: "invalid-transition" })
    expect(move("draft")).toMatchObject({ ok: true, offer: { status: "draft" } })
  })

  test("an offer with incomplete details can't be published", () => {
    const broken = [{ ...catalog[0], id: "broken", status: "draft", price: 0 } as Offer]
    expect(manageOffers(mentorActor, DEMO_MENTOR_SLUG, broken, { kind: "status", id: "broken", status: "published" })).toMatchObject({ ok: false, code: "invalid", errors: { price: expect.any(String) } })
  })

  test("unknown offers are not found", () => {
    expect(manageOffers(mentorActor, DEMO_MENTOR_SLUG, catalog, { kind: "status", id: "ghost", status: "paused" })).toMatchObject({ ok: false, code: "not-found" })
  })

  test("only the mentor who owns the offers can change them", () => {
    const changes = [
      { kind: "create", draft: goodDraft(), id: "x" },
      { kind: "update", id: catalog[0].id, draft: offerToDraft(catalog[0]) },
      { kind: "status", id: catalog[0].id, status: "paused" },
    ] as const
    for (const change of changes) {
      expect(manageOffers(learnerActor, DEMO_MENTOR_SLUG, catalog, change)).toMatchObject({ ok: false, code: "forbidden" })
      expect(manageOffers(null, DEMO_MENTOR_SLUG, catalog, change)).toMatchObject({ ok: false, code: "forbidden" })
      expect(manageOffers(mentorActor, "someone-else", catalog, change)).toMatchObject({ ok: false, code: "forbidden" })
    }
  })
})

test.describe("availability settings", () => {
  const base = { days: [1, 3], times: ["19:00", "20:00"], bufferMinutes: 15, minNoticeHours: 24, maxAdvanceDays: 30 }

  test("accepts a sensible schedule", () => {
    expect(validateAvailability(base)).toEqual({})
  })

  test("rejects impossible days, times and limits", () => {
    expect(validateAvailability({ ...base, days: [7] }).days).toBeTruthy()
    expect(validateAvailability({ ...base, days: [1, 1] }).days).toBeTruthy()
    expect(validateAvailability({ ...base, times: ["19:30"] }).times).toBeTruthy()
    expect(validateAvailability({ ...base, bufferMinutes: 90 }).bufferMinutes).toBeTruthy()
    expect(validateAvailability({ ...base, minNoticeHours: -1 }).minNoticeHours).toBeTruthy()
    expect(validateAvailability({ ...base, maxAdvanceDays: 0 }).maxAdvanceDays).toBeTruthy()
    expect(validateAvailability({ ...base, unavailableDates: ["2026-02-30"] }).unavailableDates).toBeTruthy()
  })
})

const data = (payouts: Payout[] = []): FinanceData => ({ orders: incomingOrders, bookings: incomingBookings, payouts })
let counter = 0
const payoutId = () => `PO-${++counter}`

test.describe("earnings and payouts", () => {
  test("derives gross value, commission and earnings from transaction records", () => {
    const summary = summarize(data(), DEMO_MENTOR_SLUG, NOW)
    expect(summary).toMatchObject({ grossBookingValue: 8400, platformFee: 400, commission: 800, estimatedEarnings: 7200, refunded: 0, paidOut: 0, pendingPayouts: 0, completedBookings: 2 })
    expect(summary.grossBookingValue).toBe(summary.platformFee + summary.commission + summary.estimatedEarnings)
  })

  test("earnings are separate from payouts: only completed sessions are available, and nothing is paid out", () => {
    const summary = summarize(data(), DEMO_MENTOR_SLUG, NOW)
    expect(summary.availableForPayout).toBe(4500)
    expect(summary.paidOut).toBe(0)
    expect(summary.estimatedEarnings).toBeGreaterThan(summary.availableForPayout)
  })

  test("another mentor sees none of these orders", () => {
    expect(summarize(data(), "nusrat-jahan", NOW)).toMatchObject({ grossBookingValue: 0, estimatedEarnings: 0, availableForPayout: 0 })
  })

  test("a refund lowers gross value, commission and earnings together, and stays in the statement", () => {
    const [first, ...rest] = incomingOrders
    const refunded = advance(withRefund(advance(first, "refund-pending", NOW), 100), "refunded", NOW)
    const settled = { ...refunded, transactions: [...refunded.transactions, { id: "r1", kind: "refund" as const, amount: first.quote.total, currency: "BDT", status: "succeeded" as const, eventId: "e", at: "2026-10-16T00:00:00Z", simulated: true }] }
    const orders = [settled, ...rest]
    const summary = summarize({ ...data(), orders }, DEMO_MENTOR_SLUG, NOW)
    expect(summary.refunded).toBe(first.quote.total)
    expect(summary.estimatedEarnings).toBe(7200 - 2700)
    expect(summary.commission).toBe(800 - 300)
    expect(summary.availableForPayout).toBe(4500 - 2700)
    const line = statement({ orders, payouts: [] }, DEMO_MENTOR_SLUG).find((item) => item.kind === "refund")!
    expect(line).toMatchObject({ amount: -first.quote.total, earningsEffect: -2700 })
  })

  test("requesting a payout holds the money as pending until it is settled", () => {
    const requested = requestPayout(mentorActor, DEMO_MENTOR_SLUG, data(), { id: payoutId(), amount: 2000 }, NOW)
    if (!requested.ok) throw new Error(requested.message)
    expect(requested.payout).toMatchObject({ status: "pending", amount: 2000, simulated: true })
    const pending = summarize(data(requested.payouts), DEMO_MENTOR_SLUG, NOW)
    expect(pending).toMatchObject({ pendingPayouts: 2000, paidOut: 0, availableForPayout: 2500 })

    const settled = settlePayout(mentorActor, DEMO_MENTOR_SLUG, requested.payouts, requested.payout.id, NOW)
    if (!settled.ok) throw new Error(settled.message)
    expect(settled.payout).toMatchObject({ status: "paid", paidAt: NOW.toISOString() })
    expect(summarize(data(settled.payouts), DEMO_MENTOR_SLUG, NOW)).toMatchObject({ pendingPayouts: 0, paidOut: 2000, availableForPayout: 2500 })
  })

  test("a payout defaults to the whole available balance, never more", () => {
    const all = requestPayout(mentorActor, DEMO_MENTOR_SLUG, data(), { id: payoutId() }, NOW)
    expect(all.ok && all.payout.amount).toBe(4500)
    expect(requestPayout(mentorActor, DEMO_MENTOR_SLUG, data(), { id: payoutId(), amount: 4501 }, NOW)).toMatchObject({ ok: false, code: "insufficient" })
    const twice = all.ok ? requestPayout(mentorActor, DEMO_MENTOR_SLUG, data(all.payouts), { id: payoutId() }, NOW) : null
    expect(twice).toMatchObject({ ok: false, code: "invalid-amount" })
  })

  test("invalid payout amounts are refused", () => {
    for (const amount of [0, -10, 499, 1000.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(requestPayout(mentorActor, DEMO_MENTOR_SLUG, data(), { id: payoutId(), amount }, NOW), String(amount)).toMatchObject({ ok: false, code: "invalid-amount" })
    }
  })

  test("a paid payout can't be settled again, and an unknown one isn't found", () => {
    const requested = requestPayout(mentorActor, DEMO_MENTOR_SLUG, data(), { id: payoutId(), amount: 1000 }, NOW)
    if (!requested.ok) throw new Error("setup")
    const paid = settlePayout(mentorActor, DEMO_MENTOR_SLUG, requested.payouts, requested.payout.id, NOW)
    if (!paid.ok) throw new Error("setup")
    expect(settlePayout(mentorActor, DEMO_MENTOR_SLUG, paid.payouts, requested.payout.id, NOW)).toMatchObject({ ok: false, code: "invalid-state" })
    expect(settlePayout(mentorActor, DEMO_MENTOR_SLUG, paid.payouts, "ghost", NOW)).toMatchObject({ ok: false, code: "not-found" })
  })

  test("learners and other mentors can't request or settle payouts", () => {
    for (const actor of [learnerActor, null, { role: "mentor" as const, mentorSlug: "nusrat-jahan" }]) {
      expect(requestPayout(actor, DEMO_MENTOR_SLUG, data(), { id: payoutId(), amount: 1000 }, NOW)).toMatchObject({ ok: false, code: "forbidden" })
      expect(settlePayout(actor, DEMO_MENTOR_SLUG, [], "x", NOW)).toMatchObject({ ok: false, code: "forbidden" })
    }
  })

  test("the statement lists charges and payouts newest first and can be recomputed", () => {
    const requested = requestPayout(mentorActor, DEMO_MENTOR_SLUG, data(), { id: payoutId(), amount: 1000 }, NOW)
    if (!requested.ok) throw new Error("setup")
    const lines = statement({ orders: incomingOrders, payouts: requested.payouts }, DEMO_MENTOR_SLUG)
    expect(lines.map((line) => line.kind)).toEqual(["payout-requested", "charge", "charge", "charge"])
    expect(lines).toEqual(statement({ orders: incomingOrders, payouts: requested.payouts }, DEMO_MENTOR_SLUG))
    const charges = lines.filter((line) => line.kind === "charge")
    expect(charges.reduce((total, line) => total + line.earningsEffect, 0)).toBe(7200)
    expect(lines.find((line) => line.kind === "payout-requested")!.earningsEffect).toBe(0)
  })

  test("the sample orders are flagged as sample and simulated", () => {
    for (const order of incomingOrders) {
      expect(order.sample).toBe(true)
      expect(order.transactions.every((item) => item.simulated)).toBe(true)
    }
    expect(incomingBookings.every((booking) => booking.sample && booking.learnerName)).toBe(true)
  })
})

test.describe("mentor cancelling a booking", () => {
  const commerce = { bookings: incomingBookings, orders: incomingOrders, cancelledSessions: {}, sessionCapacity: {} }

  test("refunds the learner in full whatever the policy window says", () => {
    const result = cancelWithRefund(commerce, "ib-3", new Date("2026-10-26T11:00:00Z"), mentorActor)
    expect(result.outcome).toMatchObject({ ok: true, order: { status: "refund-pending", refundPercent: 100 } })
    expect(result.bookings.find((item) => item.id === "ib-3")).toMatchObject({ status: "cancelled", refundPercent: 100 })
  })

  test("a learner or another mentor can't cancel it", () => {
    for (const actor of [learnerActor, null, { role: "mentor" as const, mentorSlug: "nusrat-jahan" }]) {
      expect(cancelWithRefund(commerce, "ib-3", NOW, actor).outcome).toMatchObject({ ok: false, code: "not-allowed" })
    }
  })
})

test.describe("mentor workspace logic", () => {
  const own = { bookings: [], orders: [] }
  const incoming = { bookings: incomingBookings, orders: incomingOrders }
  const items = mentorBookings(own, incoming, DEMO_MENTOR_SLUG, "Rafi Ahmed")
  const live = (overrides = {}) => ({ bookings: items, offers: catalog.filter((offer) => offer.status === "published"), availability: getMentor(DEMO_MENTOR_SLUG)!.availability, summary: summarize(data(), DEMO_MENTOR_SLUG, NOW), mentorTimezone: getMentor(DEMO_MENTOR_SLUG)!.timezone, ...overrides })

  test("bookings carry the learner's name and where they came from", () => {
    expect(items.map((item) => item.learner)).toEqual(["Anika Rahman", "Imtiaz Hossain", "Nabila Karim"])
    expect(mentorBookings(own, incoming, "nusrat-jahan", "Rafi")).toEqual([])
  })

  test("splits upcoming, completed and closed bookings", () => {
    const split = splitMentorBookings(items, NOW)
    expect(split.upcoming.map((item) => item.booking.id)).toEqual(["ib-3"])
    expect(split.completed.map((item) => item.booking.id)).toEqual(["ib-2", "ib-1"])
    expect(split.closed).toEqual([])
  })

  test("the first task is a session within a day, with the learner's goals", () => {
    const soon = new Date("2026-10-26T01:00:00Z")
    const tasks = mentorTasks(live(), soon)
    expect(tasks[0]).toMatchObject({ id: "prep-ib-3", title: "Get ready for System design mock interview" })
    expect(tasks[0].detail).toContain("Nabila Karim")
    expect(tasks[0].detail).toContain("payments service")
  })

  test("the next-up task shows the time in the mentor's timezone, labelled", () => {
    const tasks = mentorTasks(live(), NOW)
    const next = tasks.find((task) => task.id === "next-ib-3")!
    // ib-3 starts at 20:00 in Singapore, which is 18:00 in the learner's Dhaka timezone.
    expect(next.detail).toContain("8:00")
    expect(next.detail).not.toContain("6:00")
    expect(next.detail).toContain("Singapore")
  })

  test("a delivered review becomes payable; one still in review does not", () => {
    const review = { ...incomingBookings[2], id: "rv-1", kind: "review" as const, status: "in-review" as const, durationMinutes: undefined }
    const order = { ...incomingOrders[2], id: "ORD-RV-1", bookingId: "rv-1" }
    const before = summarize({ orders: [order], bookings: [review], payouts: [] }, DEMO_MENTOR_SLUG, NOW)
    expect(before.availableForPayout).toBe(0)
    const delivered = deliverReview([review], "rv-1", mentorActor)
    const after = summarize({ orders: [order], bookings: delivered.bookings, payouts: [] }, DEMO_MENTOR_SLUG, NOW)
    expect(after.availableForPayout).toBeGreaterThan(0)
    expect(after.completedBookings).toBe(1)
  })

  test("a payout is suggested when there is a balance and none pending", () => {
    expect(mentorTasks(live(), NOW).some((task) => task.id === "payout")).toBe(true)
    const pending = { ...summarize(data(), DEMO_MENTOR_SLUG, NOW), pendingPayouts: 1000 }
    expect(mentorTasks(live({ summary: pending }), NOW).some((task) => task.id === "payout")).toBe(false)
  })

  test("drafts and setup gaps become tasks", () => {
    const draft = { ...catalog[0], id: "d1", status: "draft" } as Offer
    expect(mentorTasks(live({ offers: [draft] }), NOW).map((task) => task.id)).toEqual(expect.arrayContaining(["draft-d1", "no-live"]))
    const empty = { days: [], times: [] }
    expect(mentorTasks(live({ availability: empty }), NOW).some((task) => task.id === "no-times")).toBe(true)
  })

  test("a mentor with nothing to do gets no tasks", () => {
    const quiet = live({ bookings: [], summary: { ...summarize(data(), DEMO_MENTOR_SLUG, NOW), availableForPayout: 0 } })
    expect(mentorTasks(quiet, NOW)).toEqual([])
  })
})

test.describe("availability editor helpers", () => {
  const base = { days: [1, 3], times: ["09:00", "18:00"], bufferMinutes: 15, minNoticeHours: 24, maxAdvanceDays: 30, unavailableDates: ["2026-12-25"] }

  test("compares availability regardless of order and default values", () => {
    expect(availabilityEqual(base, { ...base, days: [3, 1], times: ["18:00", "09:00"] })).toBe(true)
    expect(availabilityEqual({ days: [1], times: ["09:00"] }, { days: [1], times: ["09:00"], bufferMinutes: 15, minNoticeHours: 24, maxAdvanceDays: 30, unavailableDates: [] })).toBe(true)
    expect(availabilityEqual(base, { ...base, minNoticeHours: 12 })).toBe(false)
    expect(availabilityEqual(base, { ...base, unavailableDates: [] })).toBe(false)
    expect(availabilityEqual(base, { ...base, bufferMinutes: Number.NaN })).toBe(false)
  })

  test("adds a day off only when it is real, upcoming and new", () => {
    expect(addDayOff([], "2026-02-30", "2026-10-18")).toEqual({ ok: false, error: "Pick a real date" })
    expect(addDayOff([], "", "2026-10-18")).toEqual({ ok: false, error: "Pick a real date" })
    expect(addDayOff([], "2026-10-17", "2026-10-18")).toEqual({ ok: false, error: "Pick today or a later date" })
    expect(addDayOff(["2026-12-25"], "2026-12-25", "2026-10-18")).toEqual({ ok: false, error: "That day is already off" })
    expect(addDayOff(["2026-12-31"], "2026-10-18", "2026-10-18")).toEqual({ ok: true, dates: ["2026-10-18", "2026-12-31"] })
  })
})

test.describe("offer draft changes", () => {
  test("a draft equals its saved snapshot until a field changes", () => {
    const saved = emptyDraft("one-on-one")
    expect(draftsEqual({ ...saved }, saved)).toBe(true)
    expect(draftsEqual({ ...saved, title: "New title" }, saved)).toBe(false)
    expect(draftsEqual(emptyDraft("mentorship"), saved)).toBe(false)
  })
})

test.describe("earnings over time", () => {
  test("buckets earnings by month and ends with the current month", () => {
    const data = { orders: incomingOrders, payouts: [] }
    const months = earningsByMonth(data, DEMO_MENTOR_SLUG, new Date("2026-10-18T06:00:00Z"))
    expect(months).toHaveLength(6)
    expect(months.map((item) => item.month)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"])
    const total = statement(data, DEMO_MENTOR_SLUG).filter((line) => line.at >= "2026-04-30T18:00:00Z").reduce((sum, line) => sum + line.earningsEffect, 0)
    expect(months.reduce((sum, item) => sum + item.earnings, 0)).toBe(total)
  })

  test("crosses a year boundary", () => {
    expect(earningsByMonth({ orders: [], payouts: [] }, DEMO_MENTOR_SLUG, new Date("2027-02-10T00:00:00Z"), 3).map((item) => item.month)).toEqual(["2026-12", "2027-01", "2027-02"])
  })
})
