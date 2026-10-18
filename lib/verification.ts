// Each check says exactly what was looked at. None of them is an endorsement or a guarantee of results.
export type CheckKind = "identity" | "education" | "employment" | "expertise" | "mentoring"

export type Verification = Record<CheckKind, boolean>

export const checkKinds: CheckKind[] = ["identity", "education", "employment", "expertise", "mentoring"]

export const noChecks: Verification = { identity: false, education: false, employment: false, expertise: false, mentoring: false }

export const checkCopy: Record<CheckKind, { label: string; done: string; detail: string; pending: string }> = {
  identity: {
    label: "Identity",
    done: "ID checked",
    detail: "A government-issued ID was checked against the mentor's name. It is never shown or shared.",
    pending: "We haven't checked this mentor's ID.",
  },
  education: {
    label: "Education",
    done: "Education checked",
    detail: "The degree or enrolment shown was confirmed with documents.",
    pending: "The education shown is as stated by the mentor.",
  },
  employment: {
    label: "Employment",
    done: "Employment checked",
    detail: "The role shown was confirmed with documents or an employer reference.",
    pending: "The role shown is as stated by the mentor.",
  },
  expertise: {
    label: "Expertise",
    done: "Expertise reviewed",
    detail: "Work samples or a portfolio were reviewed by our team. This isn't a guarantee of results.",
    pending: "Their work hasn't been reviewed by our team.",
  },
  mentoring: {
    label: "Mentoring",
    done: "Mentoring reviewed",
    detail: "References or a sample session were reviewed for mentoring approach. Learner reviews are separate.",
    pending: "Their mentoring approach hasn't been reviewed by our team.",
  },
}

export const verificationDisclaimer =
  "Checks describe what we looked at. They aren't an endorsement by any employer or university, or a guarantee of expertise. It isn't a rating of their mentoring: reviews from completed sessions are."

const short: Record<CheckKind, string> = { identity: "ID", education: "education", employment: "employment", expertise: "expertise", mentoring: "mentoring" }

// "ID, education and employment checked": checked vs reviewed is kept apart so nothing sounds stronger than it is.
export function verificationSummary(verification: Verification) {
  const list = (kinds: CheckKind[]) => {
    const names = kinds.filter((kind) => verification[kind]).map((kind) => short[kind])
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "")
  }
  const checked = list(["identity", "education", "employment"])
  const reviewed = list(["expertise", "mentoring"])
  if (checked && reviewed) return `${checked} checked, ${reviewed} reviewed`
  if (checked) return `${checked} checked`
  if (reviewed) return `${reviewed} reviewed`
  return "Not verified yet"
}

export const hasAnyCheck = (verification: Verification) => checkKinds.some((kind) => verification[kind])

// The one badge shown on cards: an ID check plus at least one credential check.
export const hasCoreChecks = (verification: Verification) => verification.identity && (verification.education || verification.employment)
