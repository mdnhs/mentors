import type { SessionView } from "@/components/sessions/use-session-view"
import { cn } from "@/lib/utils"

type Tone = "success" | "warning" | "muted"

const tones: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  muted: "bg-muted text-muted-foreground",
}

export function sessionStatus(view: Pick<SessionView, "phase" | "learner" | "check">): { label: string; tone: Tone } | null {
  if (view.phase === "cancelled") return { label: "Cancelled", tone: "muted" }
  if (view.learner === "enrolled") return { label: "You're in", tone: "success" }
  if (view.learner === "completed") return { label: "Attended", tone: "muted" }
  if (view.learner === "pending") return { label: "Payment pending", tone: "warning" }
  if (view.phase === "completed") return { label: "Completed", tone: "muted" }
  if (!view.check.open && view.check.reason === "full") return { label: "Full", tone: "warning" }
  if (!view.check.open && view.check.reason === "closed") return { label: "Registration closed", tone: "muted" }
  return null
}

export function SessionBadge({ view, className }: { view: Pick<SessionView, "phase" | "learner" | "check">; className?: string }) {
  const status = sessionStatus(view)
  if (!status) return null
  return <span className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-medium", tones[status.tone], className)}>{status.label}</span>
}
