export type Step = "offer" | "schedule" | "goals" | "review"

export const MIN_GOALS = 10

export type FlowState = { isReview: boolean; slot: string | null; note: string; documentLink: string; contactValid: boolean }

export function stepsFor(isReview: boolean): { id: Step; label: string }[] {
  return isReview
    ? [
        { id: "offer", label: "Session" },
        { id: "schedule", label: "Details" },
        { id: "review", label: "Review" },
      ]
    : [
        { id: "offer", label: "Session" },
        { id: "schedule", label: "Date & time" },
        { id: "goals", label: "Goals" },
        { id: "review", label: "Review" },
      ]
}

export function goalsReady(note: string) {
  return note.trim().length >= MIN_GOALS
}

export function documentLinkError(value: string) {
  const link = value.trim()
  if (!link) return null
  try {
    const url = new URL(link)
    if (url.protocol === "http:" || url.protocol === "https:") return null
  } catch {}
  return "Enter a full link that starts with https://"
}

export function stepComplete(step: Step, state: FlowState) {
  return blockedReason(step, state) === null
}

// Why a step's Continue/Pay button is disabled, so the reason can be shown instead of a silent disabled button.
export function blockedReason(step: Step, state: FlowState): string | null {
  const needsTime = !state.isReview && !state.slot
  const needsGoals = !goalsReady(state.note)
  const linkError = state.isReview && documentLinkError(state.documentLink)
  if (step === "offer") return null
  if (step === "schedule" && !state.isReview) return needsTime ? "Pick a date and time to continue." : null
  if (step === "schedule" || step === "goals") {
    if (needsGoals) return `Describe your goals in at least ${MIN_GOALS} characters to continue.`
    return linkError ? "Fix the document link to continue." : null
  }
  if (needsTime) return "Pick a date and time before paying."
  if (needsGoals) return `Describe your goals in at least ${MIN_GOALS} characters before paying.`
  if (linkError) return "Fix the document link before paying."
  return state.contactValid ? null : "Enter your name and email to pay."
}

export function resolveStep(requested: Step, state: FlowState): Step {
  const steps = stepsFor(state.isReview)
  const index = steps.findIndex((item) => item.id === requested)
  if (index === -1) return steps.find((item) => !stepComplete(item.id, state))?.id ?? "review"
  const blocker = steps.slice(0, index).find((item) => !stepComplete(item.id, state))
  return blocker?.id ?? requested
}

export function parseStep(value: string | null): Step | null {
  return value === "offer" || value === "schedule" || value === "goals" || value === "review" ? value : null
}

export function nextStep(step: Step, isReview: boolean): Step | null {
  const steps = stepsFor(isReview)
  const index = steps.findIndex((item) => item.id === step)
  return index >= 0 && index < steps.length - 1 ? steps[index + 1].id : null
}

export function previousStep(step: Step, isReview: boolean): Step | null {
  const steps = stepsFor(isReview)
  const index = steps.findIndex((item) => item.id === step)
  return index > 0 ? steps[index - 1].id : null
}
