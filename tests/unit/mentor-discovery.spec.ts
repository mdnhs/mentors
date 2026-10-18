import { expect, test } from "@playwright/test"

import { getRating } from "@/lib/data"
import { MENTOR_PAGE_SIZE, pageFromParams, pickListedMentors } from "@/lib/mentor-filters"
import { getListedMentors } from "@/lib/offers"

test.describe("featured mentors", () => {
  test("keeps hand-picked listed mentors in order", () => {
    const [first, second] = getListedMentors()
    expect(pickListedMentors([second.slug, first.slug], 2).map((mentor) => mentor.slug)).toEqual([second.slug, first.slug])
  })

  test("replaces unknown or unlisted slugs with the best-rated listed mentors", () => {
    const picked = pickListedMentors(["not-a-mentor", "tahmina-sultana"], 3)
    expect(picked).toHaveLength(3)
    expect(picked.map((mentor) => mentor.slug)).not.toContain("tahmina-sultana")
    const ratings = picked.map((mentor) => getRating(mentor.slug)?.average ?? 0)
    expect([...ratings].sort((a, b) => b - a)).toEqual(ratings)
  })

  test("never returns more mentors than are listed or duplicates", () => {
    const listed = getListedMentors()
    const picked = pickListedMentors([listed[0].slug, listed[0].slug], listed.length + 5)
    expect(new Set(picked).size).toBe(picked.length)
    expect(picked.length).toBeLessThanOrEqual(listed.length)
  })
})

test.describe("result pages", () => {
  test("reads only whole page numbers above one", () => {
    expect(pageFromParams(new URLSearchParams("page=3"))).toBe(3)
    for (const value of ["", "page=0", "page=-2", "page=1.5", "page=abc", "page=1"]) {
      expect(pageFromParams(new URLSearchParams(value)), value).toBe(1)
    }
    expect(MENTOR_PAGE_SIZE).toBeGreaterThan(0)
  })
})
