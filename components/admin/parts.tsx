"use client"

import { useRef, useState } from "react"
import { CopyIcon, InfoIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "outline"

export { PageHeader as AdminPageHeader } from "@/components/portal/ui"

// Kept for other portals that still import it; admin pages rely on the shell's "Demo data" chip instead.
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

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>
}

export function SampleBadge() {
  return <Badge tone="outline">Sample</Badge>
}

// One tone per meaning across the admin workspace: done = success, in motion = accent, waiting = warning,
// failed or punitive = danger, finished without action = neutral.
export function moderationTone(status: string): Tone {
  switch (status) {
    case "live":
    case "visible":
    case "paid":
    case "completed":
    case "approved":
    case "succeeded":
    case "published":
      return "success"
    case "active":
    case "confirmed":
    case "scheduled":
      return "accent"
    case "suspended":
    case "restricted":
    case "declined":
    case "rejected":
    case "failed":
    case "payment-failed":
    case "refunded":
      return "danger"
    case "paused":
    case "open":
    case "pending":
    case "refund-pending":
    case "in-review":
    case "investigating":
    case "submitted":
    case "requested":
    case "draft":
      return "warning"
    default:
      return "neutral"
  }
}

export const statusTone = moderationTone

// Turns stored slugs such as "refund-pending" into sentence-case badge text.
export const sentenceCase = (value: string) => {
  const text = value.replace(/-/g, " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function CopyId({ value, className }: { value: string; className?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied", { description: value })
    } catch {
      toast.error("Couldn't copy to the clipboard.")
    }
  }
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="whitespace-nowrap text-xs tabular-nums">{value}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ID ${value}`}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
      >
        <CopyIcon className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  )
}

// A compact single-choice control; buttons expose aria-pressed like the filter chips do.
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-7 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors focus-ring",
            option.value === value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
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
