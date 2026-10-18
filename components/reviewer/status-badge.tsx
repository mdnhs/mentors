import { Badge } from "@/components/ui/badge"
import { statusLabels, type ApplicationStatus } from "@/lib/mentor-application"

const tones: Record<ApplicationStatus, "neutral" | "accent" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  submitted: "accent",
  "under-review": "warning",
  "info-required": "warning",
  approved: "success",
  rejected: "danger",
}

export function ApplicationStatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <Badge tone={tones[status]} className={className}>
      {statusLabels[status]}
    </Badge>
  )
}
