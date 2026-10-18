"use client"

import { useState } from "react"
import { CreditCardIcon, InfoIcon, SmartphoneIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatPrice } from "@/lib/format"
import type { PaymentMethod } from "@/lib/orders"
import type { DemoResult } from "@/lib/payment-client"
import { PLATFORM_FEE_RATE, quote } from "@/lib/pricing"
import { cn } from "@/lib/utils"

export type { PaymentMethod }

const paymentMethods: { id: PaymentMethod; label: string; hint: string; icon: typeof CreditCardIcon }[] = [
  { id: "bkash", label: "bKash", hint: "Mobile wallet", icon: SmartphoneIcon },
  { id: "nagad", label: "Nagad", hint: "Mobile wallet", icon: SmartphoneIcon },
  { id: "card", label: "Card", hint: "Visa or Mastercard", icon: CreditCardIcon },
]

export function DemoNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex gap-2.5 rounded-xl bg-warning-soft p-3 text-sm text-warning ring-1 ring-warning/20", className)}>
      <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">Demo checkout.</span> No payment provider is connected, so no money is collected and nothing is paid out. The result below is simulated.
      </span>
    </p>
  )
}

export function PriceBreakdown({ price, label, className }: { price: number; label: string; className?: string }) {
  const { base, platformFee, total, currency } = quote(price)

  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">{label}</dt>
        <dd>{formatPrice(base, currency)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Platform fee ({PLATFORM_FEE_RATE * 100}%, added to your total)</dt>
        <dd>{formatPrice(platformFee, currency)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t pt-2 text-base font-semibold">
        <dt>Total to pay</dt>
        <dd>{formatPrice(total, currency)}</dd>
      </div>
    </dl>
  )
}

const demoResults: { id: DemoResult; label: string }[] = [
  { id: "success", label: "Payment succeeds" },
  { id: "failure", label: "Payment fails" },
]

export function DemoResultPicker({ value, onChange }: { value: DemoResult; onChange: (value: DemoResult) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Demo outcome</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {demoResults.map((result) => (
          <label
            key={result.id}
            className="flex cursor-pointer items-center justify-center rounded-xl border bg-card p-2.5 text-sm transition hover:border-foreground/20 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input type="radio" name="demo-result" value={result.id} checked={value === result.id} onChange={() => onChange(result.id)} className="sr-only" />
            {result.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function PaymentMethodPicker({ value, onChange }: { value: PaymentMethod; onChange: (value: PaymentMethod) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">Payment method</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className="flex cursor-pointer flex-col gap-1 rounded-xl border bg-card p-3 transition hover:border-foreground/20 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name="payment"
              value={method.id}
              checked={value === method.id}
              onChange={() => onChange(method.id)}
              className="sr-only"
            />
            <method.icon className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium">{method.label}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">{method.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export type Contact = { name: string; email: string }

const EMAIL = /^\S+@\S+\.\S+$/

export function contactErrors(contact: Contact) {
  return {
    name: contact.name.trim().length > 1 ? null : "Enter your full name",
    email: EMAIL.test(contact.email) ? null : "Enter a valid email address",
  }
}

export function isValidContact(contact: Contact) {
  const errors = contactErrors(contact)
  return !errors.name && !errors.email
}

export function ContactFields({ value, onChange }: { value: Contact; onChange: (value: Contact) => void }) {
  const [touched, setTouched] = useState({ name: false, email: false })
  const errors = contactErrors(value)
  const fields = [
    { key: "name" as const, label: "Full name", type: "text", autoComplete: "name" },
    { key: "email" as const, label: "Email", type: "email", autoComplete: "email" },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => {
        const error = touched[field.key] ? errors[field.key] : null
        return (
          <div key={field.key} className="grid gap-1.5">
            <Label htmlFor={`contact-${field.key}`}>{field.label}</Label>
            <Input
              id={`contact-${field.key}`}
              type={field.type}
              autoComplete={field.autoComplete}
              required
              value={value[field.key]}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `contact-${field.key}-error` : undefined}
              onBlur={() => setTouched((current) => ({ ...current, [field.key]: true }))}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
            />
            {error && (
              <p id={`contact-${field.key}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
