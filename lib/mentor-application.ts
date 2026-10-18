import { categories } from "@/lib/categories"
import { canReviewApplications, type Principal } from "@/lib/permissions"
import { isTimeZone } from "@/lib/timezone"
import type { CategoryId, Language, OfferType, Track } from "@/lib/types"
import { checkKinds, noChecks, type CheckKind, type Verification } from "@/lib/verification"

export type ApplicationStatus = "draft" | "submitted" | "under-review" | "info-required" | "approved" | "rejected"

export const statusLabels: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  "under-review": "Under review",
  "info-required": "More information needed",
  approved: "Approved",
  rejected: "Not approved",
}

// draft -> submitted -> under-review -> one of three outcomes; the applicant answers a request and goes back to submitted.
export const statusMoves: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ["submitted"],
  submitted: ["under-review"],
  "under-review": ["info-required", "approved", "rejected"],
  "info-required": ["submitted"],
  approved: [],
  rejected: [],
}

export const canMove = (from: ApplicationStatus, to: ApplicationStatus) => statusMoves[from].includes(to)
export const isActive = (status: ApplicationStatus) => status !== "approved" && status !== "rejected"
// Applicants can change their answers only while a draft or when more information was asked for.
export const isEditable = (status: ApplicationStatus) => status === "draft" || status === "info-required"

export type EvidenceItem = {
  id: string
  // Which check this supports.
  kind: CheckKind
  form: "file" | "link" | "reference"
  label: string
  // For files only the name, type and size are kept: the document itself is never read or stored here.
  fileName?: string
  fileType?: string
  fileSize?: number
  url?: string
  reference?: string
  addedAt: string
}

export type ApplicationData = {
  basic: { fullName: string; city: string; country: string; timezone: string }
  background: { path: "professional" | "academic" | "both"; role: string; organization: string; years: string; education: string; profileUrl: string }
  expertise: { track: Track; categories: CategoryId[]; skills: string; audience: string; languages: Language[]; bio: string }
  evidence: EvidenceItem[]
  offers: { types: OfferType[]; startingPrice: string; durationMinutes: string; days: number[]; times: string[] }
}

export type Verdict = "verified" | "not-verified" | "unchecked"
export type Verdicts = Record<CheckKind, Verdict>

export type InfoRequest = { at: string; reviewer: string; message: string; kinds: CheckKind[]; answeredAt?: string }

export type Decision = {
  outcome: "approved" | "rejected"
  at: string
  reviewer: string
  checks: Verification
  // Shown to the applicant.
  message?: string
  // Reviewers only.
  internalNote?: string
}

export type AuditAction = "created" | "submitted" | "review-started" | "checks-recorded" | "evidence-viewed" | "info-requested" | "resubmitted" | "approved" | "rejected"

export type AuditEntry = {
  id: string
  at: string
  actor: "applicant" | "reviewer"
  actorRef: string
  action: AuditAction
  from?: ApplicationStatus
  to?: ApplicationStatus
  // Metadata only, such as the kind of evidence opened; never document contents.
  detail?: string
}

export type Application = {
  id: string
  applicantEmail: string
  status: ApplicationStatus
  data: ApplicationData
  verdicts: Verdicts
  createdAt: string
  updatedAt: string
  submittedAt?: string
  infoRequest?: InfoRequest
  decision?: Decision
  audit: AuditEntry[]
  // Made-up demo application.
  sample?: true
}

export const noVerdicts: Verdicts = { identity: "unchecked", education: "unchecked", employment: "unchecked", expertise: "unchecked", mentoring: "unchecked" }

export function emptyData(): ApplicationData {
  return {
    basic: { fullName: "", city: "", country: "Bangladesh", timezone: "Asia/Dhaka" },
    background: { path: "professional", role: "", organization: "", years: "", education: "", profileUrl: "" },
    expertise: { track: "tech", categories: [], skills: "", audience: "", languages: ["English"], bio: "" },
    evidence: [],
    offers: { types: ["one-on-one"], startingPrice: "", durationMinutes: "45", days: [], times: [] },
  }
}

export const steps = ["basic", "background", "expertise", "evidence", "offers"] as const
export type Step = (typeof steps)[number]
export type StepErrors = Record<string, string>

const MAX_EVIDENCE = 12
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const fileTypes = ["application/pdf", "image/jpeg", "image/png"]
const whole = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null)
const between = (value: string, min: number, max: number) => value.trim().length >= min && value.trim().length <= max
// A long run of digits is almost always an ID or card number, which has no place in free text.
const looksLikeIdNumber = (value: string) => /\d{9,}/.test(value.replace(/[\s-]/g, ""))

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

export function validateStep(step: Step, data: ApplicationData): StepErrors {
  const errors: StepErrors = {}
  if (step === "basic") {
    const { fullName, city, country, timezone } = data.basic
    if (!between(fullName, 2, 80)) errors.fullName = "Enter your full name"
    if (!between(city, 2, 60)) errors.city = "Enter your city"
    if (!between(country, 2, 60)) errors.country = "Enter your country"
    if (!isTimeZone(timezone)) errors.timezone = "Choose a timezone"
  }
  if (step === "background") {
    const { path, role, organization, years, education, profileUrl } = data.background
    if (!["professional", "academic", "both"].includes(path)) errors.path = "Choose one"
    if (!between(role, 2, 80)) errors.role = path === "academic" ? "Enter your current position or program" : "Enter your current or most recent role"
    if (!between(organization, 2, 80)) errors.organization = "Enter where you work or study"
    const parsed = whole(years)
    if (parsed === null || parsed > 60) errors.years = "Enter whole years, from 0 to 60"
    if (!between(education, 3, 120)) errors.education = "Enter your highest degree and institution"
    if (profileUrl.trim() && !isHttpUrl(profileUrl.trim())) errors.profileUrl = "Enter a full web address like https://…"
  }
  if (step === "expertise") {
    const { categories: chosen, skills, audience, languages, bio } = data.expertise
    const known = new Set<string>(categories.map((category) => category.id))
    if (chosen.length < 1 || chosen.length > 3 || chosen.some((id) => !known.has(id))) errors.categories = "Pick one to three areas"
    const list = skills.split(",").map((item) => item.trim()).filter(Boolean)
    if (list.length < 1 || list.length > 8 || list.some((item) => item.length > 40)) errors.skills = "List 1 to 8 skills, separated by commas"
    if (!between(audience, 10, 200)) errors.audience = "Describe who you help, in 10 to 200 characters"
    if (languages.length < 1) errors.languages = "Pick at least one language"
    if (!between(bio, 40, 600)) errors.bio = "Write 40 to 600 characters for your profile"
  }
  if (step === "evidence") {
    const { evidence } = data
    if (evidence.length > MAX_EVIDENCE) errors.evidence = `Keep it to ${MAX_EVIDENCE} items`
    else if (!evidence.some((item) => item.kind === "identity")) errors.identity = "Add an ID document for the identity check"
    else if (!evidence.some((item) => item.kind === "education" || item.kind === "employment" || item.kind === "expertise")) {
      errors.credential = "Add evidence of your education, employment or expertise"
    }
    for (const item of evidence) {
      const problem = validateEvidence(item)
      if (problem) errors[`item-${item.id}`] = problem
    }
  }
  if (step === "offers") {
    const { types, startingPrice, durationMinutes, days, times } = data.offers
    if (types.length < 1) errors.types = "Pick at least one kind of offer"
    const price = whole(startingPrice)
    if (price === null || price < 50 || price > 100_000) errors.startingPrice = "Enter a starting price between ৳50 and ৳100,000"
    const duration = whole(durationMinutes)
    if (types.some((type) => type !== "review") && (duration === null || duration < 15 || duration > 180)) errors.durationMinutes = "Duration must be 15 to 180 minutes"
    if (days.length < 1 || days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) errors.days = "Pick the days you can mentor"
    if (times.length < 1 || times.some((time) => !/^([01]\d|2[0-3]):00$/.test(time))) errors.times = "Pick at least one start time"
  }
  return errors
}

export function validateEvidence(item: EvidenceItem): string | undefined {
  if (!checkKinds.includes(item.kind)) return "Choose what this supports"
  if (!between(item.label, 3, 80)) return "Give it a short label, 3 to 80 characters"
  if (looksLikeIdNumber(item.label) || looksLikeIdNumber(item.reference ?? "")) return "Remove ID or account numbers from the text"
  if (item.kind === "identity" && item.form !== "file") return "Identity evidence must be an uploaded document"
  if (item.form === "file") {
    if (!item.fileName || !item.fileType || !fileTypes.includes(item.fileType)) return "Use a PDF, JPG or PNG file"
    if (!item.fileSize || item.fileSize <= 0 || item.fileSize > MAX_FILE_BYTES) return "Files can be up to 5 MB"
  }
  if (item.form === "link" && !(item.url && isHttpUrl(item.url))) return "Enter a full web address like https://…"
  if (item.form === "reference" && !between(item.reference ?? "", 10, 300)) return "Describe the reference in 10 to 300 characters"
  return undefined
}

export function validateAll(data: ApplicationData): Partial<Record<Step, StepErrors>> {
  const result: Partial<Record<Step, StepErrors>> = {}
  for (const step of steps) {
    const errors = validateStep(step, data)
    if (Object.keys(errors).length > 0) result[step] = errors
  }
  return result
}

export type Failure = "forbidden" | "not-found" | "invalid" | "invalid-transition" | "duplicate" | "conflict"
export type Result<T = object> = ({ ok: true; applications: Application[]; application: Application } & T) | { ok: false; code: Failure; message: string; errors?: Partial<Record<Step, StepErrors>> }

const refuse = (code: Failure, message: string, errors?: Partial<Record<Step, StepErrors>>): { ok: false; code: Failure; message: string; errors?: Partial<Record<Step, StepErrors>> } => ({ ok: false, code, message, errors })

const entry = (application: Application, at: Date, actor: AuditEntry["actor"], actorRef: string, action: AuditAction, extra: Partial<AuditEntry> = {}): AuditEntry => ({
  id: `${application.id}-${application.audit.length + 1}`,
  at: at.toISOString(),
  actor,
  actorRef,
  action,
  ...extra,
})

const replace = (applications: Application[], next: Application) => applications.map((item) => (item.id === next.id ? next : item))
const ownsIt = (principal: Principal | null, application: Application) => Boolean(principal) && principal!.email.toLowerCase() === application.applicantEmail.toLowerCase()
// The review desk and administrators both act on applications; applicants never do.
const canReview = (principal: Principal | null) => canReviewApplications(principal)

export function createDraft(principal: Principal | null, applications: Application[], id: string, now: Date): Result {
  if (!principal) return refuse("forbidden", "Log in to apply.")
  if (canReview(principal)) return refuse("forbidden", "Reviewer and admin accounts can't apply.")
  const mine = applications.filter((item) => item.applicantEmail.toLowerCase() === principal.email.toLowerCase())
  if (mine.some((item) => item.status === "approved")) return refuse("duplicate", "Your application was already approved.")
  if (mine.some((item) => isActive(item.status))) return refuse("duplicate", "You already have an application in progress.")
  if (applications.some((item) => item.id === id)) return refuse("duplicate", "That application already exists.")
  const at = now.toISOString()
  const application: Application = { id, applicantEmail: principal.email, status: "draft", data: emptyData(), verdicts: noVerdicts, createdAt: at, updatedAt: at, audit: [] }
  application.audit = [entry(application, now, "applicant", principal.email, "created", { to: "draft" })]
  return { ok: true, applications: [application, ...applications], application }
}

export function updateDraft(principal: Principal | null, applications: Application[], id: string, data: ApplicationData, now: Date): Result {
  const application = applications.find((item) => item.id === id)
  if (!application) return refuse("not-found", "We couldn't find that application.")
  if (!ownsIt(principal, application)) return refuse("forbidden", "You can only change your own application.")
  if (!isEditable(application.status)) return refuse("invalid-transition", "This application can't be edited right now.")
  const next = { ...application, data, updatedAt: now.toISOString() }
  return { ok: true, applications: replace(applications, next), application: next }
}

// After an information request, the applicant must add evidence for each kind asked about before resubmitting.
function answersRequest(application: Application) {
  const request = application.infoRequest
  if (!request || request.answeredAt) return true
  return request.kinds.every((kind) => application.data.evidence.some((item) => item.kind === kind && item.addedAt > request.at))
}

export function submit(principal: Principal | null, applications: Application[], id: string, now: Date): Result {
  const application = applications.find((item) => item.id === id)
  if (!application) return refuse("not-found", "We couldn't find that application.")
  if (!ownsIt(principal, application)) return refuse("forbidden", "You can only submit your own application.")
  if (!canMove(application.status, "submitted")) return refuse("invalid-transition", "This application was already submitted.")
  const errors = validateAll(application.data)
  if (Object.keys(errors).length > 0) return refuse("invalid", "Fix the highlighted fields before submitting.", errors)
  if (!answersRequest(application)) return refuse("invalid", "Add the evidence the reviewer asked for before resubmitting.")
  const resubmitting = application.status === "info-required"
  const at = now.toISOString()
  const next: Application = {
    ...application,
    status: "submitted",
    submittedAt: application.submittedAt ?? at,
    updatedAt: at,
    infoRequest: application.infoRequest && !application.infoRequest.answeredAt ? { ...application.infoRequest, answeredAt: at } : application.infoRequest,
    audit: [...application.audit, entry(application, now, "applicant", principal!.email, resubmitting ? "resubmitted" : "submitted", { from: application.status, to: "submitted" })],
  }
  return { ok: true, applications: replace(applications, next), application: next }
}

export type ReviewAction =
  | { kind: "start" }
  | { kind: "record-checks"; verdicts: Verdicts }
  | { kind: "request-info"; message: string; kinds: CheckKind[] }
  | { kind: "approve"; message?: string; internalNote?: string }
  | { kind: "reject"; message: string; internalNote?: string }

export const toVerification = (verdicts: Verdicts): Verification => Object.fromEntries(checkKinds.map((kind) => [kind, verdicts[kind] === "verified"])) as Verification

// A mentor needs a checked ID plus at least one credential check; mentoring quality alone never qualifies.
export function approvalBlocker(verdicts: Verdicts): string | null {
  if (verdicts.identity !== "verified") return "Verify the applicant's identity before approving."
  if (!(["education", "employment", "expertise"] as CheckKind[]).some((kind) => verdicts[kind] === "verified")) {
    return "Verify at least one of education, employment or expertise before approving."
  }
  return null
}

const MESSAGE_MIN = 10
const MESSAGE_MAX = 500

export function review(principal: Principal | null, applications: Application[], id: string, action: ReviewAction, now: Date): Result {
  if (!canReview(principal)) return refuse("forbidden", "Only reviewers and administrators can do that.")
  const application = applications.find((item) => item.id === id)
  if (!application || application.status === "draft") return refuse("not-found", "We couldn't find that application.")
  if (ownsIt(principal, application)) return refuse("conflict", "You can't review your own application.")
  const at = now.toISOString()
  const reviewer = principal!.email
  const done = (next: Application) => ({ ok: true as const, applications: replace(applications, next), application: next })

  if (action.kind === "start") {
    if (!canMove(application.status, "under-review")) return refuse("invalid-transition", "Only a submitted application can be taken for review.")
    return done({ ...application, status: "under-review", updatedAt: at, audit: [...application.audit, entry(application, now, "reviewer", reviewer, "review-started", { from: application.status, to: "under-review" })] })
  }

  if (application.status !== "under-review") return refuse("invalid-transition", "Start the review before recording anything.")

  if (action.kind === "record-checks") {
    const valid = checkKinds.every((kind) => ["verified", "not-verified", "unchecked"].includes(action.verdicts[kind]))
    if (!valid) return refuse("invalid", "Choose a result for each check.")
    return done({ ...application, verdicts: action.verdicts, updatedAt: at, audit: [...application.audit, entry(application, now, "reviewer", reviewer, "checks-recorded", { detail: checkKinds.map((kind) => `${kind}:${action.verdicts[kind]}`).join(" ") })] })
  }

  const text = (value?: string) => (value ?? "").trim()
  if (action.kind === "request-info") {
    const message = text(action.message)
    if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) return refuse("invalid", `Explain what you need in ${MESSAGE_MIN} to ${MESSAGE_MAX} characters.`)
    if (action.kinds.length < 1 || action.kinds.some((kind) => !checkKinds.includes(kind))) return refuse("invalid", "Pick what evidence is needed.")
    return done({
      ...application,
      status: "info-required",
      updatedAt: at,
      infoRequest: { at, reviewer, message, kinds: action.kinds },
      audit: [...application.audit, entry(application, now, "reviewer", reviewer, "info-requested", { from: "under-review", to: "info-required", detail: action.kinds.join(",") })],
    })
  }

  if (action.kind === "approve") {
    const blocker = approvalBlocker(application.verdicts)
    if (blocker) return refuse("invalid", blocker)
    const note = text(action.internalNote)
    if (note.length > MESSAGE_MAX || text(action.message).length > MESSAGE_MAX) return refuse("invalid", `Keep notes under ${MESSAGE_MAX} characters.`)
    const decision: Decision = { outcome: "approved", at, reviewer, checks: toVerification(application.verdicts), message: text(action.message) || undefined, internalNote: note || undefined }
    return done({ ...application, status: "approved", updatedAt: at, decision, audit: [...application.audit, entry(application, now, "reviewer", reviewer, "approved", { from: "under-review", to: "approved" })] })
  }

  const message = text(action.message)
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) return refuse("invalid", `Give the applicant a reason in ${MESSAGE_MIN} to ${MESSAGE_MAX} characters.`)
  const note = text(action.internalNote)
  if (note.length > MESSAGE_MAX) return refuse("invalid", `Keep notes under ${MESSAGE_MAX} characters.`)
  const decision: Decision = { outcome: "rejected", at, reviewer, checks: toVerification(application.verdicts), message, internalNote: note || undefined }
  return done({ ...application, status: "rejected", updatedAt: at, decision, audit: [...application.audit, entry(application, now, "reviewer", reviewer, "rejected", { from: "under-review", to: "rejected" })] })
}

// Opening evidence is logged by kind and id only, so the trail shows who looked without keeping what they saw.
export function viewEvidence(principal: Principal | null, applications: Application[], id: string, evidenceId: string, now: Date): Result<{ evidence: EvidenceItem }> {
  if (!canReview(principal)) return refuse("forbidden", "Only reviewers and administrators can open evidence.")
  const application = applications.find((item) => item.id === id)
  if (!application || application.status === "draft") return refuse("not-found", "We couldn't find that application.")
  if (ownsIt(principal, application)) return refuse("conflict", "You can't review your own application.")
  const evidence = application.data.evidence.find((item) => item.id === evidenceId)
  if (!evidence) return refuse("not-found", "We couldn't find that evidence.")
  const next = { ...application, audit: [...application.audit, entry(application, now, "reviewer", principal!.email, "evidence-viewed", { detail: `${evidence.kind} (${evidence.form}) ${evidence.id}` })] }
  return { ok: true, applications: replace(applications, next), application: next, evidence }
}

// Each person sees only what they should: applicants their own application without internal notes, reviewers every submitted one.
export function visibleTo(principal: Principal | null, applications: Application[]): Application[] {
  if (!principal) return []
  if (canReview(principal)) return applications.filter((item) => item.status !== "draft" && !ownsIt(principal, item))
  return applications.filter((item) => ownsIt(principal, item)).map(applicantView)
}

export function applicantView(application: Application): Application {
  if (!application.decision?.internalNote) return application
  const { internalNote: _removed, ...decision } = application.decision
  void _removed
  return { ...application, decision }
}

export type PublicProfile = {
  name: string
  role: string
  organization: string
  yearsOfExperience: number
  education: string
  location: string
  timezone: string
  track: Track
  categories: CategoryId[]
  skills: string[]
  languages: Language[]
  audience: string
  bio: string
  offerTypes: OfferType[]
  verification: Verification
}

// The only shape of an application that may be shown publicly, and only once approved. Contact details,
// evidence, links, reviewer notes and the audit trail are left out on purpose.
export function publicProfileOf(application: Application): PublicProfile | null {
  if (application.status !== "approved" || !application.decision) return null
  const { basic, background, expertise, offers } = application.data
  return {
    name: basic.fullName.trim(),
    role: background.role.trim(),
    organization: background.organization.trim(),
    yearsOfExperience: Number(background.years),
    education: background.education.trim(),
    location: `${basic.city.trim()}, ${basic.country.trim()}`,
    timezone: basic.timezone,
    track: expertise.track,
    categories: expertise.categories,
    skills: expertise.skills.split(",").map((item) => item.trim()).filter(Boolean),
    languages: expertise.languages,
    audience: expertise.audience.trim(),
    bio: expertise.bio.trim(),
    offerTypes: offers.types,
    verification: application.decision.checks ?? noChecks,
  }
}
