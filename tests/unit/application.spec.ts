import { expect, test } from "@playwright/test"

import { demoApplications } from "@/lib/data/applications"
import {
  approvalBlocker,
  canMove,
  createDraft,
  emptyData,
  isEditable,
  publicProfileOf,
  review,
  statusMoves,
  submit,
  updateDraft,
  validateAll,
  validateEvidence,
  validateStep,
  viewEvidence,
  visibleTo,
  type Application,
  type ApplicationData,
  type ApplicationStatus,
  type EvidenceItem,
  type Verdicts,
} from "@/lib/mentor-application"
import type { Principal } from "@/lib/permissions"
import { checkKinds, hasCoreChecks, verificationSummary } from "@/lib/verification"

const T0 = new Date("2026-10-18T06:00:00Z")
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000)

const applicant: Principal = { role: "learner", email: "sara@example.com" }
const reviewer: Principal = { role: "reviewer", email: "rev@example.com" }
const other: Principal = { role: "learner", email: "someone@example.com" }

const file = (id: string, kind: EvidenceItem["kind"], overrides: Partial<EvidenceItem> = {}): EvidenceItem => ({
  id,
  kind,
  form: "file",
  label: `${kind} document`,
  fileName: `${kind}.pdf`,
  fileType: "application/pdf",
  fileSize: 100_000,
  addedAt: at(0).toISOString(),
  ...overrides,
})

function validData(): ApplicationData {
  return {
    basic: { fullName: "Sara Khan", city: "Dhaka", country: "Bangladesh", timezone: "Asia/Dhaka" },
    background: { path: "professional", role: "Backend Engineer", organization: "Fintech company", years: "5", education: "BSc in Computer Science, Dhaka", profileUrl: "https://example.com/sara" },
    expertise: { track: "tech", categories: ["software-engineering"], skills: "Go, System design", audience: "Engineers preparing for backend interviews.", languages: ["English", "Bangla"], bio: "I build payment systems and help engineers prepare for system design interviews with practical, structured practice." },
    evidence: [file("e1", "identity"), file("e2", "employment", { form: "link", url: "https://example.com/sara/work", fileName: undefined, fileType: undefined, fileSize: undefined })],
    offers: { types: ["one-on-one"], startingPrice: "1500", durationMinutes: "45", days: [1, 3], times: ["20:00"] },
  }
}

const verdicts = (overrides: Partial<Verdicts> = {}): Verdicts => ({ identity: "unchecked", education: "unchecked", employment: "unchecked", expertise: "unchecked", mentoring: "unchecked", ...overrides })

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(`expected success: ${JSON.stringify(result)}`)
  return result as Extract<T, { ok: true }>
}

function drafted() {
  const created = ok(createDraft(applicant, [], "A1", T0))
  return ok(updateDraft(applicant, created.applications, "A1", validData(), at(1))).applications
}

function submitted() {
  return ok(submit(applicant, drafted(), "A1", at(2))).applications
}

function inReview(verdictsToRecord?: Verdicts) {
  let apps = ok(review(reviewer, submitted(), "A1", { kind: "start" }, at(3))).applications
  if (verdictsToRecord) apps = ok(review(reviewer, apps, "A1", { kind: "record-checks", verdicts: verdictsToRecord }, at(4))).applications
  return apps
}

const get = (apps: Application[]) => apps.find((item) => item.id === "A1")!

test.describe("step validation", () => {
  test("a complete application is valid", () => {
    expect(validateAll(validData())).toEqual({})
  })

  test("basic information", () => {
    const data = validData()
    expect(validateStep("basic", { ...data, basic: { ...data.basic, fullName: "S" } }).fullName).toBeTruthy()
    expect(validateStep("basic", { ...data, basic: { ...data.basic, city: "" } }).city).toBeTruthy()
    expect(validateStep("basic", { ...data, basic: { ...data.basic, timezone: "Mars/Base" } }).timezone).toBeTruthy()
  })

  test("background", () => {
    const data = validData()
    const background = (patch: Partial<ApplicationData["background"]>) => validateStep("background", { ...data, background: { ...data.background, ...patch } })
    expect(background({ role: "" }).role).toBeTruthy()
    expect(background({ years: "-1" }).years).toBeTruthy()
    expect(background({ years: "61" }).years).toBeTruthy()
    expect(background({ years: "five" }).years).toBeTruthy()
    expect(background({ education: "BS" }).education).toBeTruthy()
    expect(background({ profileUrl: "not a url" }).profileUrl).toBeTruthy()
    expect(background({ profileUrl: "javascript:alert(1)" }).profileUrl).toBeTruthy()
    expect(background({ profileUrl: "" })).toEqual({})
  })

  test("expertise and audience", () => {
    const data = validData()
    const expertise = (patch: Partial<ApplicationData["expertise"]>) => validateStep("expertise", { ...data, expertise: { ...data.expertise, ...patch } })
    expect(expertise({ categories: [] }).categories).toBeTruthy()
    expect(expertise({ categories: ["software-engineering", "ai-ml", "career-growth", "interview-prep"] }).categories).toBeTruthy()
    expect(expertise({ skills: "" }).skills).toBeTruthy()
    expect(expertise({ skills: "a,b,c,d,e,f,g,h,i" }).skills).toBeTruthy()
    expect(expertise({ audience: "short" }).audience).toBeTruthy()
    expect(expertise({ languages: [] }).languages).toBeTruthy()
    expect(expertise({ bio: "too short" }).bio).toBeTruthy()
  })

  test("evidence needs an ID document and one credential", () => {
    const data = validData()
    expect(validateStep("evidence", { ...data, evidence: [] }).identity).toBeTruthy()
    expect(validateStep("evidence", { ...data, evidence: [file("e1", "identity")] }).credential).toBeTruthy()
    expect(validateStep("evidence", { ...data, evidence: [file("e2", "employment", { form: "link", url: "https://example.com" })] }).identity).toBeTruthy()
    expect(validateStep("evidence", { ...data, evidence: [file("e1", "identity"), file("e3", "mentoring")] }).credential).toBeTruthy()
  })

  test("evidence items are checked for type, size, links and sensitive numbers", () => {
    expect(validateEvidence(file("x", "identity"))).toBeUndefined()
    expect(validateEvidence(file("x", "identity", { fileType: "application/zip" }))).toContain("PDF")
    expect(validateEvidence(file("x", "identity", { fileSize: 6 * 1024 * 1024 }))).toContain("5 MB")
    expect(validateEvidence(file("x", "identity", { fileSize: 0 }))).toContain("5 MB")
    expect(validateEvidence(file("x", "identity", { form: "link", url: "https://example.com" }))).toContain("uploaded document")
    expect(validateEvidence(file("x", "employment", { form: "link", url: "ftp://example.com" }))).toContain("web address")
    expect(validateEvidence(file("x", "employment", { form: "reference", reference: "short" }))).toBeTruthy()
    expect(validateEvidence(file("x", "employment", { label: "ID 1234567890123" }))).toContain("ID or account numbers")
    expect(validateEvidence(file("x", "employment", { form: "reference", reference: "My passport is 123 456 789 012 please check" }))).toContain("ID or account numbers")
    expect(validateEvidence(file("x", "employment", { label: "ab" }))).toBeTruthy()
  })

  test("offers and availability", () => {
    const data = validData()
    const offers = (patch: Partial<ApplicationData["offers"]>) => validateStep("offers", { ...data, offers: { ...data.offers, ...patch } })
    expect(offers({ types: [] }).types).toBeTruthy()
    expect(offers({ startingPrice: "10" }).startingPrice).toBeTruthy()
    expect(offers({ startingPrice: "abc" }).startingPrice).toBeTruthy()
    expect(offers({ startingPrice: "100001" }).startingPrice).toBeTruthy()
    expect(offers({ durationMinutes: "5" }).durationMinutes).toBeTruthy()
    expect(offers({ types: ["review"], durationMinutes: "" }).durationMinutes).toBeUndefined()
    expect(offers({ days: [] }).days).toBeTruthy()
    expect(offers({ days: [9] }).days).toBeTruthy()
    expect(offers({ times: ["20:30"] }).times).toBeTruthy()
  })

  test("an empty application fails every step", () => {
    expect(Object.keys(validateAll(emptyData())).sort()).toEqual(["background", "basic", "evidence", "expertise", "offers"])
  })
})

test.describe("status machine", () => {
  const all = Object.keys(statusMoves) as ApplicationStatus[]

  test("only the intended moves are allowed", () => {
    expect(statusMoves.draft).toEqual(["submitted"])
    expect(statusMoves["under-review"]).toEqual(["info-required", "approved", "rejected"])
    expect(statusMoves.approved).toEqual([])
    expect(statusMoves.rejected).toEqual([])
    for (const [from, to] of [["draft", "approved"], ["submitted", "approved"], ["submitted", "rejected"], ["info-required", "approved"], ["approved", "rejected"], ["rejected", "approved"]] as const) {
      expect(canMove(from, to), `${from} -> ${to}`).toBe(false)
    }
    for (const from of all) for (const to of statusMoves[from]) expect(all).toContain(to)
  })

  test("only drafts and information requests can be edited", () => {
    expect(all.filter(isEditable)).toEqual(["draft", "info-required"])
  })
})

test.describe("applying", () => {
  test("requires login and refuses reviewer accounts", () => {
    expect(createDraft(null, [], "A1", T0)).toMatchObject({ ok: false, code: "forbidden" })
    expect(createDraft(reviewer, [], "A1", T0)).toMatchObject({ ok: false, code: "forbidden" })
  })

  test("a new draft belongs to its applicant and starts in the audit trail", () => {
    const created = ok(createDraft(applicant, [], "A1", T0))
    expect(created.application).toMatchObject({ status: "draft", applicantEmail: "sara@example.com" })
    expect(created.application.audit).toMatchObject([{ action: "created", actor: "applicant", actorRef: "sara@example.com", to: "draft" }])
  })

  test("one application at a time, and none after approval", () => {
    const first = ok(createDraft(applicant, [], "A1", T0)).applications
    expect(createDraft(applicant, first, "A2", T0)).toMatchObject({ ok: false, code: "duplicate" })
    expect(createDraft({ ...applicant, email: "SARA@example.com" }, first, "A2", T0)).toMatchObject({ ok: false, code: "duplicate" })
    const approved = first.map((item) => ({ ...item, status: "approved" as const }))
    expect(createDraft(applicant, approved, "A2", T0)).toMatchObject({ ok: false, code: "duplicate" })
    const rejected = first.map((item) => ({ ...item, status: "rejected" as const }))
    expect(createDraft(applicant, rejected, "A2", T0).ok).toBe(true)
  })

  test("only the owner can edit a draft", () => {
    const apps = ok(createDraft(applicant, [], "A1", T0)).applications
    expect(updateDraft(other, apps, "A1", validData(), at(1))).toMatchObject({ ok: false, code: "forbidden" })
    expect(updateDraft(reviewer, apps, "A1", validData(), at(1))).toMatchObject({ ok: false, code: "forbidden" })
    expect(updateDraft(null, apps, "A1", validData(), at(1))).toMatchObject({ ok: false, code: "forbidden" })
    expect(updateDraft(applicant, apps, "ghost", validData(), at(1))).toMatchObject({ ok: false, code: "not-found" })
  })

  test("submitting an incomplete application lists the problems and changes nothing", () => {
    const apps = ok(createDraft(applicant, [], "A1", T0)).applications
    const result = submit(applicant, apps, "A1", at(1))
    expect(result).toMatchObject({ ok: false, code: "invalid", errors: { basic: expect.anything(), evidence: expect.anything() } })
  })

  test("a complete draft submits once, and is then locked", () => {
    const apps = submitted()
    expect(get(apps)).toMatchObject({ status: "submitted", submittedAt: at(2).toISOString() })
    expect(get(apps).audit.map((entry) => entry.action)).toEqual(["created", "submitted"])
    expect(submit(applicant, apps, "A1", at(3))).toMatchObject({ ok: false, code: "invalid-transition" })
    expect(updateDraft(applicant, apps, "A1", validData(), at(3))).toMatchObject({ ok: false, code: "invalid-transition" })
  })

  test("nobody else can submit it", () => {
    const apps = drafted()
    expect(submit(other, apps, "A1", at(2))).toMatchObject({ ok: false, code: "forbidden" })
    expect(submit(reviewer, apps, "A1", at(2))).toMatchObject({ ok: false, code: "forbidden" })
  })
})

test.describe("reviewing", () => {
  test("only reviewers can act, and never on drafts", () => {
    for (const actor of [applicant, other, { role: "mentor" as const, email: "m@example.com" }, null]) {
      expect(review(actor, submitted(), "A1", { kind: "start" }, at(3)), String(actor?.role)).toMatchObject({ ok: false, code: "forbidden" })
    }
    expect(review(reviewer, drafted(), "A1", { kind: "start" }, at(3))).toMatchObject({ ok: false, code: "not-found" })
  })

  test("a reviewer can't review their own application", () => {
    const own: Principal = { role: "reviewer", email: "sara@example.com" }
    expect(review(own, submitted(), "A1", { kind: "start" }, at(3))).toMatchObject({ ok: false, code: "conflict" })
    expect(viewEvidence(own, submitted(), "A1", "e1", at(3))).toMatchObject({ ok: false, code: "conflict" })
  })

  test("a submitted application is taken for review once", () => {
    const apps = inReview()
    expect(get(apps).status).toBe("under-review")
    expect(review(reviewer, apps, "A1", { kind: "start" }, at(5))).toMatchObject({ ok: false, code: "invalid-transition" })
  })

  test("decisions need the review to have started", () => {
    expect(review(reviewer, submitted(), "A1", { kind: "reject", message: "Not enough evidence provided." }, at(3))).toMatchObject({ ok: false, code: "invalid-transition" })
    expect(review(reviewer, submitted(), "A1", { kind: "approve" }, at(3))).toMatchObject({ ok: false, code: "invalid-transition" })
  })

  test("approval needs a verified ID and one credential check, and mentoring alone isn't enough", () => {
    expect(approvalBlocker(verdicts())).toContain("identity")
    expect(approvalBlocker(verdicts({ identity: "verified" }))).toContain("at least one")
    expect(approvalBlocker(verdicts({ identity: "verified", mentoring: "verified" }))).toContain("at least one")
    expect(approvalBlocker(verdicts({ education: "verified", employment: "verified" }))).toContain("identity")
    expect(approvalBlocker(verdicts({ identity: "verified", expertise: "verified" }))).toBeNull()
    expect(review(reviewer, inReview(), "A1", { kind: "approve" }, at(6))).toMatchObject({ ok: false, code: "invalid" })
  })

  test("approving records exactly what was verified", () => {
    const apps = inReview(verdicts({ identity: "verified", employment: "verified", education: "not-verified" }))
    const result = ok(review(reviewer, apps, "A1", { kind: "approve", message: "Welcome aboard.", internalNote: "Employer confirmed by email." }, at(6)))
    expect(result.application.status).toBe("approved")
    expect(result.application.decision).toMatchObject({
      outcome: "approved",
      reviewer: "rev@example.com",
      checks: { identity: true, employment: true, education: false, expertise: false, mentoring: false },
    })
    expect(review(reviewer, result.applications, "A1", { kind: "reject", message: "Changed my mind about this." }, at(7))).toMatchObject({ ok: false, code: "invalid-transition" })
  })

  test("rejection needs a reason the applicant can read", () => {
    const apps = inReview()
    expect(review(reviewer, apps, "A1", { kind: "reject", message: "" }, at(6))).toMatchObject({ ok: false, code: "invalid" })
    expect(review(reviewer, apps, "A1", { kind: "reject", message: "no" }, at(6))).toMatchObject({ ok: false, code: "invalid" })
    expect(review(reviewer, apps, "A1", { kind: "reject", message: "x".repeat(501) }, at(6))).toMatchObject({ ok: false, code: "invalid" })
    const result = ok(review(reviewer, apps, "A1", { kind: "reject", message: "We couldn't confirm your experience." }, at(6)))
    expect(result.application).toMatchObject({ status: "rejected", decision: { outcome: "rejected", message: "We couldn't confirm your experience." } })
    expect(review(reviewer, result.applications, "A1", { kind: "start" }, at(7))).toMatchObject({ ok: false })
  })

  test("asking for more information needs a message and what to add", () => {
    const apps = inReview()
    expect(review(reviewer, apps, "A1", { kind: "request-info", message: "short", kinds: ["education"] }, at(6))).toMatchObject({ ok: false, code: "invalid" })
    expect(review(reviewer, apps, "A1", { kind: "request-info", message: "Please add proof of your degree.", kinds: [] }, at(6))).toMatchObject({ ok: false, code: "invalid" })
    const result = ok(review(reviewer, apps, "A1", { kind: "request-info", message: "Please add proof of your degree.", kinds: ["education"] }, at(6)))
    expect(result.application).toMatchObject({ status: "info-required", infoRequest: { kinds: ["education"], reviewer: "rev@example.com" } })
  })

  test("the applicant must answer the request before resubmitting, and can then edit", () => {
    const requested = ok(review(reviewer, inReview(), "A1", { kind: "request-info", message: "Please add proof of your degree.", kinds: ["education"] }, at(10))).applications
    expect(submit(applicant, requested, "A1", at(11))).toMatchObject({ ok: false, code: "invalid" })

    const added = { ...validData(), evidence: [...validData().evidence, file("e9", "education", { addedAt: at(12).toISOString() })] }
    const edited = ok(updateDraft(applicant, requested, "A1", added, at(12))).applications
    const resubmitted = ok(submit(applicant, edited, "A1", at(13)))
    expect(resubmitted.application.status).toBe("submitted")
    expect(resubmitted.application.infoRequest?.answeredAt).toBe(at(13).toISOString())
    expect(resubmitted.application.audit.at(-1)).toMatchObject({ action: "resubmitted", from: "info-required", to: "submitted" })
  })

  test("old evidence doesn't answer a new request", () => {
    const requested = ok(review(reviewer, inReview(), "A1", { kind: "request-info", message: "Please add proof of your degree.", kinds: ["education"] }, at(10))).applications
    const staleEducation = { ...validData(), evidence: [...validData().evidence, file("e9", "education", { addedAt: at(0).toISOString() })] }
    const edited = ok(updateDraft(applicant, requested, "A1", staleEducation, at(12))).applications
    expect(submit(applicant, edited, "A1", at(13))).toMatchObject({ ok: false, code: "invalid" })
  })

  test("recording check results needs a valid result for every check", () => {
    const apps = inReview()
    const bad = { ...verdicts(), identity: "maybe" } as unknown as Verdicts
    expect(review(reviewer, apps, "A1", { kind: "record-checks", verdicts: bad }, at(5))).toMatchObject({ ok: false, code: "invalid" })
  })
})

test.describe("evidence and the audit trail", () => {
  test("opening evidence is logged by kind and id, never by name, link or content", () => {
    const result = ok(viewEvidence(reviewer, inReview(), "A1", "e1", at(5)))
    expect(result.evidence).toMatchObject({ id: "e1", kind: "identity" })
    const logged = result.application.audit.at(-1)!
    expect(logged).toMatchObject({ action: "evidence-viewed", actor: "reviewer", actorRef: "rev@example.com" })
    expect(logged.detail).toContain("identity")
    expect(JSON.stringify(result.application.audit)).not.toContain("identity.pdf")
    expect(JSON.stringify(result.application.audit)).not.toContain("example.com/sara")
  })

  test("applicants, other learners and signed-out visitors can't open evidence", () => {
    for (const actor of [applicant, other, null]) {
      expect(viewEvidence(actor, inReview(), "A1", "e1", at(5))).toMatchObject({ ok: false, code: "forbidden" })
    }
    expect(viewEvidence(reviewer, inReview(), "A1", "nope", at(5))).toMatchObject({ ok: false, code: "not-found" })
    expect(viewEvidence(reviewer, drafted(), "A1", "e1", at(5))).toMatchObject({ ok: false, code: "not-found" })
  })

  test("every step is recorded in order with who did it", () => {
    let apps = inReview(verdicts({ identity: "verified", employment: "verified" }))
    apps = ok(review(reviewer, apps, "A1", { kind: "approve", internalNote: "SECRET-NOTE" }, at(9))).applications
    const trail = get(apps).audit
    expect(trail.map((entry) => entry.action)).toEqual(["created", "submitted", "review-started", "checks-recorded", "approved"])
    expect(trail.map((entry) => entry.actor)).toEqual(["applicant", "applicant", "reviewer", "reviewer", "reviewer"])
    expect(trail.at(-1)).toMatchObject({ from: "under-review", to: "approved" })
    expect(JSON.stringify(trail)).not.toContain("SECRET-NOTE")
    expect(new Set(trail.map((entry) => entry.id)).size).toBe(trail.length)
  })
})

test.describe("who can see what", () => {
  test("applicants see only their own application, without internal notes", () => {
    const rejected = ok(review(reviewer, inReview(), "A1", { kind: "reject", message: "We couldn't confirm your experience.", internalNote: "SECRET-NOTE" }, at(6))).applications
    const mine = visibleTo(applicant, [...rejected, ...demoApplications])
    expect(mine.map((item) => item.id)).toEqual(["A1"])
    expect(JSON.stringify(mine)).not.toContain("SECRET-NOTE")
    expect(mine[0].decision?.message).toBe("We couldn't confirm your experience.")
    expect(visibleTo(other, rejected)).toEqual([])
    expect(visibleTo(null, rejected)).toEqual([])
  })

  test("reviewers see submitted applications with internal notes, but never drafts or their own", () => {
    const rejected = ok(review(reviewer, inReview(), "A1", { kind: "reject", message: "We couldn't confirm your experience.", internalNote: "SECRET-NOTE" }, at(6))).applications
    const queue = visibleTo(reviewer, [...rejected, ...demoApplications])
    expect(queue.some((item) => item.id === "A1")).toBe(true)
    expect(JSON.stringify(queue)).toContain("SECRET-NOTE")
    expect(visibleTo(reviewer, drafted())).toEqual([])
    expect(visibleTo({ role: "reviewer", email: "sara@example.com" }, submitted())).toEqual([])
  })
})

test.describe("public profile", () => {
  const approvedApp = () => {
    const apps = inReview(verdicts({ identity: "verified", employment: "verified", expertise: "verified" }))
    return get(ok(review(reviewer, apps, "A1", { kind: "approve", message: "Welcome.", internalNote: "SECRET-NOTE" }, at(6))).applications)
  }

  test("nothing is public until approval", () => {
    for (const apps of [drafted(), submitted(), inReview()]) expect(publicProfileOf(get(apps))).toBeNull()
    const rejected = get(ok(review(reviewer, inReview(), "A1", { kind: "reject", message: "We couldn't confirm your experience." }, at(6))).applications)
    expect(publicProfileOf(rejected)).toBeNull()
  })

  test("an approved profile shows the public fields and exactly the checks that were verified", () => {
    const profile = publicProfileOf(approvedApp())!
    expect(profile).toMatchObject({ name: "Sara Khan", role: "Backend Engineer", location: "Dhaka, Bangladesh", verification: { identity: true, employment: true, expertise: true, education: false, mentoring: false } })
    expect(profile.skills).toEqual(["Go", "System design"])
    expect(verificationSummary(profile.verification)).toBe("ID and employment checked, expertise reviewed")
  })

  test("no private information can leak into the public profile", () => {
    const serialized = JSON.stringify(publicProfileOf(approvedApp()))
    for (const secret of ["sara@example.com", "example.com/sara", "identity.pdf", "employment document", "SECRET-NOTE", "rev@example.com", "audit", "evidence", "profileUrl", "internalNote"]) {
      expect(serialized, secret).not.toContain(secret)
    }
  })

  test("badges use precise wording and never over-claim", () => {
    expect(verificationSummary({ identity: true, education: true, employment: true, expertise: false, mentoring: false })).toBe("ID, education and employment checked")
    expect(verificationSummary({ identity: false, education: false, employment: false, expertise: true, mentoring: true })).toBe("expertise and mentoring reviewed")
    expect(verificationSummary({ identity: false, education: false, employment: false, expertise: false, mentoring: false })).toBe("Not verified yet")
    expect(hasCoreChecks({ identity: true, education: false, employment: false, expertise: true, mentoring: true })).toBe(false)
    expect(checkKinds).toHaveLength(5)
  })
})

test.describe("sample applications", () => {
  test("are flagged as sample, hold no document contents, and cover the review states", () => {
    expect(demoApplications.every((item) => item.sample)).toBe(true)
    expect(demoApplications.map((item) => item.status).sort()).toEqual(["info-required", "rejected", "submitted", "under-review"])
    for (const item of demoApplications) for (const evidence of item.data.evidence) expect(Object.keys(evidence)).not.toContain("content")
  })
})
