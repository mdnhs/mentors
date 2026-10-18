"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "@/lib/auth"
import type { Role } from "@/lib/permissions"
import { site } from "@/lib/site"

export function LoginForm() {
  const router = useRouter()
  const next = useSearchParams().get("next")
  const [email, setEmail] = useState<string>(site.learner.email)
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("learner")
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    signIn(email.trim(), role)
    // Only same-site paths, so the form can't be used to bounce someone elsewhere.
    const fallback = role === "mentor" ? "/dashboard/mentor" : role === "reviewer" ? "/dashboard/reviewer" : role === "admin" ? "/dashboard/admin" : "/dashboard"
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : fallback)
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          minLength={4}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Log in as</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["learner", "mentor", "reviewer", "admin"] as const).map((value) => (
            <label
              key={value}
              className="flex cursor-pointer items-center justify-center rounded-xl border bg-card p-2.5 text-sm capitalize transition hover:border-foreground/20 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" disabled={submitting} className="mt-2">
        {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {submitting ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Demo login: any email and a password of 4+ characters works. The mentor, reviewer and admin roles open demo workspaces.</p>
    </form>
  )
}
