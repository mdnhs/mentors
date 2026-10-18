import { expect, test, type Page } from "@playwright/test"

import { signedIn } from "./helpers"

test.beforeEach(async ({ page }) => {
  await signedIn(page)
})

const offersPanel = (page: Page) => page.locator("#offers")
async function selectOffer(page: Page, title: string) {
  await offersPanel(page).locator("label").filter({ hasText: title }).click()
  await expect(offersPanel(page).getByRole("radio", { name: new RegExp(title) })).toBeChecked()
}

test.describe("offer selection", () => {
  test("each offer type opens its own flow with only its own details", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman")
    const panel = offersPanel(page)

    await selectOffer(page, "System design mock interview")
    await expect(panel).toContainText("1 hr video call")
    await expect(panel).not.toContainText("You send")
    await panel.getByRole("link", { name: /Book session · ৳3,000/ }).click()
    await expect(page).toHaveURL(/\/mentors\/tanvir-rahman\/book\?offer=tanvir-mock$/)
    await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible()

    await page.goto("/mentors/tanvir-rahman")
    await selectOffer(page, "Resume & LinkedIn review")
    await expect(panel).toContainText("You send: CV as PDF or Google Doc")
    await expect(panel).not.toContainText("video call")
    await panel.getByRole("link", { name: /Request review/ }).click()
    await expect(page.getByRole("heading", { name: "What should Tanvir review?" })).toBeVisible()

    await page.goto("/mentors/tanvir-rahman")
    await selectOffer(page, "System Design Essentials")
    await expect(panel).toContainText("seats left")
    await panel.getByRole("link", { name: /Reserve a seat/ }).click()
    await expect(page).toHaveURL(/\/sessions\/system-design-essentials$/)
  })

  test("a recurring mentorship shows its package terms and books its first call", async ({ page }) => {
    await page.goto("/mentors/nusrat-jahan")
    await selectOffer(page, "Monthly AI mentorship")
    const panel = offersPanel(page)
    await expect(panel).toContainText("4 calls a month, 45 min each")
    await expect(panel).toContainText("2 mentee spots open")
    await expect(panel).toContainText("Cancel any time before your next month starts")
    await panel.getByRole("link", { name: /Start mentorship · ৳5,000 \/ month/ }).click()
    await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible()
  })
})

test.describe("unavailable and unpublished offers", () => {
  test("draft offers never appear and their links fall back safely", async ({ page }) => {
    await page.goto("/mentors/farhan-kabir")
    await expect(offersPanel(page)).not.toContainText("Monthly interview coaching")

    await page.goto("/mentors/farhan-kabir/book?offer=farhan-coaching")
    await expect(page.getByRole("status")).toContainText("That offer isn't available")
    await expect(page.locator("main")).not.toContainText("Monthly interview coaching")
  })

  test("unknown offer ids show a notice instead of booking something else silently", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman/book?offer=not-a-real-offer")
    await expect(page.getByRole("status")).toContainText("That offer isn't available")
    await expect(page.getByRole("heading", { name: "Choose a session" })).toBeVisible()
  })

  test("a full mentorship can be read about but not booked", async ({ page }) => {
    await page.goto("/mentors/shafiq-uddin")
    await selectOffer(page, "Monthly mentorship")
    await expect(offersPanel(page).getByRole("button", { name: "Not available" })).toBeDisabled()
    await expect(offersPanel(page)).toContainText("No mentee spots are open right now.")
    await expect(offersPanel(page).getByRole("link", { name: /Start mentorship/ })).toHaveCount(0)

    await page.goto("/mentors/shafiq-uddin/book?offer=shafiq-monthly")
    await expect(page.getByRole("status")).toContainText("Monthly mentorship isn't available")
    await expect(page.getByRole("radio", { name: /Monthly mentorship/ })).toHaveCount(0)
  })

  test("group offers requested on the booking page point to the session sign-up", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman/book?offer=tanvir-group")
    const notice = page.getByRole("status")
    await expect(notice).toContainText("is a group session")
    await notice.getByRole("link", { name: "Reserve a seat" }).click()
    await expect(page).toHaveURL(/\/sessions\/system-design-essentials$/)
  })
})

test.describe("missing data", () => {
  test("a mentor with no photo, links, reviews or active offers still has a complete profile", async ({ page }) => {
    await page.goto("/mentors/tahmina-sultana")
    await expect(page.getByRole("heading", { level: 1, name: "Tahmina Sultana" })).toBeVisible()
    await expect(page.getByRole("img", { name: "Portrait of Tahmina Sultana" })).toContainText("TS")
    await expect(page.getByRole("link", { name: "ID checked" })).toBeVisible()
    await expect(page.getByText("Education not checked yet")).toBeVisible()
    await expect(offersPanel(page)).toContainText("Tahmina isn't taking bookings right now")
    await expect(page.getByText("No reviews yet.")).toBeVisible()
    await expect(page.getByRole("link", { name: /opens in a new tab/ })).toHaveCount(0)

    await page.mouse.wheel(0, 4000)
    await expect(page.locator("[data-mobile-bar]")).toHaveCount(0)

    await page.goto("/mentors/tahmina-sultana/book")
    await expect(page.getByRole("heading", { name: "Tahmina isn't taking bookings right now" })).toBeVisible()
  })

  test("a broken portrait falls back to initials", async ({ page }) => {
    await page.route(/tanvir-rahman\.jpg/, (route) => route.fulfill({ status: 404 }))
    await page.goto("/mentors/tanvir-rahman")
    await expect(page.getByRole("img", { name: "Portrait of Tanvir Rahman" })).toContainText("TR")
  })

  test("mentors who can't be booked are left out of discovery", async ({ page }) => {
    await page.goto("/mentors?q=Tahmina")
    await expect(page.getByRole("heading", { name: "No mentors match" })).toBeVisible()
  })
})

test.describe("profile details", () => {
  test("verification, links and reviews say only what the data supports", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman")
    await expect(page.getByRole("link", { name: "ID, education and employment checked, expertise reviewed" })).toBeVisible()
    await expect(page.getByText(/aren.t an endorsement by any employer or university/)).toBeVisible()
    await expect(page.getByText("Mentoring not checked yet")).toBeVisible()
    const website = page.getByRole("link", { name: /Website/ })
    await expect(website).toHaveAttribute("href", "https://example.com/tanvir-rahman")
    await expect(website).toHaveAttribute("rel", /noopener/)
    await expect(page.getByText("Only learners who completed a booking can leave a review.")).toBeVisible()
    await expect(page.locator("section[aria-labelledby=reviews] li")).toHaveCount(3)
  })

  test("reviews show a star breakdown and can be filtered by session type", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman")
    const reviews = page.locator("section[aria-labelledby=reviews]")
    const breakdown = reviews.getByRole("group", { name: "Rating breakdown" })
    await expect(breakdown).toContainText("5 stars")
    await expect(breakdown).toContainText("2 reviews")

    const filters = reviews.getByRole("group", { name: "Filter reviews by session type" })
    await filters.getByRole("button", { name: "Expert review" }).click()
    await expect(reviews.getByRole("list", { name: "Reviews" }).getByRole("listitem")).toHaveCount(1)
    await filters.getByRole("button", { name: "All" }).click()
    await expect(reviews.getByRole("list", { name: "Reviews" }).getByRole("listitem")).toHaveCount(3)
  })

  test("the offer panel shows the rating next to the booking button", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman")
    await expect(offersPanel(page).getByRole("link", { name: /3 reviews/ })).toHaveAttribute("href", "#reviews")
  })

  test("sharing copies the profile link when the share sheet isn't available", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions")
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined }))
    await page.goto("/mentors/tanvir-rahman")
    await page.getByRole("button", { name: "Share" }).click()
    await expect(page.getByText("Link copied")).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/mentors\/tanvir-rahman$/)
  })

  test("profiles carry per-mentor metadata and structured data", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman")
    await expect(page).toHaveTitle(/Tanvir Rahman/)
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", /\/mentors\/tanvir-rahman$/)
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute("content", /tanvir-rahman/)
    const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}")
    const types = jsonLd["@graph"].map((node: { "@type": string }) => node["@type"])
    expect(types).toEqual(["Person", "Service"])
    expect(jsonLd["@graph"][1].aggregateRating.reviewCount).toBe(3)
  })

  test("saving a mentor persists across reloads and shows on the dashboard", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman")
    const save = page.getByRole("button", { name: "Save Tanvir Rahman" })
    await expect(save).toHaveAttribute("aria-pressed", "false")
    await save.click()
    await expect(save).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText("Saved Tanvir Rahman")).toBeVisible()
    await page.reload()
    await expect(save).toHaveAttribute("aria-pressed", "true")
    await page.goto("/dashboard")
    await expect(page.locator("section[aria-labelledby=saved]")).toContainText("Tanvir Rahman")
  })
})

test.describe("responsive layout", () => {
  test("the booking panel sits beside the profile on desktop and stays in view", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop layout")
    await page.goto("/mentors/tanvir-rahman")
    const header = await page.getByRole("heading", { level: 1 }).boundingBox()
    const panel = await offersPanel(page).boundingBox()
    expect(panel!.x).toBeGreaterThan(header!.x + header!.width)
    await page.mouse.wheel(0, 1200)
    await expect(offersPanel(page)).toBeInViewport()
    await expect(page.locator("[data-mobile-bar]")).toBeHidden()
  })

  test("on mobile the offers come right after the header and the sticky CTA never covers content", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile layout")
    await page.goto("/mentors/tanvir-rahman")
    const panel = await offersPanel(page).boundingBox()
    const about = await page.getByRole("heading", { name: "About" }).boundingBox()
    expect(panel!.y).toBeLessThan(about!.y)

    await expect(page.locator("[data-mobile-bar]")).toHaveCount(0)
    await page.getByRole("heading", { name: "Reviews" }).scrollIntoViewIfNeeded()
    const bar = page.locator("[data-mobile-bar]")
    await expect(bar).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const barBox = await bar.boundingBox()
    const lastLink = await page.locator("footer a").last().boundingBox()
    expect(lastLink!.y + lastLink!.height).toBeLessThanOrEqual(barBox!.y)

    await bar.getByRole("link", { name: "Book Tanvir" }).click()
    await expect(offersPanel(page)).toBeInViewport()
  })

  test("no horizontal scrolling on profile and booking pages", async ({ page }) => {
    for (const path of ["/mentors/tanvir-rahman", "/mentors/tahmina-sultana", "/mentors/shafiq-uddin/book?offer=shafiq-monthly"]) {
      await page.goto(path)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, path).toBeLessThanOrEqual(0)
    }
  })
})
