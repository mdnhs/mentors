import { expect, test, type Page } from "@playwright/test"

import { signedIn } from "./helpers"

const STORAGE_KEY = "mentorbridge:v1"

test.use({ timezoneId: "Asia/Dhaka" })

const setClock = (page: Page, iso: string) => page.clock.setFixedTime(new Date(iso))

test.beforeEach(async ({ page }) => {
  await signedIn(page)
  await setClock(page, "2026-10-18T06:00:00Z")
})

const card = (page: Page, title: string) => page.locator("article").filter({ hasText: title })
const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
const visibleButton = (page: Page, name: string | RegExp) => page.getByRole("button", { name }).locator("visible=true").first()

async function enroll(page: Page, id: string) {
  await page.goto(`/sessions/${id}`)
  await visibleButton(page, /Reserve seat/).click()
  await page.getByRole("dialog").getByRole("button", { name: /^Pay ৳/ }).click()
  await expect(page.getByRole("dialog").getByRole("heading", { name: "You're in!" })).toBeVisible()
}

test.describe("discovery", () => {
  test("lists sessions with mentor, price, seats and one call to action each", async ({ page }) => {
    await page.goto("/sessions")
    const sql = card(page, "SQL & Analytics Interview Prep")
    await expect(sql).toContainText("Farzana")
    await expect(sql).toContainText("৳349")
    await expect(sql).toContainText("21 of 30 seats left")
    await expect(sql.getByRole("link")).toHaveCount(1)
    await expect(sql.getByRole("link")).toContainText("Reserve seat")
  })

  test("shows full, closed and cancelled sessions with their own labels", async ({ page }) => {
    await page.goto("/sessions")
    await expect(card(page, "Resume Teardown Clinic")).toContainText("Full")
    await expect(card(page, "Resume Teardown Clinic").getByRole("link")).toContainText("View details")
    await expect(card(page, "Product Metrics Crash Course")).toContainText("Registration closed")
    await expect(card(page, "Frontend Performance Clinic")).toContainText("Cancelled")
  })

  test("search matches expertise tags and category chips filter the list", async ({ page }) => {
    await page.goto("/sessions")
    await page.getByRole("searchbox", { name: "Search sessions" }).fill("core web vitals")
    await expect(page.locator("article")).toHaveCount(1)
    await expect(page.locator("article")).toContainText("Frontend Performance Clinic")
    await page.getByRole("searchbox", { name: "Search sessions" }).fill("nothing matches this")
    await expect(page.getByText("No sessions found")).toBeVisible()
    await page.getByRole("button", { name: "Show all sessions" }).click()
    await page.getByRole("group", { name: "Category" }).getByRole("button", { name: /Scholarships/ }).click()
    await expect(page.locator("article")).toHaveCount(1)
    await expect(page.locator("article")).toContainText("Finding Funded Master")
  })
})

test.describe("session detail", () => {
  test("shows the essentials: time, price, agenda, host, topics and refund terms", async ({ page }) => {
    await page.goto("/sessions/sql-analytics-interview-prep")
    await expect(page.getByRole("heading", { name: "SQL & Analytics Interview Prep" })).toBeVisible()
    await expect(page.getByText("Registration closes").locator("visible=true").first()).toBeVisible()
    await expect(page.getByRole("list", { name: "Topics covered" })).toContainText("SQL")
    await expect(page.getByRole("heading", { name: "Your host" })).toBeVisible()
    await expect(page.getByText(/Full refund up to 24 hours/).locator("visible=true").first()).toBeVisible()
  })

  test("a full session can't be reserved", async ({ page }) => {
    await page.goto("/sessions/resume-teardown-clinic")
    await expect(visibleButton(page, "Fully booked")).toBeDisabled()
    await expect(page.getByText("This session is full.").locator("visible=true").first()).toBeVisible()
  })

  test("registration that has closed blocks enrollment", async ({ page }) => {
    await page.goto("/sessions/product-metrics-crash-course")
    await expect(visibleButton(page, "Registration closed")).toBeDisabled()
  })

  test("registration closes while the page is open with no way to reserve afterwards", async ({ page }) => {
    await setClock(page, "2026-10-24T08:00:00Z")
    await page.goto("/sessions/breaking-into-global-tech")
    await expect(visibleButton(page, "Registration closed")).toBeDisabled()
  })

  test("a cancelled session explains the refund and has no reserve button", async ({ page }) => {
    await page.goto("/sessions/frontend-performance-clinic")
    await expect(page.getByText("This session was cancelled.").locator("visible=true").first()).toBeVisible()
    await expect(visibleButton(page, "Session cancelled")).toBeDisabled()
    await expect(page.getByRole("button", { name: /Reserve seat/ })).toHaveCount(0)
  })
})

test.describe("enrolling", () => {
  test("pays for a seat, takes one seat, and can't enrol twice", async ({ page }) => {
    await page.goto("/sessions/sql-analytics-interview-prep")
    await expect(page.getByText("21 of 30 seats left").locator("visible=true").first()).toBeVisible()
    await visibleButton(page, /Reserve seat/).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Demo checkout")
    await expect(dialog).toContainText("Total to pay")
    await dialog.getByRole("button", { name: /^Pay ৳/ }).dblclick()
    await expect(dialog.getByRole("heading", { name: "You're in!" })).toBeVisible()
    await page.keyboard.press("Escape")

    await expect(page.getByText("20 of 30 seats left").locator("visible=true").first()).toBeVisible()
    await expect(page.getByRole("link", { name: "View in my sessions" }).locator("visible=true").first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Reserve seat/ })).toHaveCount(0)

    const state = await stored(page)
    expect(state.orders).toHaveLength(1)
    expect(state.bookings.filter((item: { sessionId?: string }) => item.sessionId === "sql-analytics-interview-prep")).toHaveLength(1)

    await page.reload()
    await expect(page.getByText("20 of 30 seats left").locator("visible=true").first()).toBeVisible()
    await page.goto("/sessions")
    await expect(card(page, "SQL & Analytics Interview Prep")).toContainText("You're in")
  })

  test("a failed payment keeps the seat held and lets the learner finish later", async ({ page }) => {
    await page.goto("/sessions/sql-analytics-interview-prep")
    await visibleButton(page, /Reserve seat/).click()
    const dialog = page.getByRole("dialog")
    await dialog.getByText("Payment fails").click()
    await dialog.getByRole("button", { name: /^Pay ৳/ }).click()
    await expect(dialog.getByRole("heading", { name: "Payment didn't go through" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByText("20 of 30 seats left").locator("visible=true").first()).toBeVisible()

    await page.reload()
    await visibleButton(page, "Finish payment").click()
    await page.getByRole("dialog").getByRole("button", { name: /Try again/ }).click()
    await expect(page.getByRole("dialog").getByRole("heading", { name: "You're in!" })).toBeVisible()
  })

  test("enrolled sessions appear in the learner dashboard", async ({ page }) => {
    await enroll(page, "sql-analytics-interview-prep")
    await page.goto("/dashboard/bookings")
    const row = page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "SQL & Analytics Interview Prep" })
    await expect(row).toContainText("Confirmed")
    await expect(row.getByRole("link", { name: "SQL & Analytics Interview Prep" })).toBeVisible()
  })
})

test.describe("attendee-only meeting details", () => {
  test("are hidden from people who haven't enrolled", async ({ page }) => {
    await setClock(page, "2026-11-14T03:55:00Z")
    await page.goto("/sessions/sql-analytics-interview-prep")
    await expect(page.getByText("Session link")).toHaveCount(0)
    await expect(page.locator("a[href*='meet.example.com']")).toHaveCount(0)
  })

  test("stay locked for attendees until 30 minutes before the start, then unlock", async ({ page }) => {
    await page.goto("/sessions/funded-masters-programs")
    await expect(page.getByText(/Session link unlocks 30 minutes before/).locator("visible=true").first()).toBeVisible()
    await expect(page.locator("a[href*='meet.example.com']")).toHaveCount(0)

    await setClock(page, "2026-10-31T11:40:00Z")
    await page.goto("/sessions/funded-masters-programs")
    const link = page.locator("a[href*='meet.example.com']").locator("visible=true").first()
    await expect(link).toHaveAttribute("href", /funded-masters-programs/)
  })

  test("disappear once the session has ended, and the session shows as attended", async ({ page }) => {
    await setClock(page, "2026-11-01T00:00:00Z")
    await page.goto("/sessions/funded-masters-programs")
    await expect(page.locator("a[href*='meet.example.com']")).toHaveCount(0)
    await page.goto("/sessions")
    await page.getByRole("switch", { name: "Show past sessions" }).click()
    await expect(card(page, "Finding Funded Master")).toContainText("Attended")
    await page.goto("/dashboard/bookings")
    await page.getByRole("tab", { name: /Past/ }).click()
    await expect(page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "Finding Funded Master" })).toContainText("Completed")
  })
})

test.describe("cancelling a session", () => {
  test("refunds enrolled learners in full and closes enrollment", async ({ page }) => {
    await signedIn(page, { role: "mentor" })
    await enroll(page, "system-design-essentials")
    await page.goto("/dashboard/mentor/bookings")
    await page.getByRole("tab", { name: /Group sessions/ }).click()
    const sessionRow = page.getByRole("tabpanel", { name: /Group sessions/ }).getByRole("listitem").filter({ hasText: "System Design Essentials" })
    await sessionRow.getByRole("button", { name: "Cancel session" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel for everyone" }).click()
    await expect(sessionRow).toContainText("Cancelled")

    const state = await stored(page)
    expect(state.orders[0].status).toBe("refunded")
    expect(state.orders[0].refundAmount).toBe(state.orders[0].quote.total)
    expect(state.orders[0].transactions.map((item: { kind: string }) => item.kind)).toEqual(["charge", "refund"])

    await page.goto("/sessions/system-design-essentials")
    await expect(page.getByText("This session was cancelled.").locator("visible=true").first()).toBeVisible()
    await expect(page.getByRole("button", { name: /Reserve seat/ })).toHaveCount(0)

    // The learner dashboard is learner-only, so switch the simulated session back before opening it.
    await page.evaluate(() => localStorage.setItem("mentorbridge:session", JSON.stringify({ email: "rafi@example.com", role: "learner" })))
    await page.goto("/dashboard/bookings")
    await page.getByRole("tab", { name: /Past/ }).click()
    const row = page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "System Design Essentials" })
    await expect(row).toContainText("Session cancelled")
    await expect(row).toContainText("Refunded")
  })
})

test.describe("layout", () => {
  test("session pages fit the screen and keep the call to action in reach", async ({ page, isMobile }) => {
    await page.goto("/sessions")
    await expect(page.locator("article").first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)

    await page.goto("/sessions/sql-analytics-interview-prep")
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
    const cta = visibleButton(page, /Reserve seat/)
    await expect(cta).toBeVisible()
    if (isMobile) {
      await expect(page.locator("[data-mobile-bar]")).toBeVisible()
      const box = await cta.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(40)
      await expect(page.getByText("21 of 30 seats left").locator("visible=true").first()).toBeVisible()
    }
  })
})
