import { expect, test, type Page } from "@playwright/test"

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
// The feedback banner and the table's record counts both use role="status", so scope by text.
const feedback = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text })

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
      ["/dashboard/admin/applications", "Application review"],
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
  test("shows computed metrics clearly labelled as demo data", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    await expect(page.getByRole("note")).toContainText("Demo administration")
    await expect(page.getByText("Gross booking value", { exact: true })).toBeVisible()
    await expect(page.getByText("Completed bookings", { exact: true })).toBeVisible()
    await expect(page.getByText("Repeat booking rate", { exact: true })).toBeVisible()
    await expect(page.getByText("Booking conversion", { exact: true })).toBeVisible()
    // The counts line names the sample split rather than implying real activity.
    await expect(page.getByText(/of \d+ bookings and \d+ of \d+ orders are marked Sample/)).toBeVisible()
  })

  test("work queues link into the matching modules", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    await page.getByRole("link", { name: /Applications to review/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/admin\/applications$/)
  })
})

test.describe("moderation and audit", () => {
  test("suspending a mentor needs a reason and lands in the audit log", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/moderation")
    await page.getByLabel("Search mentors").fill("Tanvir Rahman")
    await row(page, "Tanvir Rahman").getByRole("button", { name: "Suspend" }).click()
    await page.getByLabel("Reason").fill("Repeated no-shows reported by learners")
    await page.getByRole("button", { name: "Suspend mentor" }).click()
    await expect(feedback(page, "suspended.")).toBeVisible()
    await expect(row(page, "Tanvir Rahman")).toContainText("Suspended")

    const data = await stored(page)
    expect(data.admin.audit[0]).toMatchObject({ actor: ADMIN, action: "mentor-suspended", target: "tanvir-rahman" })

    await page.goto("/dashboard/admin/audit")
    await expect(page.getByRole("main")).toContainText("Mentor suspended")
    await expect(page.getByRole("main")).toContainText("tanvir-rahman")
  })

  test("hiding a review and resolving a dispute are recorded", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/reviews")
    await page.getByLabel("Search reviews").fill("Mahin K.")
    await row(page, "Mahin K.").getByRole("button", { name: "Hide" }).click()
    await page.getByLabel("Reason").fill("Names a person outside the session")
    await page.getByRole("button", { name: "Hide review" }).click()
    await expect(feedback(page, "Review hidden.")).toBeVisible()

    await page.goto("/dashboard/admin/refunds")
    await row(page, "DSP-1041").getByRole("button", { name: "Refund" }).click()
    await page.getByLabel("Resolution note").fill("Mentor cancellation confirmed; refunded in full")
    await page.getByRole("button", { name: "Mark refunded" }).click()
    await expect(feedback(page, "is now refunded.")).toBeVisible()
    await expect(row(page, "DSP-1041")).toContainText("Refunded")
  })

  test("restricting an account needs a reason and updates the row", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/users")
    await page.getByLabel("Search accounts").fill("nadia.sample")
    await row(page, "nadia.sample@example.com").getByRole("button", { name: "Restrict" }).click()
    await page.getByLabel("Reason").fill("Chargeback abuse under review")
    await page.getByRole("button", { name: "Restrict account" }).click()
    await expect(feedback(page, "restricted.")).toBeVisible()
    await expect(row(page, "nadia.sample@example.com")).toContainText("Restricted")
  })
})

test.describe("records", () => {
  test("transaction log is read-only and marked simulated", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/transactions")
    await expect(page.getByRole("main")).toContainText("ORD-IB-1")
    await expect(page.getByRole("main")).toContainText("simulated")
    await expect(page.getByRole("button", { name: /Mark paid|Cancel/ })).toHaveCount(0)
  })

  test("bookings can be searched and filtered", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin/bookings")
    await page.getByLabel("Search bookings").fill("System design")
    await expect(page.getByText(/of \d+ records/)).toBeVisible()
    await expect(row(page, "System design mock interview")).toBeVisible()
  })

  test("a mentor payout can be requested and then settled by an admin", async ({ page }) => {
    await actAs(page, "mentor", "mentor@example.com", "/dashboard/mentor/earnings")
    await page.getByRole("button", { name: "Request demo payout" }).click()
    await expect(page.getByRole("status")).toContainText("requested")

    await actAs(page, "admin", ADMIN, "/dashboard/admin/payouts")
    await expect(page.getByRole("main")).toContainText("Pending")
    await page.getByRole("button", { name: "Mark paid" }).first().click()
    await expect(feedback(page, "marked paid")).toBeVisible()
    await expect(page.getByRole("main")).toContainText("Paid")
  })
})

test.describe("layout", () => {
  test("admin pages fit the screen at both sizes", async ({ page }) => {
    await actAs(page, "admin", ADMIN, "/dashboard/admin")
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
    await page.goto("/dashboard/admin/transactions")
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  })
})
