import { expect, test, type Page } from "@playwright/test"

const STORAGE_KEY = "mentorbridge:v1"
const SESSION_KEY = "mentorbridge:session"
const SARA = "sara.applicant@example.com"
const REVIEWER = "reviewer@example.com"

test.use({ timezoneId: "Asia/Dhaka" })

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-18T06:00:00Z"))
})

const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), STORAGE_KEY)

// The simulated sign-in is one key, so switching person is writing it and reloading.
async function actAs(page: Page, role: "learner" | "reviewer" | "mentor", email: string, path?: string) {
  if (page.url() === "about:blank") await page.goto("/")
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [SESSION_KEY, JSON.stringify({ email, role })])
  if (path) await page.goto(path)
  else await page.reload()
}

const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click()

async function fillWizard(page: Page, options: { skipEducationEvidence?: boolean } = {}) {
  await page.locator("#ap-name").fill("Sara Khan")
  await page.locator("#ap-city").fill("Dhaka")
  await next(page)
  await page.locator("#ap-role").fill("Backend Engineer")
  await page.locator("#ap-org").fill("Fintech company")
  await page.locator("#ap-years").fill("5")
  await page.locator("#ap-education").fill("BSc in Computer Science, Dhaka")
  await page.locator("#ap-profile").fill("https://example.com/sara")
  await next(page)
  await page.getByRole("button", { name: "Software Engineering" }).click()
  await page.locator("#ap-skills").fill("Go, System design")
  await page.locator("#ap-audience").fill("Engineers preparing for backend interviews.")
  await page.locator("#ap-bio").fill("I build payment systems and help engineers prepare for system design interviews with practical, structured practice.")
  await next(page)
  await addFile(page, "identity", "National ID", "id.pdf")
  if (!options.skipEducationEvidence) await addLink(page, "employment", "Company page", "https://example.com/sara/work")
  await next(page)
  await page.locator("#ap-price").fill("1500")
  await page.getByRole("group", { name: "Days you can mentor" }).getByRole("button", { name: "Mon" }).click()
  await page.getByRole("group", { name: /Start times/ }).getByRole("button", { name: "20:00" }).click()
  await next(page)
}

async function addFile(page: Page, kind: string, label: string, name: string, mimeType = "application/pdf", size = 2000) {
  await page.locator("#evidence-kind").selectOption(kind)
  await page.locator("#evidence-label").fill(label)
  await page.locator("#evidence-file").setInputFiles({ name, mimeType, buffer: Buffer.alloc(size, 1) })
  await page.getByRole("button", { name: "Add evidence" }).click()
}

async function addLink(page: Page, kind: string, label: string, url: string) {
  await page.locator("#evidence-kind").selectOption(kind)
  await page.locator("#evidence-form").selectOption("link")
  await page.locator("#evidence-label").fill(label)
  await page.locator("#evidence-url").fill(url)
  await page.getByRole("button", { name: "Add evidence" }).click()
}

async function submitApplication(page: Page) {
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Submit application" }).click()
  await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible()
}

async function applyAsSara(page: Page) {
  await actAs(page, "learner", SARA, "/become-a-mentor")
  await page.getByRole("button", { name: "Start application" }).click()
  await fillWizard(page)
  await submitApplication(page)
}

async function reviewSara(page: Page) {
  await actAs(page, "reviewer", REVIEWER, "/dashboard/reviewer")
  await page.getByRole("link", { name: "Sara Khan" }).click()
}

test.describe("applying", () => {
  test("a signed-out visitor is asked to log in", async ({ page }) => {
    await page.goto("/become-a-mentor")
    await expect(page.getByRole("heading", { name: "Create an account to apply" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Create account to start" })).toHaveAttribute("href", "/signup?next=%2Fbecome-a-mentor")
    await expect(page.locator("#ap-name")).toHaveCount(0)
  })

  test("a reviewer account can't apply", async ({ page }) => {
    await actAs(page, "reviewer", REVIEWER, "/become-a-mentor")
    await expect(page.getByRole("heading", { name: "Reviewer accounts can't apply" })).toBeVisible()
  })

  test("each step validates before moving on", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await next(page)
    await expect(page.getByText("Enter your full name")).toBeVisible()
    await expect(page.getByText("Enter your city")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Basic information" })).toBeVisible()
    await page.locator("#ap-name").fill("Sara Khan")
    await page.locator("#ap-city").fill("Dhaka")
    await next(page)
    await expect(page.getByRole("heading", { name: "Professional or academic background" })).toBeVisible()
    await page.locator("#ap-years").fill("lots")
    await page.locator("#ap-profile").fill("not a url")
    await next(page)
    await expect(page.getByText("Enter whole years, from 0 to 60")).toBeVisible()
    await expect(page.getByText("Enter a full web address")).toBeVisible()
  })

  test("the stepper shows progress and can't jump past an unfinished step", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await expect(page.getByText("Step 1 of 6")).toBeVisible()
    await expect(page.getByRole("button", { name: "Back", exact: true })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Save & finish later" })).toHaveAttribute("href", "/dashboard")
    const steps = page.getByRole("list", { name: "Application steps" })
    await expect(steps.getByRole("button", { name: /Expertise/ })).toBeDisabled()

    await next(page)
    await expect(page.locator("#ap-name")).toBeFocused()
    await expect(page.locator("#ap-name")).toHaveAttribute("aria-invalid", "true")
    await expect(page.locator("#ap-name")).toHaveAttribute("aria-describedby", "ap-name-error")

    await page.locator("#ap-name").fill("Sara Khan")
    await page.locator("#ap-city").fill("Dhaka")
    await next(page)
    await expect(page.getByText("Step 2 of 6")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Professional or academic background" })).toBeFocused()
    await expect(steps.getByRole("button", { name: /Basics \(complete\)/ })).toBeVisible()
    await steps.getByRole("button", { name: /Basics/ }).click()
    await expect(page.getByRole("heading", { name: "Basic information" })).toBeVisible()
  })

  test("areas of expertise stop at three, with a live count", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await page.locator("#ap-name").fill("Sara Khan")
    await page.locator("#ap-city").fill("Dhaka")
    await next(page)
    await page.locator("#ap-role").fill("Backend Engineer")
    await page.locator("#ap-org").fill("Fintech company")
    await page.locator("#ap-years").fill("5")
    await page.locator("#ap-education").fill("BSc in Computer Science")
    await next(page)
    const areas = page.getByRole("group", { name: /Areas you can help with/ })
    const chips = areas.getByRole("button")
    for (let position = 0; position < 3; position++) await chips.nth(position).click()
    await expect(areas).toContainText("3/3 selected")
    await expect(chips.nth(3)).toBeDisabled()
    await chips.nth(0).click()
    await expect(areas).toContainText("2/3 selected")
    await expect(chips.nth(3)).toBeEnabled()
  })

  test("only the basics are collected, and private fields are labelled", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await expect(page.getByText(/No date of birth, home address or phone number/)).toBeVisible()
    await expect(page.locator("#ap-email")).toHaveValue(SARA)
    await expect(page.locator("#ap-email")).toBeDisabled()
    await expect(page.getByText("Reviewers only").first()).toBeVisible()
    await expect(page.getByText("Shown on profile").first()).toBeVisible()
  })

  test("the draft is saved as you type and survives a reload", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await page.locator("#ap-name").fill("Sara Khan")
    await expect(page.getByText(/Draft saved · /)).toBeVisible()
    await page.reload()
    await expect(page.locator("#ap-name")).toHaveValue("Sara Khan")
    const app = (await stored(page)).applications.find((item: { applicantEmail: string }) => item.applicantEmail === SARA)
    expect(app.status).toBe("draft")
  })

  test("evidence rejects the wrong file types, big files and ID numbers", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await page.locator("#ap-name").fill("Sara Khan")
    await page.locator("#ap-city").fill("Dhaka")
    await next(page)
    await page.locator("#ap-role").fill("Backend Engineer")
    await page.locator("#ap-org").fill("Fintech company")
    await page.locator("#ap-years").fill("5")
    await page.locator("#ap-education").fill("BSc in Computer Science")
    await next(page)
    await page.getByRole("button", { name: "Software Engineering" }).click()
    await page.locator("#ap-skills").fill("Go")
    await page.locator("#ap-audience").fill("Engineers preparing for interviews.")
    await page.locator("#ap-bio").fill("I build payment systems and help engineers prepare for system design interviews with structured practice.")
    await next(page)

    await addFile(page, "identity", "National ID", "id.zip", "application/zip")
    await expect(page.getByRole("alert").filter({ hasText: "PDF, JPG or PNG" })).toBeVisible()
    await addFile(page, "identity", "National ID", "huge.pdf", "application/pdf", 6 * 1024 * 1024)
    await expect(page.getByRole("alert").filter({ hasText: "5 MB" })).toBeVisible()
    await addFile(page, "identity", "ID 1234567890123", "id.pdf")
    await expect(page.getByRole("alert").filter({ hasText: "ID or account numbers" })).toBeVisible()
    await expect(page.getByRole("list", { name: "Evidence you've added" })).toHaveCount(0)

    await next(page)
    await expect(page.getByText("Add an ID document for the identity check")).toBeVisible()
    await addFile(page, "identity", "National ID", "id.pdf")
    await expect(page.locator("#evidence-file")).toHaveValue("")
    await expect(page.getByRole("button", { name: "Add evidence" })).toBeDisabled()
    await next(page)
    await expect(page.getByText("Add evidence of your education, employment or expertise")).toBeVisible()

    await page.getByRole("button", { name: "Remove National ID" }).click()
    await expect(page.getByRole("list", { name: "Evidence you've added" })).toHaveCount(0)
    await page.getByRole("button", { name: "Undo" }).click()
    await expect(page.getByRole("list", { name: "Evidence you've added" })).toContainText("National ID")
  })

  test("submitting needs consent, then locks the application and keeps only file details", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await fillWizard(page)
    await expect(page.getByRole("heading", { name: "Review and submit" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Submit application" })).toBeDisabled()
    await submitApplication(page)
    await expect(page.locator("#ap-name")).toHaveCount(0)

    const app = (await stored(page)).applications.find((item: { applicantEmail: string }) => item.applicantEmail === SARA)
    expect(app.status).toBe("submitted")
    const idItem = app.data.evidence.find((item: { kind: string }) => item.kind === "identity")
    expect(idItem).toMatchObject({ fileName: "id.pdf", fileType: "application/pdf", fileSize: 2000 })
    expect(Object.keys(idItem).sort()).not.toEqual(expect.arrayContaining(["content", "data"]))
    expect(JSON.stringify(app)).not.toMatch(/base64|AQEBAQ/)
  })

  test("can't start a second application while one is in progress", async ({ page }) => {
    await applyAsSara(page)
    await page.goto("/become-a-mentor")
    await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Start application" })).toHaveCount(0)
  })
})

test.describe("reviewing", () => {
  test("only reviewers can open the review desk", async ({ page }) => {
    for (const [role, email] of [["learner", SARA], ["mentor", "mentor@example.com"]] as const) {
      await actAs(page, role, email, "/dashboard/reviewer")
      await expect(page.getByRole("heading", { name: "This area is for reviewers" })).toBeVisible()
      await expect(page.getByText("Nadia Sultana")).toHaveCount(0)
      await page.goto("/dashboard/reviewer/app-s1")
      await expect(page.getByRole("heading", { name: "This area is for reviewers" })).toBeVisible()
      await expect(page.getByText("nadia.sample@example.com")).toHaveCount(0)
    }
    await page.evaluate((key) => localStorage.removeItem(key), SESSION_KEY)
    await page.goto("/dashboard/reviewer")
    await expect(page.getByRole("heading", { name: "Log in to open your workspace" })).toBeVisible()
  })

  test("the queue lists submitted applications and filters by state", async ({ page }) => {
    await actAs(page, "reviewer", REVIEWER, "/dashboard/reviewer")
    await expect(page.getByRole("heading", { name: "Applications", level: 1 })).toBeVisible()
    await expect(page.getByRole("note")).toHaveCount(0)
    const list = page.getByRole("list", { name: "Needs attention applications" })
    await expect(list.getByRole("listitem")).toHaveCount(2)
    // Oldest first, with the overdue one flagged.
    await expect(list.getByRole("listitem").first()).toContainText("Rashed Karim")
    await expect(list.getByRole("listitem").first()).toContainText("Waiting 7 days")
    await expect(list.getByRole("listitem").last()).toContainText("Nadia Sultana")
    await expect(list).not.toContainText("Mim Akter")
    const filters = page.getByRole("group", { name: "Filter applications" })
    await expect(filters.getByRole("link", { name: "Needs attention" })).toHaveAttribute("aria-current", "true")
    await filters.getByRole("link", { name: "Waiting on applicant" }).click()
    await expect(page).toHaveURL(/\?view=info-required$/)
    await expect(filters.getByRole("link", { name: "Waiting on applicant" })).toHaveAttribute("aria-current", "true")
    await expect(page.getByRole("list", { name: "Waiting on applicant applications" })).toContainText("Mim Akter")
    await filters.getByRole("link", { name: "Decided" }).click()
    await expect(page.getByRole("list", { name: "Decided applications" })).toContainText("Tariq Aziz")
    await page.getByLabel("Queue summary").getByRole("link", { name: /Under review/ }).click()
    await expect(page).toHaveURL(/\?view=under-review$/)
    await expect(page.getByRole("list", { name: "Under review applications" })).toContainText("Rashed Karim")
  })

  test("drafts never reach the queue", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    await page.locator("#ap-name").fill("Draft Person")
    await actAs(page, "reviewer", REVIEWER, "/dashboard/reviewer")
    await expect(page.getByText("Draft Person")).toHaveCount(0)
  })

  test("opening evidence is recorded in the audit trail without storing its contents", async ({ page }) => {
    await actAs(page, "reviewer", REVIEWER, "/dashboard/reviewer/app-s2")
    await expect(page.getByRole("heading", { name: "Rashed Karim" })).toBeVisible()
    await page.getByRole("button", { name: "Open Passport photo page" }).click()
    await expect(page.getByTestId("evidence-e1")).toContainText("passport.pdf")
    const trail = page.getByRole("list", { name: "Audit trail" })
    await expect(trail).toContainText("Evidence opened")
    await expect(trail).toContainText(REVIEWER)
    await expect(trail).not.toContainText("passport.pdf")
    const app = (await stored(page)).applications.find((item: { id: string }) => item.id === "app-s2")
    expect(app.audit.at(-1)).toMatchObject({ action: "evidence-viewed", actorRef: REVIEWER })
  })

  test("approval is blocked until the ID and a credential are verified, and records exactly what was checked", async ({ page }) => {
    await actAs(page, "reviewer", REVIEWER, "/dashboard/reviewer/app-s1")
    await page.getByRole("button", { name: "Start review" }).click()
    await expect(page.getByRole("status").filter({ hasText: "now reviewing" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Approve application" })).toBeDisabled()
    await expect(page.getByText("Verify the applicant's identity before approving.")).toBeVisible()

    await page.getByLabel("Identity").selectOption("verified")
    await page.getByLabel("Mentoring").selectOption("verified")
    await expect(page.getByText("Save the check results first.")).toBeVisible()
    await page.getByRole("button", { name: "Save check results" }).click()
    await expect(page.getByText("Verify at least one of education, employment or expertise before approving.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Approve application" })).toBeDisabled()

    await page.getByLabel("Education").selectOption("verified")
    await page.getByLabel("Mentoring").selectOption("unchecked")
    await page.getByRole("button", { name: "Save check results" }).click()
    await page.getByLabel("Internal note (reviewers only)").fill("Degree confirmed by email.")
    await page.getByRole("button", { name: "Approve application" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Application approved" })).toBeVisible()

    const app = (await stored(page)).applications.find((item: { id: string }) => item.id === "app-s1")
    expect(app.status).toBe("approved")
    expect(app.decision.checks).toEqual({ identity: true, education: true, employment: false, expertise: false, mentoring: false })
    expect(app.audit.map((entry: { action: string }) => entry.action)).toEqual(["submitted", "review-started", "checks-recorded", "checks-recorded", "approved"])
    await expect(page.getByRole("list", { name: "Audit trail" })).not.toContainText("Degree confirmed")
  })

  test("a rejection needs a reason, and decisions can't be repeated", async ({ page }) => {
    await actAs(page, "reviewer", REVIEWER, "/dashboard/reviewer/app-s2")
    await page.getByRole("radio", { name: "Not approve" }).click()
    await page.getByRole("button", { name: "Not approve" }).last().click()
    await expect(page.getByRole("alert").filter({ hasText: "Give the applicant a reason" })).toBeVisible()
    await page.getByLabel("Reason shown to the applicant").fill("We couldn't confirm the enrolment letter.")
    await page.getByRole("button", { name: "Not approve" }).last().click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Not approve" }).click()
    await expect(page.getByRole("status").filter({ hasText: "not approved" })).toBeVisible()
    await expect(page.getByRole("radio", { name: "Approve" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Not approved" })).toBeVisible()
  })
})

test.describe("end to end", () => {
  test("information is requested, answered, and the application returns to review", async ({ page }) => {
    await applyAsSara(page)
    await reviewSara(page)
    await page.getByRole("button", { name: "Start review" }).click()
    await page.getByRole("radio", { name: "Request changes" }).click()
    await page.getByRole("checkbox", { name: "Education" }).check()
    await page.getByLabel("What should they add?").fill("Please add a document that confirms your degree.")
    await page.getByRole("button", { name: "Send request" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Information requested" })).toBeVisible()

    await actAs(page, "learner", SARA, "/become-a-mentor")
    await expect(page.getByRole("heading", { name: "More information needed" })).toBeVisible()
    await expect(page.getByText("Please add a document that confirms your degree.")).toBeVisible()
    await page.getByRole("button", { name: "Add information and resubmit" }).click()
    await expect(page.getByText(/A reviewer asked for more on: education/)).toBeVisible()
    await next(page)
    await next(page)
    await page.getByRole("checkbox").check()
    await page.getByRole("button", { name: "Resubmit application" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Add the evidence the reviewer asked for" })).toBeVisible()

    // Adding the requested evidence happens after the request, so move the fixed clock forward a day.
    await page.clock.setFixedTime(new Date("2026-10-19T06:00:00Z"))
    await page.getByRole("button", { name: "Change evidence" }).click()
    await addFile(page, "education", "Degree certificate", "degree.pdf")
    await next(page)
    await next(page)
    await page.getByRole("checkbox").check()
    await page.getByRole("button", { name: "Resubmit application" }).click()
    await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible()

    await reviewSara(page)
    await expect(page.getByRole("list", { name: "Audit trail" })).toContainText("Resubmitted")
    await expect(page.getByRole("button", { name: "Start review" })).toBeVisible()
  })

  test("an approved mentor sees a public-safe preview with precise badges and no private data", async ({ page }) => {
    await applyAsSara(page)
    await reviewSara(page)
    await page.getByRole("button", { name: "Start review" }).click()
    await page.getByLabel("Identity", { exact: true }).selectOption("verified")
    await page.getByLabel("Employment", { exact: true }).selectOption("verified")
    await page.getByLabel("Expertise", { exact: true }).selectOption("not-verified")
    await page.getByRole("button", { name: "Save check results" }).click()
    await page.getByLabel("Message to the applicant (optional)").fill("Welcome aboard.")
    await page.getByLabel("Internal note (reviewers only)").fill("INTERNAL-ONLY-NOTE")
    await page.getByRole("button", { name: "Approve application" }).click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Approve" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Application approved" })).toBeVisible()

    await actAs(page, "learner", SARA, "/become-a-mentor")
    await expect(page.getByRole("heading", { name: "Approved" }).first()).toBeVisible()
    const preview = page.getByLabel("Public profile preview")
    await expect(preview).toContainText("Sara Khan")
    await expect(preview).toContainText("ID and employment checked")
    await expect(preview).toContainText("ID checked")
    await expect(preview).toContainText("Employment checked")
    await expect(preview).toContainText("Education not checked yet")
    await expect(preview).toContainText("Expertise not checked yet")
    await expect(preview).toContainText("aren't an endorsement by any employer or university")
    for (const secret of [SARA, "example.com/sara", "id.pdf", "National ID", "INTERNAL-ONLY-NOTE", REVIEWER]) {
      await expect(preview).not.toContainText(secret)
    }
    await expect(page.getByRole("main")).not.toContainText("INTERNAL-ONLY-NOTE")
  })

  test("a rejection shows the reason, hides internal notes, and allows a fresh application", async ({ page }) => {
    await applyAsSara(page)
    await reviewSara(page)
    await page.getByRole("button", { name: "Start review" }).click()
    await page.getByRole("radio", { name: "Not approve" }).click()
    await page.getByLabel("Reason shown to the applicant").fill("We couldn't confirm your employment.")
    await page.getByLabel("Internal note (reviewers only)").fill("INTERNAL-ONLY-NOTE")
    await page.getByRole("button", { name: "Not approve" }).last().click()
    await page.getByRole("alertdialog").getByRole("button", { name: "Not approve" }).click()
    await expect(page.getByRole("status").filter({ hasText: "not approved" })).toBeVisible()

    await actAs(page, "learner", SARA, "/become-a-mentor")
    await expect(page.getByRole("heading", { name: "Not approved" }).first()).toBeVisible()
    await expect(page.getByText("We couldn't confirm your employment.")).toBeVisible()
    await expect(page.getByText("INTERNAL-ONLY-NOTE")).toHaveCount(0)
    await expect(page.getByLabel("Public profile preview")).toHaveCount(0)
    await page.getByRole("button", { name: "Start a new application" }).click()
    await expect(page.locator("#ap-name")).toBeVisible()
  })

  test("a different learner never sees someone else's application", async ({ page }) => {
    await applyAsSara(page)
    await actAs(page, "learner", "other@example.com", "/become-a-mentor")
    await expect(page.getByRole("button", { name: "Start application" })).toBeVisible()
    await expect(page.getByText("Submitted")).toHaveCount(0)
  })
})

test.describe("public profiles", () => {
  test("catalog profiles say exactly what was checked", async ({ page }) => {
    await page.goto("/mentors/tanvir-rahman")
    const section = page.locator("section[aria-labelledby=verification]")
    await expect(section).toContainText("ID checked")
    await expect(section).toContainText("Education checked")
    await expect(section).toContainText("Employment checked")
    await expect(section).toContainText("Expertise reviewed")
    await expect(section).toContainText("Mentoring not checked yet")
    await expect(section).toContainText("isn't a guarantee of results")
    await expect(section).not.toContainText(/endorsed|guaranteed|best|top-rated/i)
  })
})

test.describe("layout", () => {
  test("the application and review pages fit the screen", async ({ page }) => {
    await actAs(page, "learner", SARA, "/become-a-mentor")
    await page.getByRole("button", { name: "Start application" }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
    await actAs(page, "reviewer", REVIEWER, "/dashboard/reviewer")
    await expect(page.getByRole("heading", { name: "Applications", level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
    await page.goto("/dashboard/reviewer/app-s2")
    await expect(page.getByRole("heading", { name: "Rashed Karim" })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
  })
})
