"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { site } from "@/lib/site"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState<string>(site.learner.email)
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    router.push("/dashboard")
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
      <Button type="submit" size="lg" disabled={submitting} className="mt-2">
        {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {submitting ? "Logging in…" : "Log in"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Demo login: any email and a password of 4+ characters works.</p>
    </form>
  )
}
