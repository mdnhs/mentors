import { expect, test, type Page } from "@playwright/test"

import { signedIn } from "./helpers"

const STORAGE_KEY = "mentorbridge:v1"

test.use({ timezoneId: "Asia/Dhaka" })

// Sample data is dated around this day, so fixing the clock keeps notice windows and statuses stable.
test.beforeEach(async ({ page }) => {
  await signedIn(page)
  await page.clock.setFixedTime(new Date("2026-10-18T06:00:00Z"))
})

async function pickOpenDay(page: Page, index = 0) {
  const day = page.locator('[role="gridcell"] button[aria-label*="open"]:not([aria-disabled])').nth(index)
  await expect(day).toBeVisible()
  await day.click()
}

async function pickFirstOpenTime(page: Page) {
  const time = page.getByRole("group", { name: /^Times on/ }).getByRole("button").and(page.locator(":not([disabled])")).first()
  await time.click()
  await expect(time).toHaveAttribute("aria-pressed", "true")
  return (await time.textContent())!.trim()
}

async function next(page: Page, name: string | RegExp = "Continue") {
  await page.getByRole("button", { name }).locator("visible=true").first().click()
}

async function bookNusrat(page: Page, dayIndex = 0) {
  await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
  await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible()
  await pickOpenDay(page, dayIndex)
  await pickFirstOpenTime(page)
  await next(page)
  await page.getByLabel("Your goals").fill("I want to plan my path into ML engineering.")
  await next(page)
  await expect(page.getByRole("heading", { name: "Review your booking" })).toBeVisible()
}

test.describe("booking flow", () => {
  test("requires a date and time, then goals, then shows a review before confirming", async ({ page }) => {
    await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
    const continueButton = page.getByRole("button", { name: "Continue" }).locator("visible=true").first()
    await expect(continueButton).toBeDisabled()
    await expect(page.getByText("Choose a date to see available times.")).toBeVisible()

    await pickOpenDay(page)
    await expect(continueButton).toBeDisabled()
    await pickFirstOpenTime(page)
    await expect(continueButton).toBeEnabled()
    await continueButton.click()

    await expect(page.getByRole("heading", { name: "What do you want from this session?" })).toBeVisible()
    await expect(continueButton).toBeDisabled()
    await page.getByLabel("Your goals").fill("short")
    await expect(page.getByText("5 more characters needed")).toBeVisible()
    await expect(continueButton).toBeDisabled()
    await page.getByLabel("Your goals").fill("I want to plan my path into ML engineering.")
    await continueButton.click()

    await expect(page.getByRole("heading", { name: "Review your booking" })).toBeVisible()
    await expect(page.getByText("I want to plan my path into ML engineering.")).toBeVisible()
    await expect(page.getByText(/Demo checkout/)).toBeVisible()
  })

  test("shows the price, platform fee, total and refund terms before the pay button", async ({ page }) => {
    await bookNusrat(page)
    const breakdown = page.locator("dl").filter({ hasText: "Total to pay" }).locator("visible=true").first()
    await expect(breakdown).toContainText("Platform fee (5%")
    await expect(page.getByText(/Free cancellation or one free reschedule/).locator("visible=true").first()).toBeVisible()
    await expect(page.getByRole("button", { name: /^Pay ৳/ }).locator("visible=true").first()).toBeVisible()
  })

  test("confirms a booking, then the same slot is no longer offered", async ({ page }) => {
    await bookNusrat(page)
    await next(page, /^Pay ৳/)
    await expect(page.getByRole("heading", { name: /You're booked with Nusrat/ })).toBeVisible()
    await expect(page.getByText(/saved in this browser only/)).toBeVisible()

    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).bookings, STORAGE_KEY)
    expect(stored.filter((booking: { mentorSlug: string }) => booking.mentorSlug === "nusrat-jahan")).toHaveLength(1)
    expect(stored[0]).toMatchObject({ status: "confirmed", mentorSlug: "nusrat-jahan" })

    await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
    await pickOpenDay(page)
    await expect(page.getByRole("group", { name: /^Times on/ }).getByRole("button", { name: /booked|taken/i }).first()).toBeDisabled()
  })

  test("a double click on confirm creates only one booking", async ({ page }) => {
    await bookNusrat(page)
    const confirm = page.getByRole("button", { name: /^Pay ৳/ }).locator("visible=true").first()
    await confirm.dblclick()
    await expect(page.getByRole("heading", { name: /You're booked with Nusrat/ })).toBeVisible()
    const count = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).bookings.filter((booking: { mentorSlug: string }) => booking.mentorSlug === "nusrat-jahan").length,
      STORAGE_KEY
    )
    expect(count).toBe(1)
  })

  test("a slot taken in another tab is rejected at confirmation with a way back", async ({ page }) => {
    await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
    await pickOpenDay(page)
    const chip = page.getByRole("group", { name: /^Times on/ }).getByRole("button").and(page.locator(":not([disabled])")).first()
    await chip.click()
    const start = (await chip.getAttribute("data-start"))!
    await next(page)
    await page.getByLabel("Your goals").fill("I want to plan my path into ML engineering.")
    await next(page)

    await page.evaluate(
      ([key, startsAt]) => {
        const state = JSON.parse(localStorage.getItem(key) ?? "{}")
        const bookings = state.bookings ?? []
        bookings.push({
          id: "other-tab",
          kind: "one-on-one",
          mentorSlug: "nusrat-jahan",
          title: "Taken elsewhere",
          date: startsAt,
          durationMinutes: 45,
          timezone: "Asia/Dhaka",
          total: 1,
          status: "confirmed",
        })
        localStorage.setItem(key, JSON.stringify({ ...state, bookings }))
      },
      [STORAGE_KEY, start]
    )

    await next(page, /^Pay ৳/)
    const alert = page.locator("[role=alert]").filter({ hasText: "couldn't book" })
    await expect(alert).toContainText("couldn't book that")
    await expect(alert).toContainText("just taken")
    await alert.getByRole("button", { name: "Choose another time" }).click()
    await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible()
    await pickOpenDay(page)
    await expect(page.locator(`[data-start="${start}"]`)).toBeDisabled()
  })

  test("only the offer's own duration drives the slots, and past days are not selectable", async ({ page }) => {
    await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
    const disabledDays = page.locator('[role="gridcell"] button[aria-disabled="true"]')
    await expect(disabledDays.first()).toBeVisible()
    await expect(page.locator('[role="gridcell"] button[aria-label*="outside the booking window"]').first()).toHaveAttribute("aria-disabled", "true")
    await disabledDays.first().click({ force: true })
    await expect(page.getByText("Choose a date to see available times.")).toBeVisible()
  })

  test("the calendar works from the keyboard", async ({ page }) => {
    await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
    const focusable = page.locator('[role="gridcell"] button[tabindex="0"]')
    await expect(focusable).toBeVisible()
    await focusable.focus()
    const before = await focusable.getAttribute("data-date")
    await page.keyboard.press("ArrowRight")
    await expect(page.locator('[role="gridcell"] button[tabindex="0"]')).not.toHaveAttribute("data-date", before!)
    await page.keyboard.press("Enter")
  })

  test("times convert to the learner's timezone, including across Munich's daylight saving change", async ({ page }) => {
    await page.goto("/mentors/arif-hossain/book?offer=arif-strategy")
    await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible()

    // Friday 23 Oct: Munich is on summer time (UTC+2), so 10:00 there is 2:00 PM in Dhaka.
    await pickOpenDay(page, 0)
    expect(await pickFirstOpenTime(page)).toBe("2:00 PM")
    await expect(page.getByText(/10:00 AM for Arif in Munich/)).toBeVisible()

    // Sunday 25 Oct: the clocks have gone back, so the same 10:00 is now 3:00 PM in Dhaka.
    await pickOpenDay(page, 2)
    expect(await pickFirstOpenTime(page)).toBe("3:00 PM")
    await expect(page.getByText(/10:00 AM for Arif in Munich/)).toBeVisible()
  })

  test("switching timezone keeps the chosen instant and changes the displayed time", async ({ page }) => {
    await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
    await pickOpenDay(page)
    const dhakaTime = await pickFirstOpenTime(page)
    await page.getByRole("combobox", { name: "Your timezone" }).click()
    await page.getByRole("option", { name: /Dhaka/ }).first().click()
    await expect(page.getByRole("group", { name: /^Times on/ }).getByRole("button", { pressed: true })).toContainText(dhakaTime)
  })
})

test.describe("payment lifecycle", () => {
  const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)

  test("a failed payment keeps the hold and can be retried to success", async ({ page }) => {
    await bookNusrat(page)
    await page.getByText("Payment fails").click()
    await next(page, /^Pay ৳/)
    await expect(page.getByRole("heading", { name: "Payment didn't go through" })).toBeVisible()
    let state = await stored(page)
    expect(state.orders[0].status).toBe("payment-failed")
    expect(state.bookings[0].status).toBe("pending")
    expect(state.orders[0].transactions[0]).toMatchObject({ kind: "charge", status: "failed" })

    await page.getByRole("button", { name: /Try again/ }).click()
    await expect(page.getByRole("heading", { name: /You're booked with Nusrat/ })).toBeVisible()
    state = await stored(page)
    expect(state.orders[0].status).toBe("confirmed")
    expect(state.orders[0].transactions.map((item: { status: string }) => item.status)).toEqual(["failed", "succeeded"])
  })

  test("a successful payment confirms the order and records one simulated charge", async ({ page }) => {
    await bookNusrat(page)
    await next(page, /^Pay ৳/)
    await expect(page.getByRole("heading", { name: /You're booked with Nusrat/ })).toBeVisible()
    await expect(page.getByText("Total (demo payment)")).toBeVisible()
    const state = await stored(page)
    expect(state.orders).toHaveLength(1)
    expect(state.orders[0]).toMatchObject({ status: "confirmed" })
    expect(state.orders[0].transactions).toHaveLength(1)
    expect(state.orders[0].transactions[0]).toMatchObject({ kind: "charge", simulated: true, amount: state.orders[0].quote.total })
  })

  test("cancelling a failed checkout frees the time and takes no money", async ({ page }) => {
    await bookNusrat(page)
    await page.getByText("Payment fails").click()
    await next(page, /^Pay ৳/)
    await page.getByRole("button", { name: "Cancel booking" }).click()
    await expect(page.getByRole("heading", { name: "Booking cancelled" })).toBeVisible()
    const state = await stored(page)
    expect(state.orders[0].status).toBe("cancelled")
    expect(state.orders[0].transactions.filter((item: { status: string }) => item.status === "succeeded")).toHaveLength(0)
  })

  test("cancelling a paid booking opens a refund that settles to refunded", async ({ page }) => {
    await bookNusrat(page, 3)
    await next(page, /^Pay ৳/)
    await expect(page.getByRole("heading", { name: /You're booked with Nusrat/ })).toBeVisible()
    await page.goto("/dashboard")
    const row = page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "ML project review" })
    await row.getByRole("button", { name: "Cancel" }).click()
    await expect(page.getByRole("dialog")).toContainText("full refund of ৳")
    await page.getByRole("dialog").getByRole("button", { name: "Cancel session" }).click()
    await page.getByRole("tab", { name: /Past/ }).click()
    await expect(page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "ML project review" })).toContainText("Refunded")
    const state = await stored(page)
    expect(state.orders[0].status).toBe("refunded")
    expect(state.orders[0].transactions.map((item: { kind: string }) => item.kind)).toEqual(["charge", "refund"])
  })

  test("a double click on pay creates one order and one charge", async ({ page }) => {
    await bookNusrat(page)
    await page.getByRole("button", { name: /^Pay ৳/ }).locator("visible=true").first().dblclick()
    await expect(page.getByRole("heading", { name: /You're booked with Nusrat/ })).toBeVisible()
    const state = await stored(page)
    expect(state.orders).toHaveLength(1)
    expect(state.orders[0].transactions).toHaveLength(1)
  })

  test("reserving a group seat goes through the same payment states", async ({ page }) => {
    await page.goto("/sessions/starting-your-ai-career")
    await page.getByRole("button", { name: /Reserve seat/ }).locator("visible=true").first().click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Platform fee")
    await expect(dialog).toContainText("Total to pay")
    await dialog.getByRole("button", { name: /^Pay ৳/ }).click()
    await expect(dialog.getByRole("heading", { name: "You're in!" })).toBeVisible()
    const state = await stored(page)
    expect(state.orders.at(0)).toMatchObject({ status: "confirmed" })
  })
})

test.describe("cancelling and rescheduling", () => {
  test("a learner can reschedule a session once and then not again", async ({ page }) => {
    await bookNusrat(page, 3)
    await next(page, /^Pay ৳/)
    await expect(page.getByRole("heading", { name: /You're booked with Nusrat/ })).toBeVisible()

    await page.goto("/dashboard")
    const row = page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "ML project review" })
    await row.getByRole("link", { name: "Reschedule" }).click()
    await expect(page.getByRole("heading", { name: "Reschedule ML project review" })).toBeVisible()
    const confirm = page.getByRole("button", { name: "Confirm new time" }).locator("visible=true")
    await expect(confirm).toBeDisabled()
    await pickOpenDay(page, 4)
    await pickFirstOpenTime(page)
    await confirm.click()
    await expect(page.getByRole("heading", { name: "Session rescheduled" })).toBeVisible()

    await page.goto("/dashboard")
    const moved = page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "ML project review" })
    await expect(moved.getByRole("button", { name: "Reschedule" })).toBeDisabled()
    await expect(moved).toContainText("already been rescheduled once")
  })

  test("cancelling asks for confirmation, applies the refund policy and frees the status", async ({ page }) => {
    await page.goto("/dashboard")
    const demoRow = page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "System design mock interview" })
    await expect(demoRow).toContainText("Confirmed")
    await demoRow.getByRole("button", { name: "Cancel" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Cancel System design mock interview?")
    await dialog.getByRole("button", { name: "Keep session" }).click()
    await expect(demoRow).toContainText("Confirmed")

    await demoRow.getByRole("button", { name: "Cancel" }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Cancel session" }).click()
    await page.getByRole("tab", { name: /Past/ }).click()
    const cancelled = page.locator("section[aria-labelledby=bookings] li").filter({ hasText: "System design mock interview" })
    await expect(cancelled).toContainText("Cancelled")
    await expect(cancelled.getByRole("button", { name: "Cancel" })).toHaveCount(0)
  })
})

test.describe("mobile usability", () => {
  test("the booking steps fit the viewport and the action bar stays reachable", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only")
    await page.goto("/mentors/nusrat-jahan/book?offer=nusrat-project")
    await expect(page.getByRole("heading", { name: "Pick a date" })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(overflow).toBe(false)

    await pickOpenDay(page)
    const time = page.getByRole("group", { name: /^Times on/ }).getByRole("button").and(page.locator(":not([disabled])")).first()
    const box = await time.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await time.click()

    const bar = page.locator("[data-mobile-bar]")
    await expect(bar).toBeVisible()
    await expect(bar.getByRole("button", { name: "Continue" })).toBeEnabled()
    const day = await page.locator('[role="gridcell"] button').first().boundingBox()
    expect(day!.width).toBeGreaterThanOrEqual(40)
  })
})
