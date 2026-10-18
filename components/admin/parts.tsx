"use client"

import { useState } from "react"
import { InfoIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <p role="note" className="flex gap-2.5 rounded-xl bg-warning-soft p-3 text-sm text-warning ring-1 ring-warning/20">
      <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">Demo administration.</span>{" "}
        {children ?? "Records marked Sample are made up, sign-in is simulated, and these controls change only this browser's data — no real payment, payout or account is affected."}
      </span>
    </p>
  )
}

export function MetricCard({ label, value, detail, tone = "neutral" }: { label: string; value: string; detail?: string; tone?: "neutral" | "accent" }) {
  return (
    <div className={cn("surface p-4", tone === "accent" && "border-primary/30 bg-accent/40")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
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

// A small inline prompt for actions that need a written reason. The reason is validated again in the domain
// layer, so the length rule here is a hint, not the guard.
export function ReasonPanel({
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
  return (
    <form
      aria-label={title}
      className="surface mt-4 space-y-3 p-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(reason)
      }}
    >
      <div>
        <h2 className="text-subheading">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
      <div className="grid gap-1.5">
        <Label htmlFor="admin-reason">{label}</Label>
        <Textarea id="admin-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={placeholder} className="bg-card" />
        <p className="text-xs text-muted-foreground">Recorded in the audit log as metadata only. Never paste document contents, ID numbers or payment details.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={reason.trim().length < 8}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function Feedback({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("mt-4 rounded-xl p-3 text-sm", tone === "error" ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
      {children}
    </p>
  )
}

export const percent = (value: number) => `${Math.round(value * 100)}%`
