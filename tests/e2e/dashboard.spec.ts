import { expect, test, type Page } from "@playwright/test"

import { signedIn } from "./helpers"

const STORAGE_KEY = "mentorbridge:v1"

test.use({ timezoneId: "Asia/Dhaka" })

// 12:00 in Dhaka, so the overview greets with "Good afternoon".
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T06:00:00Z"))
})

const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
const section = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}"]`)
const main = (page: Page) => page.getByRole("main")

async function startFresh(page: Page) {
  await page.goto("/dashboard/bookings")
  await main(page).getByRole("button", { name: "Clear sample data" }).click()
  await expect(page.getByText("Nothing coming up")).toBeVisible()
}

test.describe("access", () => {
  test("a signed-out visitor sees a login prompt instead of any personal data", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/bookings", "/dashboard/saved", "/dashboard/settings", "/dashboard/bookings/bk-1001"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "Log in to see your sessions" })).toBeVisible()
      await expect(page.getByText("System design mock interview")).toHaveCount(0)
      await expect(page.getByText("rafi@example.com")).toHaveCount(0)
    }
  })

  test("logging in returns to the page that asked for it, and logging out locks it again", async ({ page, isMobile }) => {
    await page.goto("/dashboard/settings")
    await main(page).getByRole("link", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fsettings/)
    await page.getByLabel("Password").fill("demo1234")
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/dashboard\/settings$/)
    await expect(main(page).getByRole("heading", { name: "Profile" })).toBeVisible()

    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click()
      await page.getByRole("button", { name: "Log out" }).locator("visible=true").first().click()
    } else {
      await page.getByRole("button", { name: /Account menu/ }).click()
      await page.getByRole("menuitem", { name: "Log out" }).click()
    }
    await expect(page.getByRole("heading", { name: "Log in to see your sessions" })).toBeVisible()
  })

  test("the login redirect refuses off-site destinations", async ({ page }) => {
    await page.goto("/login?next=//evil.example.com")
    await page.getByLabel("Password").fill("demo1234")
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  test("a new visitor can create an account and lands on the dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Create account" }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await page.getByRole("textbox", { name: "Full name" }).fill("Mina Das")
    await page.getByRole("textbox", { name: "Email" }).fill("mina@example.com")
    await page.getByLabel("Password").locator("visible=true").fill("demo1234")
    await page.getByRole("button", { name: "Create account" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("heading", { level: 1, name: "Good afternoon, Mina" })).toBeVisible()
  })

  test("the password can be shown, and a forgotten one leads to a demo reset", async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Password").fill("demo1234")
    await page.getByRole("button", { name: "Show password" }).click()
    await expect(page.getByLabel("Password")).toHaveAttribute("type", "text")
    await page.getByRole("link", { name: "Forgot password?" }).click()
    // The streamed form can hydrate after the first fill and reset it, so retry until the submit lands.
    const sent = page.getByRole("status").filter({ hasText: "If an account exists for rafi@example.com, we've sent a reset link." })
    await expect(async () => {
      if ((await sent.count()) === 0) {
        await page.getByRole("textbox", { name: "Email" }).fill("rafi@example.com", { timeout: 2000 })
        await page.getByRole("button", { name: "Send reset link" }).click({ timeout: 2000 })
      }
      await expect(sent).toBeVisible({ timeout: 3000 })
    }).toPass({ timeout: 20000 })
    await expect(page.getByRole("status")).toContainText("Demo only")
  })

  test("a learner is pointed at applying, not at the mentor workspace", async ({ page }) => {
    await signedIn(page)
    await page.goto("/dashboard")
    await expect(page.getByRole("link", { name: "Apply to become a mentor" })).toHaveAttribute("href", "/become-a-mentor")
    await expect(page.getByRole("link", { name: "Open the mentor dashboard" })).toHaveCount(0)
  })

  test("a booking id that isn't in this account shows nothing about it", async ({ page }) => {
    await signedIn(page)
    await page.goto("/dashboard/bookings/not-mine")
    await expect(page.getByRole("heading", { name: "We couldn't find that booking" })).toBeVisible()
    await expect(main(page).getByRole("link", { name: "Back to bookings" })).toHaveAttribute("href", "/dashboard/bookings")
  })
})

test.describe("demo mode", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("the top bar says it is a demo, and sample records are marked instead of passed off as real", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    await expect(page.getByRole("button", { name: "Demo data", exact: true })).toBeVisible()
    await expect(page.getByText("Demo account")).toHaveCount(0)
    const row = section(page, "bookings").locator("li").filter({ hasText: "System design mock interview" })
    await expect(row).toContainText("Sample")
    await page.goto("/dashboard")
    await expect(section(page, "next-session")).toContainText("Sample")
  })

  test("clearing sample data leaves honest empty states everywhere", async ({ page }) => {
    await startFresh(page)
    await expect(page.getByRole("heading", { name: "No notes yet" })).toBeVisible()
    await expect(main(page).getByRole("button", { name: "Clear sample data" })).toHaveCount(0)

    await page.goto("/dashboard")
    await expect(page.getByText("No sessions booked yet")).toBeVisible()
    await expect(section(page, "up-next-heading")).toContainText("You're all caught up")
    await expect(section(page, "activity-heading")).toContainText("No payments yet")
    await expect(page.getByRole("list", { name: "Next seven days" }).getByRole("link")).toHaveCount(0)
    await expect(section(page, "picks-heading").getByRole("listitem").first()).toBeVisible()

    await page.goto("/dashboard/saved")
    await expect(page.getByRole("heading", { name: "No saved mentors" })).toBeVisible()
    await expect(main(page).getByText("Save mentors you like to compare them later.")).toBeVisible()
  })
})

test.describe("overview", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("leads with the next session, in the learner's time zone", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Good afternoon, Rafi")
    const next = section(page, "next-session")
    await expect(next).toContainText("Next session")
    await expect(next).toContainText("System design mock interview")
    await expect(next).toContainText("in 4 days")
    await expect(next).toContainText("Thu, Oct 22, 7:00 PM Dhaka time")
    await next.getByRole("link", { name: "View details" }).click()
    await expect(page).toHaveURL(/\/dashboard\/bookings\/bk-1001$/)
  })

  test("the week strip shows this week's sessions and links to them", async ({ page }) => {
    await page.goto("/dashboard")
    const week = page.getByRole("list", { name: "Next seven days" })
    await expect(week.getByRole("link")).toHaveCount(1)
    await week.getByRole("link", { name: /System design mock interview/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/bookings\/bk-1001$/)
  })

  test("the stats count what matters and lead to their pages", async ({ page }) => {
    await page.goto("/dashboard")
    const stats = page.getByRole("main").locator("dl[aria-label='Your progress']")
    await expect(stats).toContainText("Upcoming sessions2")
    await expect(stats).toContainText("Completed sessions2")
    await expect(stats).toContainText("Open action steps3")
    await expect(stats.getByRole("link", { name: /Saved mentors/ })).toHaveAttribute("href", "/dashboard/saved")
    await expect(stats.getByRole("link", { name: /Upcoming sessions/ })).toHaveAttribute("href", "/dashboard/bookings")
  })

  test("an open step can be ticked off from the overview, and undone", async ({ page }) => {
    await page.goto("/dashboard")
    const upNext = section(page, "up-next-heading")
    await expect(upNext).toContainText("PhD application strategy")
    await upNext.getByLabel("Draft a one-page research statement").click()
    await expect(page.getByText("Step done")).toBeVisible()
    await expect(upNext.getByLabel("Draft a one-page research statement")).toHaveCount(0)
    expect((await stored(page)).notes["bk-0994"].actions.find((item: { id: string }) => item.id === "a2").done).toBe(true)
    await page.getByRole("button", { name: "Undo" }).click()
    await expect(upNext.getByLabel("Draft a one-page research statement")).toBeVisible()
  })

  test("recent activity and mentor suggestions are shown", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(section(page, "activity-heading")).toContainText("Recent activity")
    await expect(section(page, "picks-heading")).toContainText("Mentors for you")
    await expect(section(page, "picks-heading").getByRole("listitem").first()).toBeVisible()
  })

  test("header actions lead to discovery and live sessions", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(main(page).getByRole("link", { name: "Find a mentor" })).toHaveAttribute("href", "/mentors")
    await expect(main(page).getByRole("link", { name: "Group sessions" })).toHaveAttribute("href", "/sessions")
  })
})

test.describe("bookings", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("upcoming and past are separate tabs with counts", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    await expect(page.getByRole("heading", { level: 1, name: "Bookings" })).toBeVisible()
    const upcoming = page.getByRole("tab", { name: /Upcoming/ })
    await expect(upcoming).toContainText("2")
    await expect(upcoming).toHaveAttribute("aria-selected", "true")
    const list = section(page, "bookings")
    await expect(list.locator("li").filter({ hasText: "System design mock interview" })).toContainText("Confirmed")
    await expect(list.getByRole("button", { name: "Cancel session" }).first()).toBeVisible()

    await page.getByRole("tab", { name: /Past/ }).click()
    await expect(page.getByRole("tab", { name: /Past/ })).toHaveAttribute("aria-selected", "true")
    await expect(list.locator("li").filter({ hasText: "PhD application strategy" })).toContainText("Completed")
  })

  test("a booking opens its details with price, policy and allowed actions", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    await section(page, "bookings").getByRole("link", { name: "System design mock interview" }).click()
    await expect(page).toHaveURL(/\/dashboard\/bookings\/bk-1001$/)
    await expect(page.getByRole("heading", { level: 1, name: "System design mock interview" })).toBeVisible()
    await expect(main(page).getByRole("navigation", { name: /breadcrumb/i }).getByRole("link", { name: "Bookings" })).toHaveAttribute("href", "/dashboard/bookings")
    await expect(page.getByText(/Full refund up to 48 hours|Free cancellation/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel session" })).toBeVisible()
    await expect(section(page, "details-heading")).toContainText("Dhaka time")
    await expect(page.getByText("Demo mode: payments are simulated")).toBeVisible()
  })

  test("notes are summarised with progress and link to the full plan", async ({ page }) => {
    await page.goto("/dashboard/bookings")
    const overview = section(page, "notes-overview-heading")
    await expect(overview).toContainText("PhD application strategy")
    await expect(overview).toContainText("1 of 3 done")
    await expect(overview.getByRole("progressbar", { name: "PhD application strategy steps done" })).toHaveAttribute("aria-valuenow", "1")
    await overview.getByRole("link", { name: /PhD application strategy/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/bookings\/bk-0994#notes$/)
  })
})

test.describe("saved mentors", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("saving and unsaving a mentor updates the saved list", async ({ page }) => {
    await page.goto("/dashboard/saved")
    await expect(page.getByRole("heading", { level: 1, name: "Saved mentors" })).toBeVisible()
    const saved = section(page, "saved")
    await expect(saved).toContainText("Nusrat Jahan")
    await expect(saved).toContainText("From ৳")
    await saved.getByRole("button", { name: "Save Nusrat Jahan" }).click()
    await expect(page.getByText("Removed Nusrat Jahan from saved")).toBeVisible()
    await expect(saved).not.toContainText("Nusrat Jahan")
    expect((await stored(page)).saved).not.toContain("nusrat-jahan")
    await page.goto("/mentors/nusrat-jahan")
    await page.getByRole("button", { name: "Save Nusrat Jahan" }).click()
    await page.goto("/dashboard/saved")
    await expect(section(page, "saved")).toContainText("Nusrat Jahan")
  })

  test("suggests more mentors to look at", async ({ page }) => {
    await page.goto("/dashboard/saved")
    await expect(section(page, "recommended-heading").getByRole("listitem").first()).toBeVisible()
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

  test("private notes never appear on the mentor dashboard", async ({ page }) => {
    await page.goto("/dashboard/bookings/bk-0994")
    await page.locator("#notes").getByLabel(/Your private notes/).fill("secret learner note")
    await signedIn(page, { role: "mentor" })
    await page.goto("/dashboard/mentor")
    await expect(page.getByText("secret learner note")).toHaveCount(0)
  })
})

test.describe("settings", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("saves profile changes with validation, and the dashboard greets the new name", async ({ page }) => {
    await page.goto("/dashboard/settings")
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible()
    const save = page.getByRole("button", { name: "Save changes" })
    await expect(save).toBeDisabled()
    await page.getByLabel("Email").fill("not-an-email")
    await expect(page.getByText("Enter a valid email address")).toBeVisible()
    await expect(save).toBeDisabled()
    await page.getByLabel("Email").fill("sara@example.com")
    await page.getByLabel("Full name").fill("Sara Khan")
    await save.click()
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible()
    await expect(page.getByText("Profile saved")).toBeVisible()
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { level: 1, name: "Good afternoon, Sara" })).toBeVisible()
  })

  test("dashboard activity switches persist and say they only change the dashboard", async ({ page }) => {
    await page.goto("/dashboard/settings")
    await expect(page.getByRole("heading", { name: "Dashboard activity" })).toBeVisible()
    await expect(page.getByText("Nothing is emailed or sent.")).toBeVisible()
    const updates = page.getByRole("switch", { name: "Mentor updates" })
    await expect(updates).toBeChecked()
    await updates.click()
    await expect(page.getByText("Mentor updates off")).toBeVisible()
    await page.reload()
    await expect(page.getByRole("switch", { name: "Mentor updates" })).not.toBeChecked()
    expect((await stored(page)).notifications.mentorActivity).toBe(false)
  })

  test("turning recent activity off hides it from the overview", async ({ page }) => {
    await page.goto("/dashboard/settings")
    await page.getByRole("switch", { name: "Recent activity" }).click()
    await page.goto("/dashboard")
    await expect(section(page, "up-next-heading")).toBeVisible()
    await expect(section(page, "activity-heading")).toHaveCount(0)
  })

  test("the timezone picker is labelled, saves on change, and times follow it", async ({ page }) => {
    await page.goto("/dashboard/settings")
    const zone = page.getByLabel("Timezone")
    await expect(zone).toHaveValue("Asia/Dhaka")
    await zone.selectOption("Europe/London")
    await expect(page.getByText("Times now show in London time")).toBeVisible()
    expect((await stored(page)).profile.timezone).toBe("Europe/London")
    await page.goto("/dashboard")
    await expect(section(page, "next-session")).toContainText("2:00 PM London time")
  })

  test("resetting demo data asks first, and can be backed out of", async ({ page }) => {
    await page.goto("/dashboard/settings")
    await page.getByLabel("Full name").fill("Sara Khan")
    await page.getByRole("button", { name: "Save changes" }).click()
    await page.getByRole("button", { name: "Reset demo data" }).click()
    const dialog = page.getByRole("alertdialog")
    await expect(dialog).toContainText("can't be undone")
    await dialog.getByRole("button", { name: "Keep my data" }).click()
    expect((await stored(page)).profile.name).toBe("Sara Khan")

    await main(page).getByRole("button", { name: "Reset demo data" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Reset demo data" }).click()
    await expect(page.getByText("Demo data reset")).toBeVisible()
    expect((await stored(page)).profile.name).not.toBe("Sara Khan")
  })

  test("clearing sample data can be undone from the toast", async ({ page }) => {
    await page.goto("/dashboard/settings")
    await main(page).getByRole("button", { name: "Clear sample data" }).click()
    await expect(page.getByText("No sample records left.")).toBeVisible()
    await page.getByRole("button", { name: "Undo" }).click()
    await expect(main(page).getByRole("button", { name: "Clear sample data" })).toBeVisible()
    await page.goto("/dashboard")
    await expect(section(page, "next-session")).toContainText("System design mock interview")
  })

  test("logging out from settings confirms it", async ({ page }) => {
    await page.goto("/dashboard/settings")
    await expect(main(page)).toContainText("rafi@example.com")
    await main(page).getByRole("button", { name: "Log out" }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText("Logged out")).toBeVisible()
  })
})

test.describe("layout", () => {
  test.beforeEach(async ({ page }) => signedIn(page))

  test("every learner page fits the screen with no sideways scrolling", async ({ page }) => {
    for (const path of ["/dashboard", "/dashboard/bookings", "/dashboard/saved", "/dashboard/bookings/bk-0994", "/dashboard/settings"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), path).toBe(false)
    }
  })

  test("on phones the next session comes first, and booking actions come before details", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only")
    await page.goto("/dashboard")
    const next = await section(page, "next-session").boundingBox()
    const week = await section(page, "week-heading").boundingBox()
    expect(next!.y).toBeLessThan(week!.y)
    const tap = await main(page).getByRole("link", { name: "Find a mentor" }).boundingBox()
    expect(tap!.height).toBeGreaterThanOrEqual(40)

    await page.goto("/dashboard/bookings/bk-1001")
    const status = await section(page, "status-heading").boundingBox()
    const details = await section(page, "details-heading").boundingBox()
    expect(status!.y).toBeLessThan(details!.y)
  })
})
