"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PasswordFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  autoComplete: "current-password" | "new-password"
  label?: string
  hint?: string
  action?: React.ReactNode
}

export function PasswordField({ id, value, onChange, autoComplete, label = "Password", hint, action }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const hintId = `${id}-hint`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={4}
          value={value}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className="pr-20"
        />
        <button
          type="button"
          aria-controls={id}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex items-center gap-1.5 rounded-r-lg px-3 text-sm text-muted-foreground hover:text-foreground focus-ring"
        >
          {visible ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
          {visible ? "Hide" : "Show"}
          <span className="sr-only"> password</span>
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {action && <div className="flex justify-end">{action}</div>}
    </div>
  )
}
