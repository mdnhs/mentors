import { expect, test } from "@playwright/test"

import { signedIn } from "./helpers"

test.use({ timezoneId: "Asia/Dhaka" })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T06:00:00Z"))
})

test("a learner searches, opens a thread and sends a message", async ({ page }) => {
  await signedIn(page)
  await page.goto("/dashboard/messages")
  await expect(page.getByRole("heading", { name: "Messages", level: 1 })).toBeVisible()

  await page.getByLabel("Search conversations").fill("zzz-nothing")
  await expect(page.getByText(/No conversations match/)).toBeVisible()
  await page.getByLabel("Search conversations").fill("shortlist")
  await expect(page.getByRole("list", { name: "Conversations" }).getByRole("button")).toHaveCount(1)
  await page.getByLabel("Search conversations").fill("")

  const tanvir = page.getByRole("button", { name: /Tanvir Rahman/ })
  await expect(tanvir).toContainText("2 unread")
  await tanvir.click()
  await expect(page).toHaveURL(/\?c=c-tanvir/)
  await expect(page.getByRole("link", { name: "System design mock interview" })).toBeVisible()
  await expect(page.getByText("Prototype: messages stay in this browser tab")).toBeVisible()

  const send = page.getByRole("button", { name: "Send message" })
  const box = page.getByLabel("Message Tanvir Rahman")
  await expect(send).toBeDisabled()
  await box.fill("   ")
  await expect(send).toBeDisabled()
  await box.fill("Thanks, see you on the 22nd")
  await expect(send).toBeEnabled()
  await box.press("Enter")
  await expect(page.getByRole("group", { name: "Today" }).getByText("Thanks, see you on the 22nd")).toBeVisible()
  await expect(box).toHaveValue("")

  await box.fill("line one")
  await box.press("Shift+Enter")
  await box.type("line two")
  await expect(box).toHaveValue("line one\nline two")
})

test("a mentor sees learner conversations", async ({ page }) => {
  await signedIn(page, { email: "tanvir@example.com", role: "mentor" })
  await page.goto("/dashboard/mentor/messages")
  await expect(page.getByRole("button", { name: /Nabila Karim/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /Tanvir Rahman/ })).toHaveCount(0)
})
