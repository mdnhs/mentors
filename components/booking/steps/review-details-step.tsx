"use client"

import { useState } from "react"
import { ClockIcon, UploadIcon } from "lucide-react"

import { documentLinkError } from "@/components/booking/steps/flow"
import { GoalsField } from "@/components/booking/steps/goals-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ReviewOffer } from "@/lib/types"

type ReviewDetailsStepProps = {
  offer: ReviewOffer
  firstName: string
  note: string
  documentLink: string
  onNote: (value: string) => void
  onDocumentLink: (value: string) => void
}

export function ReviewDetailsStep({ offer, firstName, note, documentLink, onNote, onDocumentLink }: ReviewDetailsStepProps) {
  const [linkTouched, setLinkTouched] = useState(false)
  const linkError = linkTouched ? documentLinkError(documentLink) : null

  return (
    <div className="space-y-6">
      <h2 tabIndex={-1} className="text-subheading outline-none">
        What should {firstName} review?
      </h2>
      <GoalsField
        id="review-goals"
        rows={4}
        value={note}
        onChange={onNote}
        placeholder="E.g. I'm applying for a funded master's in Germany and want my SOP to sound more specific."
      />
      <div className="grid gap-1.5">
        <Label htmlFor="review-link">
          Document link <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="review-link"
          type="url"
          inputMode="url"
          value={documentLink}
          onChange={(event) => onDocumentLink(event.target.value)}
          onBlur={() => setLinkTouched(true)}
          placeholder="https://drive.google.com/…"
          aria-invalid={linkError ? true : undefined}
          aria-describedby={linkError ? "review-link-error" : undefined}
        />
        {linkError && (
          <p id="review-link-error" className="text-sm text-destructive">
            {linkError}
          </p>
        )}
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <UploadIcon className="size-4 shrink-0" aria-hidden="true" />
          Send: {offer.learnerProvides}
        </li>
        <li className="flex items-center gap-2">
          <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
          Written feedback within {offer.deliveryDays} days.
        </li>
      </ul>
    </div>
  )
}
