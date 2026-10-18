import type { Page } from "@playwright/test"

// The app has only a simulated sign-in, so tests start signed in by seeding its session key.
// A later call with another role wins, and each seed runs once per tab so logging out sticks.
export async function signedIn(page: Page, options: { email?: string; role?: "learner" | "mentor" } = {}) {
  const { email = "rafi@example.com", role = "learner" } = options
  await page.addInitScript(
    ({ email, role }) => {
      const marker = `seeded:${role}`
      if (sessionStorage.getItem(marker)) return
      sessionStorage.setItem(marker, "1")
      localStorage.setItem("mentorbridge:session", JSON.stringify({ email, role }))
    },
    { email, role }
  )
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

// Opens a DatePicker by its label and steps forward month by month until the day is shown.
export async function pickDate(page: Page, label: string, key: string) {
  const [year, month, day] = key.split("-").map(Number)
  await page.getByLabel(label).click()
  const calendar = page.locator("[data-slot=calendar]")
  for (let step = 0; step < 24 && !(await calendar.getByText(`${monthNames[month - 1]} ${year}`).isVisible()); step++) {
    await calendar.getByRole("button", { name: /next month/i }).click()
  }
  await calendar.getByRole("button", { name: new RegExp(`${monthNames[month - 1]} ${day}(st|nd|rd|th)?, ${year}`) }).click()
}
