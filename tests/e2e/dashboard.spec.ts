import { expect, test, type Page } from "@playwright/test"

import { signedIn } from "./helpers"

const STORAGE_KEY = "mentorbridge:v1"

test.use({ timezoneId: "Asia/Dhaka" })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T06:00:00Z"))
})

const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
const section = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}"]`)

async function startFresh(page: Page) {
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Clear sample data" }).first().click()
  await expect(page.getByText("No sessions booked yet")).toBeVisible()
}

test.describe("access", () => {
  test("a signed-out visitor sees a login prompt instead of any personal data", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/settings", "/dashboard/bookings/bk-1001"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "Log in to see your sessions" })).toBeVisible()
      await expect(page.getByText("System design mock interview")).toHaveCount(0)
      await expect(page.getByText("rafi@example.com")).toHaveCount(0)
    }
  })

  test("logging in returns to the page that asked for it, and logging out locks it again", async ({ page, isMobile }) => {
    await page.goto("/dashboard/settings")
    await page.getByRole("main").getByRole("link", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fsettings/)
    await page.getByLabel("Password").fill("demo1234")
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/dashboard\/settings$/)
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible()

    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click()
    await page.getByRole("button", { name: "Log out" }).locator("visible=true").first().click()
    await expect(page.getByRole("heading", { name: "Log in to see your sessions" })).toBeVisible()
  })

  test("the login redirect refuses off-site destinations", async ({ page }) => {
    await page.goto("/login?next=//evil.example.com")
    await page.getByLabel("Password").fill("demo1234")
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("a booking id that isn't in this account shows nothing about it", async ({ page }) => {
    await signedIn(page)
    await page.goto("/dashboard/bookings/not-mine")
    await expect(page.getByRole("heading", { name: "We couldn't find that booking" })).toBeVisible()
  })
})

test.describe("demo mode", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("says it is a demo and marks sample records instead of passing them off as real", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.getByRole("note")).toContainText("Demo account")
    await expect(page.getByRole("note")).toContainText("made-up examples")
    const row = page.locator("li").filter({ hasText: "System design mock interview" })
    await expect(row).toContainText("Sample")
  })

  test("clearing sample data leaves honest empty states everywhere", async ({ page }) => {
    await startFresh(page)
    await expect(page.getByText("Nothing coming up.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "No saved mentors" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "No notes yet" })).toBeVisible()
    await expect(page.getByText("Payments, confirmations and refunds will show here.")).toBeVisible()
    await expect(page.getByText("You're all caught up")).toBeVisible()
    await expect(page.getByText("Popular mentors to start with.")).toBeVisible()
    await expect(section(page, "guidance-heading").getByRole("listitem")).toHaveCount(3)
  })
})

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("answers: next session, what to do next, and where to find guidance", async ({ page }) => {
    await page.goto("/dashboard")
    const next = section(page, "next-session")
    await expect(next).toContainText("Next session")
    await expect(next).toContainText("System design mock interview")
    await expect(next.getByRole("link", { name: "View details" })).toBeVisible()

    const steps = section(page, "next-steps")
    await expect(steps).toContainText("open steps from PhD application strategy")

    await expect(section(page, "guidance-heading")).toContainText("Find more guidance")
    await expect(section(page, "guidance-heading").getByRole("listitem").first()).toBeVisible()
  })

  test("quick actions lead to discovery, live sessions and settings", async ({ page }) => {
    await page.goto("/dashboard")
    const quick = page.getByRole("navigation", { name: "Quick actions" })
    await expect(quick.getByRole("link", { name: "Find a mentor" })).toHaveAttribute("href", "/mentors")
    await expect(quick.getByRole("link", { name: "Live sessions" })).toHaveAttribute("href", "/sessions")
    await quick.getByRole("link", { name: "Settings" }).click()
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible()
  })

  test("a booking opens its details with price, policy and allowed actions", async ({ page }) => {
    await page.goto("/dashboard")
    await page.locator("li").filter({ hasText: "System design mock interview" }).getByRole("link", { name: "System design mock interview" }).click()
    await expect(page).toHaveURL(/\/dashboard\/bookings\/bk-1001$/)
    await expect(page.getByRole("heading", { name: "System design mock interview" })).toBeVisible()
    await expect(page.getByText(/Full refund up to 48 hours|Free cancellation/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
    await expect(page.getByText("Demo mode: payments are simulated")).toBeVisible()
  })

  test("saving and unsaving a mentor updates the saved list", async ({ page }) => {
    await page.goto("/dashboard")
    const saved = section(page, "saved")
    await expect(saved).toContainText("Nusrat Jahan")
    await saved.getByRole("button", { name: "Remove Nusrat Jahan from saved" }).click()
    await expect(saved).not.toContainText("Nusrat Jahan")
    expect((await stored(page)).saved).not.toContain("nusrat-jahan")
    await page.goto("/mentors/nusrat-jahan")
    await page.getByRole("button", { name: "Save Nusrat Jahan" }).click()
    await page.goto("/dashboard")
    await expect(section(page, "saved")).toContainText("Nusrat Jahan")
  })
})

test.describe("notes and action plans", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("ticking a step updates progress, and added steps and private notes persist", async ({ page }) => {
    await page.goto("/dashboard/bookings/bk-0994")
    const notes = page.locator("#notes")
    await expect(notes).toContainText("From your mentor")
    await expect(notes).toContainText("1 of 3 done")
    await notes.getByLabel("Draft a one-page research statement").check()
    await expect(notes).toContainText("2 of 3 done")

    await notes.getByLabel("Add a step").fill("Read two recent papers")
    await notes.getByRole("button", { name: "Add" }).click()
    await expect(notes).toContainText("Read two recent papers")
    await expect(notes.getByRole("button", { name: "Remove Draft a one-page research statement" })).toHaveCount(0)

    await notes.getByLabel(/Your private notes/).fill("Ask about funding")
    await page.reload()
    await expect(page.locator("#notes").getByLabel(/Your private notes/)).toHaveValue("Ask about funding")
    await expect(page.locator("#notes")).toContainText("2 of 4 done")
    await expect(page.locator("#notes")).toContainText("Only you can see these")
  })

  test("the dashboard summarises notes and links to the full plan", async ({ page }) => {
    await page.goto("/dashboard")
    const overview = section(page, "notes-overview")
    await expect(overview).toContainText("PhD application strategy")
    await expect(overview).toContainText("2 of 3 steps open")
    await overview.getByRole("link", { name: "PhD application strategy" }).click()
    await expect(page).toHaveURL(/\/dashboard\/bookings\/bk-0994#notes$/)
  })

  test("private notes never appear on the mentor dashboard", async ({ page }) => {
    await signedIn(page, { role: "mentor" })
    await page.goto("/dashboard/bookings/bk-0994")
    await page.locator("#notes").getByLabel(/Your private notes/).fill("secret learner note")
    await page.goto("/dashboard/mentor")
    await expect(page.getByText("secret learner note")).toHaveCount(0)
  })
})

test.describe("settings", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("saves profile changes with validation, and the dashboard greets the new name", async ({ page }) => {
    await page.goto("/dashboard/settings")
    const save = page.getByRole("button", { name: "Save changes" })
    await expect(save).toBeDisabled()
    await page.getByLabel("Email").fill("not-an-email")
    await expect(page.getByText("Enter a valid email address")).toBeVisible()
    await expect(save).toBeDisabled()
    await page.getByLabel("Email").fill("sara@example.com")
    await page.getByLabel("Full name").fill("Sara Khan")
    await save.click()
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible()
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "Hi, Sara" })).toBeVisible()
  })

  test("notification switches persist", async ({ page }) => {
    await page.goto("/dashboard/settings")
    const tips = page.getByRole("switch", { name: "Tips and offers" })
    await expect(tips).not.toBeChecked()
    await tips.click()
    await page.reload()
    await expect(page.getByRole("switch", { name: "Tips and offers" })).toBeChecked()
    expect((await stored(page)).notifications.tips).toBe(true)
  })
})

test.describe("layout", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("dashboard, details and settings fit the screen with no sideways scrolling", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/bookings/bk-0994", "/dashboard/settings"]) {
      await page.goto(path)
      await expect(page.getByRole("heading").first()).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), path).toBe(false)
    }
  })

  test("on phones the next session comes before the bookings list", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only")
    await page.goto("/dashboard")
    const next = await section(page, "next-session").boundingBox()
    const bookings = await section(page, "bookings").boundingBox()
    expect(next!.y).toBeLessThan(bookings!.y)
    const tap = await page.getByRole("navigation", { name: "Quick actions" }).getByRole("link", { name: "Find a mentor" }).boundingBox()
    expect(tap!.height).toBeGreaterThanOrEqual(40)
  })
})
