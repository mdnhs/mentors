import { statusLabels, type ApplicationStatus } from "@/lib/mentor-application"
import { cn } from "@/lib/utils"

const tones: Record<ApplicationStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-accent text-accent-foreground",
  "under-review": "bg-accent text-accent-foreground",
  "info-required": "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-muted text-muted-foreground",
}

export function ApplicationStatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return <span className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-medium", tones[status], className)}>{statusLabels[status]}</span>
}
