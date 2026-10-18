"use client"

import { useState } from "react"

import { MIN_GOALS } from "@/components/booking/steps/flow"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type GoalsFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows?: number
  className?: string
}

export function GoalsField({ id, value, onChange, placeholder, rows = 5, className }: GoalsFieldProps) {
  const [touched, setTouched] = useState(false)
  const remaining = Math.max(MIN_GOALS - value.trim().length, 0)
  const invalid = remaining > 0 && (touched || value.length > 0)

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>Your goals</Label>
      <Textarea
        id={id}
        rows={rows}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} aria-live="polite" className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground")}>
        {remaining > 0 ? `${remaining} more characters needed` : "Looks good"}
      </p>
    </div>
  )
}
