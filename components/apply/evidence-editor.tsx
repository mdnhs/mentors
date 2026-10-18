"use client"

import { useState } from "react"
import { FileTextIcon, LinkIcon, MessageSquareQuoteIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validateEvidence, type EvidenceItem } from "@/lib/mentor-application"
import { checkCopy, checkKinds, type CheckKind } from "@/lib/verification"
import { cn } from "@/lib/utils"

const formLabels = { file: "Upload a document", link: "Link", reference: "Reference" } as const
const formIcons = { file: FileTextIcon, link: LinkIcon, reference: MessageSquareQuoteIcon } as const
const hints: Record<CheckKind, string> = {
  identity: "A government-issued ID. Only reviewers see it, and it never appears on your profile.",
  education: "A degree certificate, transcript or enrolment letter.",
  employment: "An offer letter, payslip header or employer reference. Hide pay figures.",
  expertise: "A portfolio, publications, repository or case studies.",
  mentoring: "A reference from someone you've mentored or taught, or a recorded talk.",
}

type Props = {
  items: EvidenceItem[]
  onChange: (items: EvidenceItem[]) => void
  errors: Record<string, string>
  // Kinds a reviewer asked for, shown as a prompt while answering an information request.
  requested?: CheckKind[]
}

export function EvidenceEditor({ items, onChange, errors, requested = [] }: Props) {
  const [kind, setKind] = useState<CheckKind>(requested[0] ?? "identity")
  const [form, setForm] = useState<EvidenceItem["form"]>("file")
  const [label, setLabel] = useState("")
  const [url, setUrl] = useState("")
  const [reference, setReference] = useState("")
  const [file, setFile] = useState<{ name: string; type: string; size: number } | null>(null)
  const [problem, setProblem] = useState<string | null>(null)

  const effectiveForm = kind === "identity" ? "file" : form

  const add = () => {
    const item: EvidenceItem = {
      id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      form: effectiveForm,
      label: label.trim(),
      addedAt: new Date().toISOString(),
      ...(effectiveForm === "file" && file && { fileName: file.name, fileType: file.type, fileSize: file.size }),
      ...(effectiveForm === "link" && { url: url.trim() }),
      ...(effectiveForm === "reference" && { reference: reference.trim() }),
    }
    const error = validateEvidence(item)
    if (error) {
      setProblem(error)
      return
    }
    onChange([...items, item])
    setLabel("")
    setUrl("")
    setReference("")
    setFile(null)
    setProblem(null)
  }

  return (
    <div className="space-y-5">
      {requested.length > 0 && (
        <p role="note" className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
          A reviewer asked for more on: {requested.map((item) => checkCopy[item].label.toLowerCase()).join(", ")}. Add it below, then resubmit.
        </p>
      )}
      {(errors.identity || errors.credential || errors.evidence) && (
        <p role="alert" className="text-sm text-destructive">
          {errors.identity ?? errors.credential ?? errors.evidence}
        </p>
      )}

      {items.length > 0 && (
        <ul className="divide-y rounded-xl border" aria-label="Evidence you've added">
          {items.map((item) => {
            const Icon = formIcons[item.form]
            const itemError = errors[`item-${item.id}`]
            return (
              <li key={item.id} className="flex items-start gap-3 p-3 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-muted-foreground">
                    {checkCopy[item.kind].label} · {item.form === "file" ? `${item.fileName} (${Math.round((item.fileSize ?? 0) / 1024)} KB)` : item.form === "link" ? item.url : "Reference"}
                  </p>
                  {itemError && <p className="text-destructive">{itemError}</p>}
                </div>
                <button type="button" aria-label={`Remove ${item.label}`} onClick={() => onChange(items.filter((entry) => entry.id !== item.id))} className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-ring">
                  <XIcon className="size-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <fieldset className="space-y-4 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Add evidence</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="evidence-kind">What does it show?</Label>
            <select id="evidence-kind" value={kind} onChange={(event) => { setKind(event.target.value as CheckKind); setProblem(null) }} className="h-10 rounded-lg border bg-card px-3 text-sm focus-ring">
              {checkKinds.map((item) => (
                <option key={item} value={item}>
                  {checkCopy[item].label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="evidence-form">How are you providing it?</Label>
            <select id="evidence-form" value={effectiveForm} disabled={kind === "identity"} onChange={(event) => { setForm(event.target.value as EvidenceItem["form"]); setProblem(null) }} className="h-10 rounded-lg border bg-card px-3 text-sm focus-ring disabled:opacity-60">
              {(Object.keys(formLabels) as (keyof typeof formLabels)[]).map((item) => (
                <option key={item} value={item}>
                  {formLabels[item]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{hints[kind]}</p>

        <div className="grid gap-1.5">
          <Label htmlFor="evidence-label">Short label</Label>
          <Input id="evidence-label" value={label} maxLength={80} placeholder="e.g. Degree certificate" onChange={(event) => { setLabel(event.target.value); setProblem(null) }} />
        </div>

        {effectiveForm === "file" && (
          <div className="grid gap-1.5">
            <Label htmlFor="evidence-file">File (PDF, JPG or PNG, up to 5 MB)</Label>
            <Input
              id="evidence-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={(event) => {
                const picked = event.target.files?.[0]
                // Only the name, type and size are kept; the file itself is never read.
                setFile(picked ? { name: picked.name, type: picked.type, size: picked.size } : null)
                setProblem(null)
              }}
            />
            <p className="text-xs text-muted-foreground">Don&apos;t type ID numbers anywhere in this form. This demo keeps only the file&apos;s name, never its contents.</p>
          </div>
        )}
        {effectiveForm === "link" && (
          <div className="grid gap-1.5">
            <Label htmlFor="evidence-url">Web address</Label>
            <Input id="evidence-url" type="url" inputMode="url" placeholder="https://" value={url} onChange={(event) => { setUrl(event.target.value); setProblem(null) }} />
          </div>
        )}
        {effectiveForm === "reference" && (
          <div className="grid gap-1.5">
            <Label htmlFor="evidence-reference">Who can vouch for you, and how?</Label>
            <Textarea id="evidence-reference" rows={3} maxLength={300} value={reference} onChange={(event) => { setReference(event.target.value); setProblem(null) }} className="bg-card" />
          </div>
        )}

        {problem && (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        )}
        <Button type="button" variant="outline" onClick={add} className={cn(!label.trim() && "opacity-70")}>
          Add evidence
        </Button>
      </fieldset>
    </div>
  )
}
