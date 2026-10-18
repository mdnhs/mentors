import { emptyData, noVerdicts, type Application, type ApplicationData, type ApplicationStatus, type AuditEntry, type EvidenceItem, type Verdicts } from "@/lib/mentor-application"

// Made-up applicants so the reviewer queue has something to show. Their documents are placeholders:
// only file names exist, there is no content behind them.
const file = (id: string, kind: EvidenceItem["kind"], label: string, fileName: string, at: string): EvidenceItem => ({ id, kind, form: "file", label, fileName, fileType: "application/pdf", fileSize: 240_000, addedAt: at })
const link = (id: string, kind: EvidenceItem["kind"], label: string, url: string, at: string): EvidenceItem => ({ id, kind, form: "link", label, url, addedAt: at })

function build(id: string, email: string, status: ApplicationStatus, data: ApplicationData, submittedAt: string, extra: Partial<Application> = {}, verdicts: Verdicts = noVerdicts): Application {
  const audit: AuditEntry[] = [
    { id: `${id}-1`, at: submittedAt, actor: "applicant", actorRef: email, action: "submitted", from: "draft", to: "submitted" },
  ]
  return { id, applicantEmail: email, status, data, verdicts, createdAt: submittedAt, updatedAt: submittedAt, submittedAt, audit, sample: true, ...extra }
}

const base = emptyData()

const nadia: ApplicationData = {
  basic: { fullName: "Nadia Sultana", city: "Dhaka", country: "Bangladesh", timezone: "Asia/Dhaka" },
  background: { path: "professional", role: "Data Scientist", organization: "Analytics consultancy", years: "6", education: "MSc in Statistics, Dhaka", profileUrl: "https://example.com/nadia-sultana" },
  expertise: { track: "tech", categories: ["ai-ml", "interview-prep"], skills: "Machine learning, SQL, Experiment design", audience: "Analysts moving into data science roles.", languages: ["Bangla", "English"], bio: "I build forecasting models for retail clients and mentor analysts who want to move into data science with a portfolio that stands out." },
  evidence: [
    file("e1", "identity", "National ID (front)", "nid-front.pdf", "2026-10-14T08:00:00Z"),
    file("e2", "education", "Degree certificate", "degree.pdf", "2026-10-14T08:01:00Z"),
    link("e3", "expertise", "Published case studies", "https://example.com/nadia-sultana/work", "2026-10-14T08:02:00Z"),
  ],
  offers: { types: ["one-on-one", "review"], startingPrice: "1200", durationMinutes: "45", days: [1, 3], times: ["20:00", "21:00"] },
}

const rashed: ApplicationData = {
  ...base,
  basic: { fullName: "Rashed Karim", city: "Toronto", country: "Canada", timezone: "America/Toronto" },
  background: { path: "academic", role: "PhD candidate", organization: "Public research university", years: "4", education: "MSc in Physics, Dhaka", profileUrl: "" },
  expertise: { track: "education", categories: ["phd-research", "scholarships"], skills: "Research proposals, Funding applications", audience: "Students applying for funded graduate programs abroad.", languages: ["Bangla", "English"], bio: "Currently a funded PhD candidate in Canada. I help applicants shape research proposals and find funding opportunities that fit." },
  evidence: [
    file("e1", "identity", "Passport photo page", "passport.pdf", "2026-10-10T08:00:00Z"),
    file("e2", "education", "Enrolment letter", "enrolment.pdf", "2026-10-10T08:01:00Z"),
  ],
  offers: { types: ["review", "one-on-one"], startingPrice: "900", durationMinutes: "30", days: [0, 6], times: ["10:00", "11:00"] },
}

const mim: ApplicationData = {
  ...base,
  basic: { fullName: "Mim Akter", city: "Chattogram", country: "Bangladesh", timezone: "Asia/Dhaka" },
  background: { path: "professional", role: "Frontend Engineer", organization: "SaaS startup", years: "3", education: "BSc in Computer Science, Chattogram", profileUrl: "https://example.com/mim-akter" },
  expertise: { track: "tech", categories: ["software-engineering"], skills: "React, Accessibility", audience: "Students getting their first frontend job.", languages: ["Bangla"], bio: "I work on accessible interfaces at a SaaS startup and want to help students land their first frontend role with real projects." },
  evidence: [file("e1", "identity", "ID card", "id-card.pdf", "2026-10-12T08:00:00Z"), link("e2", "employment", "Company profile page", "https://example.com/mim-akter/work", "2026-10-12T08:01:00Z")],
  offers: { types: ["one-on-one"], startingPrice: "800", durationMinutes: "45", days: [2], times: ["19:00"] },
}

const tariq: ApplicationData = {
  ...base,
  basic: { fullName: "Tariq Aziz", city: "Sylhet", country: "Bangladesh", timezone: "Asia/Dhaka" },
  background: { path: "professional", role: "Consultant", organization: "Independent", years: "2", education: "BBA, Sylhet", profileUrl: "" },
  expertise: { track: "tech", categories: ["career-growth"], skills: "Career coaching", audience: "Anyone who wants career advice.", languages: ["Bangla"], bio: "I offer career advice to anyone looking for a change, drawing on my own experience across a few different jobs over two years." },
  evidence: [file("e1", "identity", "ID card", "tariq-id.pdf", "2026-10-02T08:00:00Z"), link("e2", "expertise", "Personal page", "https://example.com/tariq", "2026-10-02T08:01:00Z")],
  offers: { types: ["one-on-one"], startingPrice: "500", durationMinutes: "30", days: [4], times: ["18:00"] },
}

export const demoApplications: Application[] = [
  build("app-s1", "nadia.sample@example.com", "submitted", nadia, "2026-10-14T08:05:00Z"),
  build("app-s2", "rashed.sample@example.com", "under-review", rashed, "2026-10-10T08:05:00Z", {
    audit: [
      { id: "app-s2-1", at: "2026-10-10T08:05:00Z", actor: "applicant", actorRef: "rashed.sample@example.com", action: "submitted", from: "draft", to: "submitted" },
      { id: "app-s2-2", at: "2026-10-11T09:00:00Z", actor: "reviewer", actorRef: "reviewer.sample@example.com", action: "review-started", from: "submitted", to: "under-review" },
    ],
  }),
  build(
    "app-s3",
    "mim.sample@example.com",
    "info-required",
    mim,
    "2026-10-12T08:05:00Z",
    {
      infoRequest: { at: "2026-10-13T10:00:00Z", reviewer: "reviewer.sample@example.com", message: "Please add a document or reference that confirms your education.", kinds: ["education"] },
      audit: [
        { id: "app-s3-1", at: "2026-10-12T08:05:00Z", actor: "applicant", actorRef: "mim.sample@example.com", action: "submitted", from: "draft", to: "submitted" },
        { id: "app-s3-2", at: "2026-10-13T09:00:00Z", actor: "reviewer", actorRef: "reviewer.sample@example.com", action: "review-started", from: "submitted", to: "under-review" },
        { id: "app-s3-3", at: "2026-10-13T10:00:00Z", actor: "reviewer", actorRef: "reviewer.sample@example.com", action: "info-requested", from: "under-review", to: "info-required", detail: "education" },
      ],
    },
    { identity: "verified", education: "unchecked", employment: "verified", expertise: "unchecked", mentoring: "unchecked" }
  ),
  build(
    "app-s4",
    "tariq.sample@example.com",
    "rejected",
    tariq,
    "2026-10-02T08:05:00Z",
    {
      decision: { outcome: "rejected", at: "2026-10-05T09:00:00Z", reviewer: "reviewer.sample@example.com", checks: { identity: true, education: false, employment: false, expertise: false, mentoring: false }, message: "We couldn't confirm the experience described. You're welcome to apply again with evidence of your work.", internalNote: "Sample note: no verifiable work history." },
      audit: [
        { id: "app-s4-1", at: "2026-10-02T08:05:00Z", actor: "applicant", actorRef: "tariq.sample@example.com", action: "submitted", from: "draft", to: "submitted" },
        { id: "app-s4-2", at: "2026-10-04T09:00:00Z", actor: "reviewer", actorRef: "reviewer.sample@example.com", action: "review-started", from: "submitted", to: "under-review" },
        { id: "app-s4-3", at: "2026-10-05T09:00:00Z", actor: "reviewer", actorRef: "reviewer.sample@example.com", action: "rejected", from: "under-review", to: "rejected" },
      ],
    },
    { identity: "verified", education: "not-verified", employment: "not-verified", expertise: "not-verified", mentoring: "unchecked" }
  ),
]
