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
import { safeNext, signIn } from "@/lib/auth"
import { saveProfile, useAppState } from "@/lib/store"

const goals = [
  { value: "learner", label: "Find a mentor", hint: "Book sessions and track your plan." },
  { value: "mentor-applicant", label: "Become a mentor", hint: "Start a mentor application next." },
] as const

type Goal = (typeof goals)[number]["value"]

export function SignupForm() {
  const router = useRouter()
  const next = useSearchParams().get("next")
  const { profile } = useAppState()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [goal, setGoal] = useState<Goal>(next === "/become-a-mentor" ? "mentor-applicant" : "learner")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    await new Promise((resolve) => setTimeout(resolve, 700))
    // Mentor applicants start as learners; the mentor role only comes with an approved application.
    if (!signIn(email.trim(), "learner")) {
      setError("We couldn't create your account. Check that this browser allows site storage, then try again.")
      setSubmitting(false)
      return
    }
    saveProfile({ ...profile, name: name.trim(), email: email.trim() })
    toast.success("Account created")
    router.push(safeNext(next, goal === "mentor-applicant" ? "/become-a-mentor" : "/dashboard"))
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="signup-name">Full name</Label>
        <Input id="signup-name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="signup-email">Email</Label>
        <Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <PasswordField id="signup-password" autoComplete="new-password" value={password} onChange={setPassword} hint="At least 4 characters." />
      <fieldset>
        <legend className="text-sm font-medium">I want to</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {goals.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer flex-col rounded-xl border bg-card p-3 text-sm transition hover:border-foreground/20 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" name="goal" value={option.value} checked={goal === option.value} onChange={() => setGoal(option.value)} className="sr-only" />
              <span className="font-medium">{option.label}</span>
              <span className="text-muted-foreground">{option.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div role="alert" className="empty:hidden text-sm text-destructive">
        {error}
      </div>
      <Button type="submit" size="lg" disabled={submitting} className="mt-2">
        {submitting && <Loader2Icon className="animate-spin" aria-hidden="true" />}
        {submitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">Demo sign-up: nothing is sent anywhere. Your account lives only in this browser.</p>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(safeNext(next, "/dashboard"))}` : "/login"} className="link">
          Log in
        </Link>
      </p>
    </form>
  )
}
