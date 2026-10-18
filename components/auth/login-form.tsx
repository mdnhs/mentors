"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { homeFor, safeNext, signIn } from "@/lib/auth"
import type { Role } from "@/lib/permissions"
import { site } from "@/lib/site"

const roles: Role[] = ["learner", "mentor", "reviewer", "admin"]

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get("next")
  const [email, setEmail] = useState<string>(site.learner.email)
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>(() => {
    const requested = params.get("role")
    return roles.find((value) => value === requested) ?? "learner"
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    await new Promise((resolve) => setTimeout(resolve, 700))
    if (!signIn(email.trim(), role)) {
      setError("We couldn't log you in. Check that this browser allows site storage, then try again.")
      setSubmitting(false)
      return
    }
    toast.success("Logged in")
    router.push(safeNext(next, homeFor(role)))
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
      <PasswordField
        id="login-password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        action={
          <Link href="/forgot-password" className="link text-sm">
            Forgot password?
          </Link>
        }
      />
      <fieldset aria-describedby="login-role-note">
        <legend className="text-sm font-medium">Log in as</legend>
        <p id="login-role-note" className="text-xs text-muted-foreground">
          Demo only: a real account would have one role, set by us.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {roles.map((value) => (
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
      <div role="alert" className="empty:hidden text-sm text-destructive">
        {error}
      </div>
      <Button type="submit" size="lg" disabled={submitting} className="mt-2">
        {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {submitting ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Demo login: any email and a password of 4+ characters works. The mentor, reviewer and admin roles open demo workspaces.</p>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={next ? `/signup?next=${encodeURIComponent(safeNext(next, "/dashboard"))}` : "/signup"} className="link">
          Create account
        </Link>
      </p>
    </form>
  )
}
