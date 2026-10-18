"use client"

import Link from "next/link"
import { useState } from "react"
import { LockIcon } from "lucide-react"

import { ApplicationWizard } from "@/components/apply/application-wizard"
import { StatusView } from "@/components/apply/status-view"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { visibleTo } from "@/lib/mentor-application"
import { startApplication, useAppState } from "@/lib/store"
import { cn } from "@/lib/utils"

export function ApplyPanel() {
  const auth = useAuth()
  const { applications } = useAppState()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (auth.status === "loading") return <Skeleton className="h-96 rounded-2xl" />

  if (auth.status === "signed-out") {
    return (
      <div className="surface p-6 text-center shadow-card">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <LockIcon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-subheading">Create an account to apply</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your application is saved to your account as a draft, and only you and our reviewers can see it.</p>
        <Link href="/signup?next=%2Fbecome-a-mentor" className={cn(buttonVariants({ size: "lg" }), "mt-5")}>
          Create account to start
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login?next=%2Fbecome-a-mentor" className="link">
            Log in
          </Link>
        </p>
      </div>
    )
  }

  const principal = { role: auth.session.role, email: auth.session.email }
  if (principal.role === "reviewer") {
    return (
      <div className="surface p-6 text-center shadow-card">
        <h2 className="text-subheading">Reviewer accounts can&apos;t apply</h2>
        <p className="mt-1 text-sm text-muted-foreground">Reviewers keep their account separate from mentor applications. Log in with a learner account to apply.</p>
        <Link href="/dashboard/reviewer" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          Open the review queue
        </Link>
      </div>
    )
  }
  if (principal.role === "admin") {
    return (
      <div className="surface p-6 text-center shadow-card">
        <h2 className="text-subheading">Admin accounts can&apos;t apply</h2>
        <p className="mt-1 text-sm text-muted-foreground">Staff accounts stay separate from mentor applications. Log in with a learner account to apply.</p>
        <Link href="/dashboard/admin" className={cn(buttonVariants({ variant: "outline" }), "mt-5")}>
          Open the admin workspace
        </Link>
      </div>
    )
  }

  const mine = visibleTo(principal, applications)
  const application = mine.find((item) => item.status === "approved") ?? mine.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  if (!application) {
    return (
      <div className="surface p-6 shadow-card">
        <h2 className="text-subheading">Apply to mentor</h2>
        <p className="mt-1 text-sm text-muted-foreground">Six short steps: your basics, background, expertise, evidence, offers, then review. Allow about 10 minutes.</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>You&apos;ll need a government ID and one proof of your education, work or expertise.</li>
          <li>Documents are seen only by reviewers and never appear on your profile.</li>
          <li>You can stop at any time; your draft is saved.</li>
        </ul>
        <Button
          size="lg"
          className="mt-5"
          onClick={() => {
            const result = startApplication(principal)
            setError(result.ok ? null : result.message)
          }}
        >
          Start application
        </Button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }

  const editable = application.status === "draft" || (application.status === "info-required" && editing)
  if (editable) return <ApplicationWizard key={application.id} application={application} principal={principal} startAt={application.status === "info-required" ? "evidence" : undefined} />
  return <StatusView application={application} principal={principal} onEdit={() => setEditing(true)} />
}
