"use client"

import { useRef, useState } from "react"
import { InfoIcon, MinusIcon, TrendingDownIcon, TrendingUpIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "outline"

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-heading">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}

// Every admin screen carries the same honest framing: this interface records demo decisions and controls
// no real payments, documents or accounts.
export function DemoNotice({ label = "Demo administration.", className, children }: { label?: string; className?: string; children?: React.ReactNode }) {
  return (
    <p role="note" className={cn("flex gap-2.5 rounded-xl bg-warning-soft p-3 text-sm text-warning ring-1 ring-warning/20", className)}>
      <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">{label}</span>{" "}
        {children ?? "Records marked Sample are made up, sign-in is simulated, and these controls change only this browser's data — no real payment, payout or account is affected."}
      </span>
    </p>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "neutral",
  delta,
}: {
  label: string
  value: string
  detail?: string
  tone?: "neutral" | "accent"
  delta?: { change: number | null; period: string }
}) {
  const DeltaIcon = !delta || delta.change === null || delta.change === 0 ? MinusIcon : delta.change > 0 ? TrendingUpIcon : TrendingDownIcon
  return (
    <div className={cn("surface p-4", tone === "accent" && "border-primary/30 bg-accent/40")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {delta && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <DeltaIcon className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground tabular-nums">
            {delta.change === null ? "No earlier data" : `${delta.change > 0 ? "+" : ""}${Math.round(delta.change * 100)}%`}
          </span>
          vs {delta.period}
        </p>
      )}
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>
}

export function SampleBadge() {
  return <Badge tone="outline">Sample</Badge>
}

export function moderationTone(status: string): Tone {
  switch (status) {
    case "active":
    case "live":
    case "visible":
    case "refunded":
    case "paid":
    case "completed":
    case "confirmed":
      return "success"
    case "suspended":
    case "restricted":
    case "declined":
    case "hidden":
    case "cancelled":
    case "payment-failed":
      return "danger"
    case "paused":
    case "open":
    case "investigating":
    case "pending":
    case "refund-pending":
    case "in-review":
    case "expired":
      return "warning"
    default:
      return "neutral"
  }
}

// The domain layer validates the reason again; the length rule here is only a hint.
export function ReasonDialog({
  title,
  description,
  label,
  placeholder,
  submitLabel,
  destructive,
  onSubmit,
  onCancel,
  children,
}: {
  title: string
  description?: string
  label: string
  placeholder?: string
  submitLabel: string
  destructive?: boolean
  onSubmit: (reason: string) => void
  onCancel: () => void
  children?: React.ReactNode
}) {
  const [reason, setReason] = useState("")
  const textarea = useRef<HTMLTextAreaElement>(null)
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent initialFocus={textarea} className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(reason)
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {children}
          <div className="grid gap-1.5">
            <Label htmlFor="admin-reason">{label}</Label>
            <Textarea ref={textarea} id="admin-reason" rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={placeholder} aria-describedby="admin-reason-hint" className="bg-card" />
            <p id="admin-reason-hint" className="text-xs text-muted-foreground">
              At least 8 characters. Recorded in the audit log as metadata only. Never paste document contents, ID numbers or payment details.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={reason.trim().length < 8}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function notify(result: { ok: boolean; message?: string }, success: string) {
  if (result.ok) toast.success(success)
  else toast.error(result.message ?? "That didn't work.")
  return result.ok
}

export const percent = (value: number) => `${Math.round(value * 100)}%`
