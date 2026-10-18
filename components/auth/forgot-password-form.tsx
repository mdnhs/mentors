"use client"

import Link from "next/link"
import { useState } from "react"
import { Loader2Icon, MailCheckIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setSentTo(email.trim())
    setSubmitting(false)
  }

  if (sentTo) {
    return (
      <div role="status" className="mt-8 rounded-2xl border p-5">
        <MailCheckIcon className="size-6 text-primary" aria-hidden="true" />
        <p className="mt-3 font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve sent a reset link.
        </p>
        <p className="mt-3 rounded-lg bg-warning-soft p-2.5 text-xs text-warning">Demo only: no email is actually sent. Any password of 4+ characters logs you in.</p>
        <Link href="/login" className={buttonVariants({ className: "mt-4 w-full" })}>
          Back to log in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="reset-email">Email</Label>
        <Input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {submitting ? "Sending…" : "Send reset link"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Demo: no email is sent. This shows what the real flow would look like.</p>
    </form>
  )
}
