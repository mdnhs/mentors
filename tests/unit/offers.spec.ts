import { expect, test } from "@playwright/test"

import { availabilityLabel, eligibleReviews, getMentor, getMentors, getRating, getReviews, getSession } from "@/lib/data"
import { reviews } from "@/lib/data/reviews"
import {
  cancellationTerms,
  getBookableOffers,
  getListedMentors,
  getOfferAvailability,
  getPublishedOffers,
  getStartingPrice,
  offerHref,
  resolveRequestedOffer,
} from "@/lib/offers"
import type { Mentor, Offer, Review } from "@/lib/types"

const mentor = (slug: string) => getMentor(slug)!
const offer = (slug: string, id: string) => mentor(slug).offers.find((item) => item.id === id)!
const withOffer = (base: Mentor, patch: Partial<Offer>, id: string): Mentor => ({
  ...base,
  offers: base.offers.map((item) => (item.id === id ? ({ ...item, ...patch } as Offer) : item)),
})

test.describe("offer data", () => {
  test("every offer defines its own price, scope, terms and type-specific fields", () => {
    const ids = new Set<string>()
    for (const { offers } of getMentors()) {
      for (const item of offers) {
        expect(ids.has(item.id), `duplicate offer id ${item.id}`).toBe(false)
        ids.add(item.id)
        expect(item.price, item.id).toBeGreaterThan(0)
        expect(item.description.length, item.id).toBeGreaterThan(0)
        expect(item.includes.length, item.id).toBeGreaterThan(0)
        expect(cancellationTerms[item.cancellation], item.id).toBeTruthy()
        if (item.type === "review") {
          expect(item.deliveryDays).toBeGreaterThan(0)
          expect(item.learnerProvides.length).toBeGreaterThan(0)
        } else {
          expect(item.durationMinutes).toBeGreaterThan(0)
        }
        if (item.type === "mentorship") expect(item.sessionsPerMonth).toBeGreaterThan(0)
      }
    }
  })

  test("group offers match the session they link to", () => {
    for (const { offers } of getMentors()) {
      for (const item of offers) {
        if (item.type !== "group") continue
        const session = getSession(item.sessionId)
        expect(session, item.id).toBeDefined()
        expect(item.price, item.id).toBe(session!.price)
        expect(item.durationMinutes, item.id).toBe(session!.durationMinutes)
      }
    }
  })
})

test.describe("offer availability", () => {
  test("unpublished offers are never bookable", () => {
    expect(getOfferAvailability(mentor("farhan-kabir"), offer("farhan-kabir", "farhan-coaching")).bookable).toBe(false)
    expect(getOfferAvailability(mentor("tahmina-sultana"), offer("tahmina-sultana", "tahmina-sop")).bookable).toBe(false)
    expect(getPublishedOffers(mentor("farhan-kabir")).map((item) => item.id)).not.toContain("farhan-coaching")
  })

  test("a mentorship with no open spots is shown but not bookable", () => {
    const result = getOfferAvailability(mentor("shafiq-uddin"), offer("shafiq-uddin", "shafiq-monthly"))
    expect(result).toEqual({ bookable: false, reason: "No mentee spots are open right now." })
    expect(getPublishedOffers(mentor("shafiq-uddin")).map((item) => item.id)).toContain("shafiq-monthly")
  })

  test("calls need a weekly schedule; reviews don't", () => {
    const noSchedule = { ...mentor("tanvir-rahman"), availability: { days: [], times: [] } }
    expect(getOfferAvailability(noSchedule, offer("tanvir-rahman", "tanvir-mock")).bookable).toBe(false)
    expect(getOfferAvailability(noSchedule, offer("tanvir-rahman", "tanvir-cv")).bookable).toBe(true)
  })

  test("group sessions close once they start, but only when the clock is known", () => {
    const group = offer("tanvir-rahman", "tanvir-group")
    const startsAt = new Date(getSession("system-design-essentials")!.startsAt)
    expect(getOfferAvailability(mentor("tanvir-rahman"), group, new Date(startsAt.getTime() - 60_000)).bookable).toBe(true)
    expect(getOfferAvailability(mentor("tanvir-rahman"), group, startsAt).bookable).toBe(false)
    expect(getOfferAvailability(mentor("tanvir-rahman"), group).bookable).toBe(true)
  })

  test("a group offer whose session is gone is not bookable", () => {
    const orphaned = withOffer(mentor("tanvir-rahman"), { sessionId: "deleted-session" } as Partial<Offer>, "tanvir-group")
    const result = getOfferAvailability(orphaned, orphaned.offers.find((item) => item.id === "tanvir-group")!)
    expect(result.bookable).toBe(false)
  })
})

test.describe("requested offers", () => {
  const tanvir = mentor("tanvir-rahman")

  test("resolve to the right outcome", () => {
    expect(resolveRequestedOffer(tanvir, null)).toEqual({ kind: "none" })
    expect(resolveRequestedOffer(tanvir, "tanvir-mock")).toMatchObject({ kind: "ok", offer: { id: "tanvir-mock" } })
    expect(resolveRequestedOffer(tanvir, "tanvir-group")).toMatchObject({ kind: "group" })
    expect(resolveRequestedOffer(tanvir, "does-not-exist")).toEqual({ kind: "missing" })
    expect(resolveRequestedOffer(tanvir, "nusrat-roadmap")).toEqual({ kind: "missing" })
    expect(resolveRequestedOffer(mentor("shafiq-uddin"), "shafiq-monthly")).toMatchObject({ kind: "unavailable" })
  })

  test("drafts look exactly like missing offers", () => {
    expect(resolveRequestedOffer(mentor("farhan-kabir"), "farhan-coaching")).toEqual({ kind: "missing" })
  })

  test("each offer type links to its own flow", () => {
    expect(offerHref(tanvir, offer("tanvir-rahman", "tanvir-group"))).toBe("/sessions/system-design-essentials")
    expect(offerHref(tanvir, offer("tanvir-rahman", "tanvir-cv"))).toBe("/mentors/tanvir-rahman/book?offer=tanvir-cv")
  })
})

test.describe("listing and price", () => {
  test("mentors with nothing bookable are not listed and have no price", () => {
    expect(getListedMentors().map((item) => item.slug)).not.toContain("tahmina-sultana")
    expect(getBookableOffers(mentor("tahmina-sultana"))).toHaveLength(0)
    expect(getStartingPrice(mentor("tahmina-sultana"))).toBeNull()
  })

  test("starting price ignores per-seat group prices unless nothing else is bookable", () => {
    expect(getStartingPrice(mentor("tanvir-rahman"))).toBe(1200)
    const groupOnly: Mentor = {
      ...mentor("tanvir-rahman"),
      offers: mentor("tanvir-rahman").offers.map((item) => (item.type === "group" ? item : { ...item, status: "paused" as const })),
    }
    expect(getStartingPrice(groupOnly)).toBe(499)
  })

  test("an empty weekly schedule isn't described as available", () => {
    expect(availabilityLabel(mentor("tahmina-sultana"))).toBe("No open times")
  })
})

test.describe("reviews", () => {
  const base: Review = { id: "x", mentorSlug: "tanvir-rahman", bookingId: "b1", author: "A", authorRole: "R", rating: 5, date: "2026-09-01", text: "t" }

  test("only reviews from the mentor's own completed bookings count", () => {
    const result = eligibleReviews(
      [
        { ...base, id: "ok", bookingId: "done" },
        { ...base, id: "upcoming", bookingId: "soon" },
        { ...base, id: "orphan", bookingId: "missing" },
        { ...base, id: "wrong-mentor", bookingId: "other" },
      ],
      [
        { id: "done", mentorSlug: "tanvir-rahman", kind: "review", status: "completed" },
        { id: "soon", mentorSlug: "tanvir-rahman", kind: "one-on-one", status: "confirmed" },
        { id: "other", mentorSlug: "nusrat-jahan", kind: "one-on-one", status: "completed" },
      ]
    )
    expect(result.map((review) => review.id)).toEqual(["ok"])
    expect(result[0].offerType).toBe("review")
  })

  test("profile reviews and ratings use only eligible reviews", () => {
    for (const { slug } of getMentors()) {
      const shown = getReviews(slug)
      expect(shown.length).toBeLessThanOrEqual(reviews.filter((review) => review.mentorSlug === slug).length)
      expect(getRating(slug)?.count ?? 0).toBe(shown.length)
    }
    expect(getReviews("tahmina-sultana")).toHaveLength(0)
    expect(getRating("tahmina-sultana")).toBeNull()
  })
})
