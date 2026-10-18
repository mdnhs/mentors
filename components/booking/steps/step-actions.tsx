import Link from "next/link"
import { Loader2Icon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type StepActionsProps = {
  variant: "desktop" | "mobile"
  backLabel?: string
  onBack?: () => void
  backHref?: string
  nextLabel: string
  busyLabel?: string
  onNext: () => void
  disabled: boolean
  busy: boolean
  blockedReason?: string | null
}

export function StepActions({ variant, backLabel = "Back", onBack, backHref, nextLabel, busyLabel = "Processing…", onNext, disabled, busy, blockedReason }: StepActionsProps) {
  const reasonId = `step-blocked-${variant}`
  const reason = disabled && !busy ? blockedReason : null
  const mobile = variant === "mobile"

  const actions = (
    <>
      {backHref ? (
        <Link href={backHref} className={buttonVariants({ variant: "ghost", size: "lg" })}>
          {backLabel}
        </Link>
      ) : onBack ? (
        <Button variant="ghost" size="lg" disabled={busy} onClick={onBack}>
          {backLabel}
        </Button>
      ) : (
        <span />
      )}
      <div className={cn("flex items-center gap-3", mobile && "flex-1")}>
        {reason && (
          <p id={reasonId} className={cn("text-sm text-muted-foreground", mobile && "sr-only")}>
            {reason}
          </p>
        )}
        <Button
          onClick={onNext}
          disabled={disabled || busy}
          aria-describedby={reason ? reasonId : undefined}
          size="lg"
          className={mobile ? "flex-1" : "min-w-40"}
        >
          {busy && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          {busy ? busyLabel : nextLabel}
        </Button>
      </div>
    </>
  )

  if (mobile) {
    return (
      <div data-mobile-bar className="mobile-bar">
        <div className="mx-auto flex max-w-xl items-center gap-3">{actions}</div>
      </div>
    )
  }
  return <div className="mt-4 hidden items-center justify-between gap-4 lg:flex">{actions}</div>
}
