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
