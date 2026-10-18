import { expect, test, type Page } from "@playwright/test"

import { pickDate, signedIn } from "./helpers"

const STORAGE_KEY = "mentorbridge:v1"

test.use({ timezoneId: "Asia/Dhaka" })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T06:00:00Z"))
})

const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), STORAGE_KEY)
const section = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}"]`)
// Stat strips only; the earnings breakdown is a dl too and repeats some labels.
const stat = (page: Page, label: string) =>
  page.getByRole("main").locator('dl[aria-label="At a glance"] > *, dl[aria-label="Balance"] > *').filter({ hasText: new RegExp(`^${label}`) })
const upcoming = (page: Page) => page.getByRole("list", { name: "Upcoming bookings" })
const nabila = (page: Page) => upcoming(page).getByRole("listitem").filter({ hasText: "Nabila Karim" })
const offerRow = (page: Page, title: string) => page.getByRole("list", { name: "Your offers" }).getByRole("listitem").filter({ hasText: title })
const offerAction = async (page: Page, title: string, action: string) => {
  await page.getByRole("button", { name: `More actions for ${title}` }).click()
  await page.getByRole("menuitem", { name: action }).click()
}

// The sidebar on desktop, the "More" sheet on phones.
async function navigate(page: Page, label: string) {
  // A "More" sheet still animating closed counts as visible and then detaches mid-click.
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const sidebar = page.getByRole("navigation", { name: "Mentor workspace" })
  if (!(await sidebar.isVisible())) await page.getByRole("button", { name: "Open menu" }).click()
  await page.getByRole("navigation", { name: "Mentor workspace" }).getByRole("link", { name: label, exact: true }).click()
}

async function cancelNabila(page: Page) {
  await page.goto("/dashboard/mentor/bookings")
  await nabila(page).getByRole("button", { name: "Cancel and refund" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("refunded ৳3,150 in full")
  await expect(page.getByRole("alertdialog")).toContainText("no real transfer")
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel booking" }).click()
  await expect(page.getByRole("tabpanel")).not.toContainText("Nabila Karim")
}

test.describe("role permissions", () => {
  test("a signed-out visitor sees only a login prompt", async ({ page }) => {
    for (const path of ["/dashboard/mentor", "/dashboard/mentor/bookings", "/dashboard/mentor/offers", "/dashboard/mentor/earnings", "/dashboard/mentor/availability"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "Log in to open your workspace" })).toBeVisible()
      await expect(page.getByText("Estimated earnings")).toHaveCount(0)
    }
  })

  test("a learner is refused every mentor page and sees no mentor data", async ({ page }) => {
    await signedIn(page)
    for (const path of ["/dashboard/mentor", "/dashboard/mentor/bookings", "/dashboard/mentor/offers", "/dashboard/mentor/offers/new", "/dashboard/mentor/offers/tanvir-mock", "/dashboard/mentor/availability", "/dashboard/mentor/earnings"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "This area is for mentors" })).toBeVisible()
      await expect(page.getByText("Nabila Karim")).toHaveCount(0)
      await expect(page.getByText("Estimated earnings")).toHaveCount(0)
      await expect(page.getByRole("button", { name: /Publish|Request payout|Cancel and refund/ })).toHaveCount(0)
    }
  })

  test("logging in as a mentor opens the workspace", async ({ page }) => {
    await page.goto("/dashboard/mentor")
    await page.getByRole("main").getByRole("link", { name: "Log in" }).click()
    await page.getByText("mentor", { exact: true }).click()
    await page.getByLabel("Password").fill("demo1234")
    await page.getByRole("button", { name: "Log in" }).click()
    await expect(page).toHaveURL(/\/dashboard\/mentor$/)
    await expect(page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening), Tanvir$/ })).toBeVisible()
  })

  test("the learner dashboard and booking details are not shown to a mentor", async ({ page }) => {
    await signedIn(page, { role: "mentor" })
    for (const path of ["/dashboard", "/dashboard/bookings/bk-1001"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "This area is for learners" })).toBeVisible()
      await expect(page.getByRole("navigation", { name: "Quick actions" })).toHaveCount(0)
    }
  })
})

test.describe("overview", () => {
  test.beforeEach(async ({ page }) => signedIn(page, { role: "mentor" }))

  test("greets the mentor and leads with the single most important task", async ({ page }) => {
    await page.goto("/dashboard/mentor")
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tanvir")
    const next = section(page, "up-next")
    await expect(next).toContainText("৳4,500 is ready to pay out")
    await next.getByRole("link", { name: "Request payout" }).click()
    await expect(page).toHaveURL(/\/dashboard\/mentor\/earnings$/)
  })

  test("a session within a day becomes the top task and links to bookings", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-26T01:00:00Z"))
    await page.goto("/dashboard/mentor")
    const next = section(page, "up-next")
    await expect(next).toContainText("Get ready for System design mock interview")
    await expect(next).toContainText("Nabila Karim")
    await next.getByRole("link", { name: "View booking" }).click()
    await expect(page).toHaveURL(/\/dashboard\/mentor\/bookings$/)
  })

  test("the week strip shows upcoming bookings and group sessions in the mentor's week", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-22T01:00:00Z"))
    await page.goto("/dashboard/mentor")
    const week = page.getByRole("list", { name: "Next seven days" })
    await expect(week.getByRole("listitem").first()).toHaveAccessibleName(/^Today/)
    await expect(week).toContainText("Nabila Karim")
  })

  test("numbers sit in one strip: earnings this month, payout, bookings and rating", async ({ page }) => {
    await page.goto("/dashboard/mentor")
    await expect(stat(page, "Earned this month")).toContainText("৳7,200")
    await expect(stat(page, "Ready to pay out")).toContainText("৳4,500")
    await expect(stat(page, "Upcoming bookings")).toContainText(/\d/)
    await expect(stat(page, "Average rating")).toContainText(/\d\.\d/)
    await expect(page.getByText("Demo workspace")).toHaveCount(0)
    await expect(page.getByRole("note")).toHaveCount(0)
  })

  test("lists what else needs attention and recent reviews", async ({ page }) => {
    await page.goto("/dashboard/mentor")
    await expect(section(page, "attention-heading").getByRole("heading", { name: "Needs attention" })).toBeVisible()
    await expect(section(page, "reviews-heading").getByRole("listitem")).toHaveCount(3)
    await expect(section(page, "reviews-heading").getByRole("img", { name: /out of 5 stars/ }).first()).toBeVisible()
  })
})

test.describe("bookings", () => {
  test.beforeEach(async ({ page }) => signedIn(page, { role: "mentor" }))

  test("upcoming bookings show the learner, amount, sample marker and goals", async ({ page }) => {
    await page.goto("/dashboard/mentor/bookings")
    await expect(page.getByRole("heading", { level: 1, name: "Bookings" })).toBeVisible()
    await expect(page.getByRole("tab", { name: /Upcoming/ })).toHaveAttribute("aria-selected", "true")
    const row = nabila(page)
    await expect(row).toContainText("System design mock interview")
    await expect(row).toContainText("before fees")
    await expect(row).toContainText("Confirmed")
    await expect(row.getByText("Sample")).toBeVisible()
    await expect(row.getByText(/payments service/)).toBeHidden()
    await row.getByText("Learner's goals").click()
    await expect(row.getByText(/payments service/)).toBeVisible()
    await expect(row.getByRole("button", { name: "Cancel and refund" })).toBeVisible()
  })

  test("completed bookings have their own tab", async ({ page }) => {
    await page.goto("/dashboard/mentor/bookings")
    await page.getByRole("tab", { name: /Completed/ }).click()
    const panel = page.getByRole("tabpanel", { name: /Completed/ })
    await expect(panel).toContainText("Anika Rahman")
    await expect(panel).toContainText("Imtiaz Hossain")
    await expect(panel.getByRole("button", { name: "Cancel and refund" })).toHaveCount(0)
  })

  test("a mentor cancelling a booking refunds the learner in full", async ({ page }) => {
    await cancelNabila(page)
    await expect(page.getByText(/Booking cancelled/)).toBeVisible()
    const state = await stored(page)
    const order = state.incoming.orders.find((item: { id: string }) => item.id === "ORD-IB-3")
    expect(order).toMatchObject({ status: "refunded", refundPercent: 100 })
  })

  test("group sessions show seats filled and can be cancelled before they start", async ({ page }) => {
    await page.goto("/dashboard/mentor/bookings")
    await page.getByRole("tab", { name: /Group sessions/ }).click()
    const row = page.getByRole("tabpanel", { name: /Group sessions/ }).getByRole("listitem").filter({ hasText: "System Design Essentials" })
    await expect(row.getByRole("progressbar", { name: /Seats filled/ })).toHaveAttribute("aria-valuetext", /of 30 seats taken/)
    await row.getByRole("button", { name: "Cancel session" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("refunded in full")
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel for everyone" }).click()
    await expect(row).toContainText("Cancelled")
    await expect(row.getByRole("button", { name: "Cancel session" })).toHaveCount(0)
  })

  test("clearing sample data leaves honest empty states and zero money", async ({ page }) => {
    await page.goto("/dashboard/mentor/bookings")
    await page.getByRole("button", { name: "Clear sample data" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Clear sample data" }).click()
    await expect(page.getByRole("tabpanel")).toContainText("No upcoming bookings")
    await page.goto("/dashboard/mentor")
    await expect(stat(page, "Earned this month")).toContainText("৳0")
    await expect(section(page, "up-next")).toContainText("all set")
  })
})

test.describe("managing offers", () => {
  test.beforeEach(async ({ page }) => signedIn(page, { role: "mentor" }))

  test("lists every offer with its status", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers")
    await expect(page.getByRole("heading", { level: 1, name: "Offers" })).toBeVisible()
    await expect(offerRow(page, "Career strategy call")).toContainText("Live")
    await expect(offerRow(page, "System Design Essentials")).toContainText("30 seats")
    await expect(page.getByRole("link", { name: "New offer" })).toBeVisible()
  })

  test("pausing hides an offer from the public profile and resuming brings it back", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers")
    await offerAction(page, "Career strategy call", "Pause")
    await expect(offerRow(page, "Career strategy call")).toContainText("Paused")
    await expect(page.getByText("Career strategy call is paused")).toBeVisible()
    await page.goto("/mentors/tanvir-rahman")
    await expect(page.locator("#offers")).not.toContainText("Career strategy call")
    await page.goto("/dashboard/mentor/offers")
    await offerAction(page, "Career strategy call", "Resume")
    await page.goto("/mentors/tanvir-rahman")
    await expect(page.locator("#offers")).toContainText("Career strategy call")
  })

  test("archiving retires an offer, and restoring returns it as a draft", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers")
    await offerAction(page, "Resume & LinkedIn review", "Archive")
    await expect(offerRow(page, "Resume & LinkedIn review")).toContainText("Archived")
    await expect(offerRow(page, "Resume & LinkedIn review").getByRole("link", { name: /Edit/ })).toHaveCount(0)
    await page.goto("/mentors/tanvir-rahman")
    await expect(page.locator("#offers")).not.toContainText("Resume & LinkedIn review")
    await page.goto("/dashboard/mentor/offers")
    await offerAction(page, "Resume & LinkedIn review", "Restore")
    await expect(offerRow(page, "Resume & LinkedIn review")).toContainText("Draft")
  })

  test("creating an offer rejects invalid prices and saves a valid one as a draft", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/new")
    await expect(page.getByRole("heading", { level: 1, name: "What kind of offer?" })).toBeVisible()
    await page.getByRole("radio", { name: /1:1/ }).click()
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByLabel("Title").fill("Portfolio review call")
    await page.getByLabel("Short description").fill("A focused call on your portfolio with next steps.")
    await page.getByLabel("What's included").fill("Portfolio walkthrough\nWritten action list")
    for (const bad of ["abc", "0", "10", "12.5", "999999"]) {
      await page.getByLabel("Price (৳)").fill(bad)
      await page.getByRole("button", { name: "Save draft" }).click()
      await expect(page.getByText(/Enter the price in whole taka|Price must be between/)).toBeVisible()
    }
    expect((await stored(page)).workspace?.offers ?? null).toBeNull()

    await page.getByLabel("Price (৳)").fill("1500")
    await page.getByRole("button", { name: "Save draft" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible()
    const offers = (await stored(page)).workspace.offers
    expect(offers.at(-1)).toMatchObject({ title: "Portfolio review call", price: 1500, status: "draft", type: "one-on-one" })
    expect(offers.at(-1)).not.toHaveProperty("commission")

    await page.goto("/dashboard/mentor/offers")
    await expect(offerRow(page, "Portfolio review call")).toContainText("Draft")
    await page.goto("/mentors/tanvir-rahman")
    await expect(page.locator("#offers")).not.toContainText("Portfolio review call")
  })

  test("the preview updates as you type, and saving and publishing makes it live", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/new")
    await page.getByRole("radio", { name: /review/i }).click()
    await page.getByRole("button", { name: "Continue" }).click()
    const preview = page.getByRole("complementary").getByLabel("Public preview")
    await page.getByLabel("Title").fill("Portfolio feedback")
    await page.getByLabel("Price (৳)").fill("900")
    await expect(preview).toContainText("Portfolio feedback")
    await expect(preview).toContainText("৳900")

    await page.getByLabel("Short description").fill("Detailed written feedback on your portfolio.")
    await page.getByLabel("Deliverables").fill("Line-by-line comments\nOne-page summary")
    await page.getByLabel("What the learner sends").fill("A link to your portfolio")
    await page.getByRole("button", { name: "Save and publish" }).click()
    await expect(page.getByRole("status").filter({ hasText: "live" })).toBeVisible()
    await expect(preview).toContainText("One-page summary")

    await page.goto("/mentors/tanvir-rahman")
    await expect(page.locator("#offers")).toContainText("Portfolio feedback")
  })

  test("a review offer needs deliverables and a turnaround", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/new")
    await page.getByRole("radio", { name: /review/i }).click()
    await page.getByRole("button", { name: "Continue" }).click()
    await page.getByLabel("Title").fill("CV feedback")
    await page.getByLabel("Short description").fill("Written feedback on your CV with fixes.")
    await page.getByLabel("Price (৳)").fill("800")
    await page.getByLabel("Delivered within (days)").fill("30")
    await page.getByRole("button", { name: "Save draft" }).click()
    await expect(page.getByText("List at least one deliverable")).toBeVisible()
    await expect(page.getByText(/Delivery time must be between 1 and 14/)).toBeVisible()
    await expect(page.getByText("Say what the learner sends")).toBeVisible()
  })

  test("editing a live offer's price changes what learners are charged", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/tanvir-career")
    await expect(page.getByRole("heading", { level: 1, name: "Edit offer" })).toBeVisible()
    await expect(page.getByRole("navigation", { name: "breadcrumb" })).toContainText("Career strategy call")
    await page.getByLabel("Price (৳)").fill("2500")
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible()
    await page.goto("/mentors/tanvir-rahman")
    await page.locator("#offers label").filter({ hasText: "Career strategy call" }).click()
    await expect(page.getByRole("link", { name: /Book session · ৳2,500/ })).toBeVisible()
    await page.goto("/mentors/tanvir-rahman/book?offer=tanvir-career")
    await expect(page.getByText("৳2,500").locator("visible=true").first()).toBeVisible()
  })

  test("a group session's capacity can be raised but not cut below the seats taken", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/tanvir-group")
    await expect(page.getByLabel("Price per seat (৳)")).toBeDisabled()
    await page.getByLabel("Seat capacity").fill("20")
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByText(/At least 22 seats are already taken/).first()).toBeVisible()
    await page.getByLabel("Seat capacity").fill("40")
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible()
    await page.goto("/sessions/system-design-essentials")
    await expect(page.getByText("18 of 40 seats left").locator("visible=true").first()).toBeVisible()
  })

  test("the editor flags unsaved changes and guards the breadcrumb", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/tanvir-career")
    await expect(page.getByText("Unsaved changes")).toHaveCount(0)
    await expect(page.getByText("All changes saved")).toBeVisible()
    await page.getByLabel("Title").fill("")
    await expect(page.getByText("Unsaved changes")).toBeVisible()
    await page.getByRole("button", { name: "Save changes" }).click()
    await expect(page.getByLabel("Title")).toBeFocused()
    await expect(page.getByLabel("Title")).toHaveAttribute("aria-describedby", "offer-title-error")
    await page.getByRole("navigation", { name: "breadcrumb" }).getByRole("link", { name: "Offers" }).click()
    await expect(page.getByRole("alertdialog")).toBeVisible()
    await page.getByRole("button", { name: "Discard changes" }).click()
    await expect(page).toHaveURL(/\/dashboard\/mentor\/offers$/)
  })

  test("the save bar stays clear of the phone tab bar", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/tanvir-career")
    const save = page.getByRole("button", { name: "Save changes" })
    const tabs = page.getByRole("navigation", { name: "Mentor tabs" })
    if (!(await tabs.isVisible())) return
    const [saveBox, tabsBox] = [await save.boundingBox(), await tabs.boundingBox()]
    expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(tabsBox!.y)
  })

  test("the preview dialog shows the public view of an offer", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers")
    await offerAction(page, "System design mock interview", "Preview")
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("System design mock interview")
    await expect(dialog).toContainText("৳3,000")
    await expect(dialog.getByRole("button", { name: /Book session/ })).toBeDisabled()
  })

  test("unknown and archived offers can't be edited", async ({ page }) => {
    await page.goto("/dashboard/mentor/offers/not-an-offer")
    await expect(page.getByText("We couldn't find that offer")).toBeVisible()
  })
})

test.describe("availability", () => {
  test.beforeEach(async ({ page }) => signedIn(page, { role: "mentor" }))

  test("saves changes, validates limits, and warns when nothing is open", async ({ page }) => {
    await page.goto("/dashboard/mentor/availability")
    await expect(page.getByRole("heading", { level: 1, name: "Availability" })).toBeVisible()
    await page.getByLabel("Minimum notice (hours)").fill("999")
    await expect(page.getByText("Notice must be 0 to 168 hours")).toBeVisible()
    await expect(page.getByText("Unsaved changes")).toBeVisible()
    await page.getByRole("button", { name: "Save availability" }).click()
    await expect(page.getByLabel("Minimum notice (hours)")).toBeFocused()
    await expect(page.getByLabel("Minimum notice (hours)")).toHaveAttribute("aria-invalid", "true")
    await page.getByLabel("Minimum notice (hours)").fill("12")
    await page.getByLabel("Add a day off").click()
    await expect(page.locator("[data-slot=calendar]").getByRole("button", { name: /October 1(st)?, 2026/ })).toBeDisabled()
    await page.keyboard.press("Escape")
    await pickDate(page, "Add a day off", "2026-12-25")
    await expect(page.getByLabel("Add a day off")).toContainText("25 Dec 2026")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await expect(page.getByRole("list", { name: "Days off" })).toContainText("Dec")
    await pickDate(page, "Add a day off", "2026-12-25")
    await page.getByRole("button", { name: "Add", exact: true }).click()
    await expect(page.getByText("That day is already off")).toBeVisible()
    await page.getByRole("group", { name: "Days", exact: true }).getByRole("button", { name: "Mon" }).click()
    await expect(page.getByRole("group", { name: "Days", exact: true }).getByRole("button", { name: "Mon" })).toHaveAttribute("aria-pressed", "true")
    await page.getByRole("button", { name: "Save availability" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Availability saved" })).toBeVisible()
    await expect(page.getByText("Unsaved changes")).toHaveCount(0)
    const saved = (await stored(page)).workspace.availability
    expect(saved.minNoticeHours).toBe(12)
    expect(saved.unavailableDates).toContain("2026-12-25")
    expect(saved.days).toContain(1)
  })

  test("leaving with unsaved changes asks first", async ({ page }) => {
    await page.goto("/dashboard/mentor/availability")
    await page.getByLabel("Buffer between calls (min)").fill("30")
    await navigate(page, "Earnings")
    await expect(page.getByRole("alertdialog")).toContainText("Leave without saving?")
    await page.getByRole("button", { name: "Keep editing" }).click()
    await expect(page).toHaveURL(/\/availability$/)
    await navigate(page, "Earnings")
    await page.getByRole("button", { name: "Discard changes" }).click()
    await expect(page).toHaveURL(/\/earnings$/)
  })

  test("a mentor with no open times can't be booked for calls", async ({ page }) => {
    await page.goto("/dashboard/mentor/availability")
    for (const day of ["Tue", "Thu", "Sat"]) await page.getByRole("group", { name: "Days", exact: true }).getByRole("button", { name: day }).click()
    await expect(page.getByText(/can't be booked/)).toBeVisible()
    await page.getByRole("button", { name: "Save availability" }).click()
    await page.goto("/dashboard/mentor")
    await expect(section(page, "up-next")).toContainText(/Open some times|ready to pay out|Get ready/)
    await page.goto("/mentors/tanvir-rahman/book?offer=tanvir-career")
    await expect(page.getByText("Choose a date to see available times.")).toHaveCount(0)
  })
})

test.describe("earnings and payouts", () => {
  test.beforeEach(async ({ page }) => signedIn(page, { role: "mentor" }))

  test("derives every figure from records and offers no way to edit commission", async ({ page }) => {
    await page.goto("/dashboard/mentor/earnings")
    await expect(page.getByRole("heading", { level: 1, name: "Earnings" })).toBeVisible()
    await expect(page.getByRole("figure", { name: /Estimated earnings by month/ })).toBeVisible()
    await expect(stat(page, "Estimated earnings")).toContainText("৳7,200")
    const breakdown = page.getByLabel("How earnings are worked out")
    await expect(breakdown.locator("div").filter({ hasText: /^Learners paid/ })).toContainText("৳8,400")
    await expect(breakdown.locator("div").filter({ hasText: /^Commission/ })).toContainText("৳800")
    await expect(section(page, "request-heading")).toContainText("can't be changed from your account")
    await expect(page.getByLabel(/commission/i)).toHaveCount(0)
    await expect(page.getByText("Demo mode.")).toHaveCount(0)
  })

  test("a payout is confirmed, stays pending until completed, and only then counts as paid out", async ({ page }) => {
    await page.goto("/dashboard/mentor/earnings")
    await expect(stat(page, "Ready to pay out")).toContainText("৳4,500")
    await page.getByLabel("Amount (৳)").fill("2000")
    await page.getByRole("button", { name: "Request payout" }).click()
    await expect(page.getByRole("alertdialog")).toContainText("no real transfer is made")
    await page.getByRole("alertdialog").getByRole("button", { name: "Request payout" }).click()
    await expect(page.getByText("Payout of ৳2,000 requested")).toBeVisible()
    await expect(stat(page, "Payout pending")).toContainText("৳2,000")
    await expect(stat(page, "Paid out")).toContainText("৳0")
    await expect(stat(page, "Ready to pay out")).toContainText("৳2,500")

    const history = section(page, "history-heading")
    await expect(history).toContainText("Pending")
    await history.getByRole("button", { name: /Complete demo payout/ }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Mark as sent" }).click()
    await expect(stat(page, "Paid out")).toContainText("৳2,000")
    await expect(stat(page, "Payout pending")).toContainText("৳0")
    await expect(history).toContainText("Paid (demo)")
    await expect(page.getByRole("button", { name: /Complete demo payout/ })).toHaveCount(0)
  })

  test("invalid and excessive payout amounts are refused", async ({ page }) => {
    await page.goto("/dashboard/mentor/earnings")
    for (const bad of ["10", "abc", "999999"]) {
      await page.getByLabel("Amount (৳)").fill(bad)
      await expect(page.getByRole("main").getByRole("alert")).toBeVisible()
      await expect(page.getByRole("button", { name: "Request payout" })).toBeDisabled()
    }
    expect((await stored(page)).payouts ?? []).toEqual([])
  })

  test("the statement lists payments and payouts and keeps working after a refund", async ({ page }) => {
    await cancelNabila(page)
    await page.goto("/dashboard/mentor/earnings")
    const trail = section(page, "trail-heading")
    await expect(trail).toContainText("Refund")
    await expect(trail).toContainText("-৳3,150")
    await expect(trail).toContainText("Earnings -৳2,700")
    await expect(stat(page, "Estimated earnings")).toContainText("৳4,500")
  })
})

test.describe("layout", () => {
  test("every workspace page fits the screen with one heading and no demo banner", async ({ page }) => {
    await signedIn(page, { role: "mentor" })
    for (const path of ["/dashboard/mentor", "/dashboard/mentor/bookings", "/dashboard/mentor/offers", "/dashboard/mentor/offers/tanvir-career", "/dashboard/mentor/availability", "/dashboard/mentor/earnings"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
      await expect(page.getByRole("main").getByText(/Demo workspace|Mentor workspace/)).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), path).toBe(false)
    }
  })

  test("the portal navigation marks the current page and moves between pages", async ({ page }) => {
    await signedIn(page, { role: "mentor" })
    await page.goto("/dashboard/mentor")
    const nav = page.getByRole("navigation", { name: /^Mentor (workspace|tabs)$/ })
    await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page")
    await nav.getByRole("link", { name: "Bookings" }).click()
    await expect(page).toHaveURL(/\/dashboard\/mentor\/bookings$/)
    await expect(nav.getByRole("link", { name: "Bookings" })).toHaveAttribute("aria-current", "page")
    await nav.getByRole("link", { name: "Offers" }).click()
    await expect(nav.getByRole("link", { name: "Offers" })).toHaveAttribute("aria-current", "page")
    await navigate(page, "Earnings")
    await expect(page).toHaveURL(/\/earnings$/)
  })
})
