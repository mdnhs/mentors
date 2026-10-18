import { expect, test, type Page } from "@playwright/test"
import { pickDate } from "./helpers"

const STORAGE_KEY = "mentorbridge:v1"
const SESSION_KEY = "mentorbridge:session"
const ADMIN = "admin@example.com"
const REVIEWER = "reviewer@example.com"

test.use({ timezoneId: "Asia/Dhaka" })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T06:00:00Z"))
})

const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), STORAGE_KEY)

async function actAs(page: Page, role: "learner" | "mentor" | "reviewer" | "admin", email: string, path?: string) {
  if (page.url() === "about:blank") await page.goto("/")
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [SESSION_KEY, JSON.stringify({ email, role })])
  if (path) await page.goto(path)
  else await page.reload()
}

const row = (page: Page, text: string) => page.getByRole("row").filter({ hasText: text }).first()
// Action results are announced as toasts.
const feedback = (page: Page, text: string) => page.locator("[data-sonner-toast]").filter({ hasText: text })
const dialog = (page: Page) => page.getByRole("dialog").or(page.getByRole("alertdialog"))

test.describe("access control", () => {
  test("a signed-out visitor sees a login prompt, not any admin data", async ({ page }) => {
    for (const path of ["/dashboard/admin", "/dashboard/admin/bookings", "/dashboard/admin/audit"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "Log in to open your workspace" })).toBeVisible()
      await expect(page.getByText(ADMIN)).toHaveCount(0)
    }
  })

  test("learners, mentors and reviewers are all refused", async ({ page }) => {
    for (const [role, email] of [["learner", "rafi@example.com"], ["mentor", "mentor@example.com"], ["reviewer", REVIEWER]] as const) {
      await actAs(page, role, email, "/dashboard/admin")
      await expect(page.getByRole("heading", { name: "This area is for admins" })).toBeVisible()
      await page.goto("/dashboard/admin/audit")
      await expect(page.getByRole("heading", { name: "This area is for admins" })).toBeVisible()
    }
  })

  test("an admin reaches every module", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    for (const [path, heading] of [
      ["/dashboard/admin", "Overview"],
      ["/dashboard/admin/applications", "Mentor applications"],
      ["/dashboard/admin/moderation", "Mentors & offers"],
      ["/dashboard/admin/bookings", "Booking management"],
      ["/dashboard/admin/refunds", "Refunds & disputes"],
      ["/dashboard/admin/transactions", "Payment transactions"],
      ["/dashboard/admin/payouts", "Mentor payouts"],
      ["/dashboard/admin/reviews", "Review moderation"],
      ["/dashboard/admin/users", "Users & support"],
      ["/dashboard/admin/audit", "Audit log"],
    ] as const) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible()
    }
  })
})

test.describe("overview", () => {
  test("leads with the work that needs action, then computed metrics", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    const needs = page.getByRole("region", { name: "Needs action" })
    await expect(needs.getByRole("link", { name: /Applications to review/ })).toBeVisible()
    await expect(needs.getByRole("link", { name: /Open disputes/ })).toBeVisible()
    // Zero queues collapse into a single quiet line rather than a row each.
    await expect(needs.getByText("All clear:")).toBeVisible()
    // The big demo banner is gone; the shell's "Demo data" chip covers it.
    await expect(page.getByRole("note")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Demo data" })).toBeVisible()
    const revenue = page.getByRole("region", { name: "Revenue" })
    await expect(revenue.getByText("Net revenue", { exact: true })).toBeVisible()
    await expect(revenue.getByText("Gross booking value", { exact: true })).toBeVisible()
    const health = page.getByRole("region", { name: "Marketplace health" })
    await expect(health.getByText("Completed bookings", { exact: true })).toBeVisible()
    await expect(health.getByText("Repeat booking rate", { exact: true })).toBeVisible()
    await expect(health.getByText("Booking conversion", { exact: true })).toBeVisible()
    await expect(health.getByText("Active mentors", { exact: true })).toBeVisible()
  })

  test("recent activity shows the latest audit entries", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    await expect(page.getByRole("region", { name: "Recent activity" })).toContainText("No admin actions yet")
    await page.goto("/dashboard/admin/reviews")
    await page.getByLabel("Search reviews").fill("Mahin K.")
    await row(page, "Mahin K.").getByRole("button", { name: "Hide" }).click()
    await page.getByLabel("Reason").fill("Names a person outside the session")
    await dialog(page).getByRole("button", { name: "Hide review" }).click()
    await expect(feedback(page, "Review hidden.")).toBeVisible()
    await page.goto("/dashboard/admin")
    const activity = page.getByRole("region", { name: "Recent activity" })
    await expect(activity).toContainText("Review hidden")
    await activity.getByRole("link", { name: "Audit log" }).click()
    await expect(page).toHaveURL(/\/dashboard\/admin\/audit$/)
  })

  test("work queues link into the matching modules", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    await page.getByRole("link", { name: /Applications to review/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/admin\/applications$/)
    await page.goto("/dashboard/admin")
    await page.getByRole("link", { name: /Open disputes/ }).click()
    await expect(page).toHaveURL(/disputes\.status=unresolved/)
    await expect(page.getByRole("button", { name: "Status: Unresolved" })).toBeVisible()
  })
})

test.describe("moderation and audit", () => {
  test("suspending a mentor needs a reason and lands in the audit log", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/moderation")
    await page.getByLabel("Search mentors").fill("Tanvir Rahman")
    await row(page, "Tanvir Rahman").getByRole("button", { name: "Suspend" }).click()
    await expect(dialog(page).getByLabel("Reason")).toBeFocused()
    await page.getByLabel("Reason").fill("Repeated no-shows reported by learners")
    await dialog(page).getByRole("button", { name: "Suspend mentor" }).click()
    await expect(feedback(page, "suspended.")).toBeVisible()
    await expect(row(page, "Tanvir Rahman")).toContainText("Suspended")

    const data = await stored(page)
    expect(data.admin.audit[0]).toMatchObject({ actor: ADMIN, action: "mentor-suspended", target: "tanvir-rahman" })

    await page.goto("/dashboard/admin/audit")
    await expect(page.getByRole("main")).toContainText("Mentor suspended")
    await expect(page.getByRole("main")).toContainText("tanvir-rahman")

    await pickDate(page, "From", "2026-10-19")
    await expect(page).toHaveURL(/from=2026-10-19/)
    await expect(page.getByRole("main")).toContainText("No actions match these filters.")
    await page.getByLabel("From").click()
    await page.getByRole("button", { name: "Clear date" }).click()
    await expect(page).not.toHaveURL(/from=/)
    await expect(page.getByRole("main")).toContainText("Mentor suspended")
  })

  test("hiding a review and resolving a dispute are recorded", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/reviews")
    await page.getByLabel("Search reviews").fill("Mahin K.")
    await row(page, "Mahin K.").getByRole("button", { name: "Hide" }).click()
    await page.getByLabel("Reason").fill("Names a person outside the session")
    await dialog(page).getByRole("button", { name: "Hide review" }).click()
    await expect(feedback(page, "Review hidden.")).toBeVisible()

    await page.goto("/dashboard/admin/refunds")
    await row(page, "DSP-1041").getByRole("button", { name: "Refund" }).click()
    await page.getByLabel("Resolution note").fill("Mentor cancellation confirmed; refunded in full")
    await dialog(page).getByRole("button", { name: "Mark refunded" }).click()
    await expect(feedback(page, "is now refunded.")).toBeVisible()
    await expect(row(page, "DSP-1041")).toContainText("Refunded")
  })

  test("refunds lead with a summary of the open work", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/refunds")
    const summary = page.locator('dl[aria-label="Refund summary"]')
    await expect(summary).toContainText("Open disputes")
    await expect(summary).toContainText("Refunds pending")
    await expect(summary).toContainText("Refunded this month")
    await expect(page.getByRole("region", { name: "Refunds" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Disputes" })).toBeVisible()
  })

  test("record IDs copy to the clipboard", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "Clipboard permissions are Chromium-only")
    await context.grantPermissions(["clipboard-read", "clipboard-write"])
    await actAs(page, "admin", ADMIN, "/dashboard/admin/refunds")
    await row(page, "DSP-1041").getByRole("button", { name: "Copy ID DSP-1041" }).click()
    await expect(feedback(page, "Copied")).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("DSP-1041")
  })

  test("restricting an account needs a reason and updates the row", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/users")
    await page.getByLabel("Search accounts").fill("nadia.sample")
    await row(page, "nadia.sample@example.com").getByRole("button", { name: "Restrict" }).click()
    await page.getByLabel("Reason").fill("Chargeback abuse under review")
    await dialog(page).getByRole("button", { name: "Restrict account" }).click()
    await expect(feedback(page, "restricted.")).toBeVisible()
    await expect(row(page, "nadia.sample@example.com")).toContainText("Restricted")
  })
})

test.describe("records", () => {
  test("transaction log is read-only and marked simulated", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/transactions")
    await expect(page.getByRole("main")).toContainText("ORD-IB-1")
    await expect(page.getByRole("note")).toHaveCount(0)
    await expect(page.getByRole("main")).toContainText("simulated")
    await expect(page.getByRole("button", { name: /Mark paid|Cancel/ })).toHaveCount(0)
  })

  test("bookings can be searched and filtered", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/bookings")
    await page.getByLabel("Search bookings").fill("System design")
    await expect(page.getByText(/of \d+ records/)).toBeVisible()
    await expect(row(page, "System design mock interview")).toBeVisible()
  })

  test("table sort and filters live in the URL and survive a reload", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/transactions")
    await page.getByRole("group", { name: "Type" }).getByRole("button", { name: "Refunds" }).click()
    await page.getByRole("columnheader", { name: /Amount/ }).getByRole("button").click()
    await expect(page).toHaveURL(/kind=refund/)
    await expect(page).toHaveURL(/sort=amount%3Aasc|sort=amount:asc/)
    await expect(page.getByRole("columnheader", { name: /Amount/ })).toHaveAttribute("aria-sort", "ascending")
    await page.reload()
    await expect(page.getByRole("group", { name: "Type" }).getByRole("button", { name: "Refunds" })).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("button", { name: "Type: Refunds" }).click()
    await expect(page).not.toHaveURL(/kind=refund/)
  })

  test("a mentor payout can be requested and then settled by an admin", async ({ page }) => {
    await actAs(page, "mentor", "mentor@example.com", "/dashboard/mentor/earnings")
    await page.getByRole("button", { name: "Request payout" }).click()
    await dialog(page).getByRole("button", { name: "Request payout" }).click()
    await expect(feedback(page, "requested")).toBeVisible()

    await actAs(page, "admin", ADMIN, "/dashboard/admin/payouts")
    await expect(page.getByRole("main")).toContainText("Pending")
    await page.getByRole("button", { name: /Mark paid/ }).first().click()
    await expect(dialog(page)).toContainText(/no transfer is made/i)
    await dialog(page).getByRole("button", { name: "Mark paid" }).click()
    await expect(feedback(page, "marked paid")).toBeVisible()
    await expect(page.getByRole("main")).toContainText("Paid")
  })
})

test.describe("money actions", () => {
  test("cancelling a booking asks for confirmation with the refund and policy", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/bookings")
    await page.getByLabel("Search bookings").fill("System design")
    await row(page, "System design mock interview").getByRole("button", { name: /Cancel & refund/ }).click()
    await expect(dialog(page)).toContainText("Refund")
    await expect(dialog(page)).toContainText("Policy")
    await dialog(page).getByRole("button", { name: "Keep it" }).click()
    await expect(dialog(page)).toHaveCount(0)
    expect((await stored(page)).admin?.audit ?? []).toEqual([])
  })
})

test.describe("layout", () => {
  test("each admin page has exactly one h1 and the shell navigates between modules", async ({ page, isMobile }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/payouts")
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mentor payouts")
    if (isMobile) {
      await expect(page.getByRole("navigation", { name: "Admin tabs" }).getByRole("link", { name: "Bookings" })).toBeVisible()
      await page.getByRole("button", { name: "Open menu" }).click()
      await expect(page.getByRole("dialog").getByRole("link", { name: "Payouts" })).toHaveAttribute("aria-current", "page")
      await page.getByRole("dialog").getByRole("link", { name: "Audit log" }).click()
      await expect(page).toHaveURL(/\/dashboard\/admin\/audit$/)
    } else {
      const nav = page.getByRole("navigation", { name: "Admin workspace" })
      await expect(nav.getByRole("link", { name: "Payouts" })).toHaveAttribute("aria-current", "page")
      await nav.getByRole("link", { name: "Audit log" }).click()
      await expect(page).toHaveURL(/\/dashboard\/admin\/audit$/)
    }
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Audit log")
  })

  test("the overview trend chart switches range and measure", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    await expect(page.getByRole("figure", { name: /Net revenue per day, last 30 days/ })).toBeVisible()
    await page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "7 days" }).click()
    await page.getByRole("group", { name: "Measure" }).getByRole("button", { name: "Bookings made" }).click()
    await expect(page.getByRole("figure", { name: /Bookings made per day, last 7 days/ })).toBeVisible()
    await expect(page.getByRole("group", { name: "Date range" }).getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText(/vs previous 7 days/).first()).toBeVisible()
  })

  test("admin pages fit the screen at both sizes", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
    for (const path of ["/dashboard/admin/transactions", "/dashboard/admin/refunds", "/dashboard/admin/users"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
    }
  })
})
