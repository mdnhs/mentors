"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LockIcon } from "lucide-react"

import { RequireRole } from "@/components/auth/require-role"
import { EmptyState } from "@/components/site/empty-state"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import type { Role } from "@/lib/permissions"

// Gates the learner screens behind the simulated sign-in. It hides nothing from the browser's storage.
export function RequireSignIn({ role, children }: { role?: Role; children: React.ReactNode }) {
  const auth = useAuth()
  const pathname = usePathname()

  if (auth.status === "loading") {
    return (
      <div aria-busy="true" aria-label="Loading your dashboard" className="mt-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    )
  }

  if (auth.status === "signed-out") {
    return (
      <EmptyState
        icon={LockIcon}
        headingAs="h1"
        title="Log in to see your sessions"
        description="Your bookings, notes and settings are only shown to you once you're logged in."
        className="mt-8"
      >
        <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonVariants()}>
          Log in
        </Link>
        <Link href="/mentors" className={buttonVariants({ variant: "outline" })}>
          Find a mentor
        </Link>
      </EmptyState>
    )
  }

  return role ? <RequireRole role={role}>{children}</RequireRole> : <>{children}</>
}
