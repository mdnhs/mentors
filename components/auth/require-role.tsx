"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LockIcon, ShieldAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/site/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import type { Role } from "@/lib/permissions"

// Keeps screens meant for one role away from the other. Like the sign-in gate, it is a UI rule in a demo,
// and real enforcement belongs on the server for every request.
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const auth = useAuth()
  const pathname = usePathname()

  if (auth.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading your workspace" className="mt-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    )
  }

  if (auth.status === "signed-out") {
    return (
      <EmptyState icon={LockIcon} headingAs="h1" title="Log in to open your workspace" description="This workspace is only shown to a logged-in user with the right role." className="mt-8">
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonVariants()}>
          Log in
        </Link>
      </EmptyState>
    )
  }

  if (auth.session.role !== role) {
    return (
      <EmptyState
        icon={ShieldAlertIcon}
        headingAs="h1"
        title={`This area is for ${role}s`}
        description={`You're logged in with a different role, so these tools aren't available. Log in with the ${role} demo role to open them.`}
        className="mt-8"
      >
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonVariants()}>
          Log in as {role === "admin" ? "an admin" : `a ${role}`}
        </Link>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to my sessions
        </Link>
      </EmptyState>
    )
  }

  return <>{children}</>
}
