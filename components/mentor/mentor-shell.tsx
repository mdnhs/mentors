"use client"

import { usePathname } from "next/navigation"

import { GuardedLink, UnsavedChangesDialog } from "@/components/mentor/unsaved-guard"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { buttonVariants } from "@/components/ui/button"
import { getMentor } from "@/lib/data"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/dashboard/mentor", label: "Overview" },
  { href: "/dashboard/mentor/offers", label: "Offers" },
  { href: "/dashboard/mentor/availability", label: "Availability" },
  { href: "/dashboard/mentor/earnings", label: "Earnings" },
]

export function MentorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const mentor = getMentor(DEMO_MENTOR_SLUG)!
  const current = tabs.filter((tab) => pathname === tab.href || (tab.href !== "/dashboard/mentor" && pathname.startsWith(`${tab.href}/`))).at(-1)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <MentorAvatar name={mentor.name} photo={mentor.photo} className="size-12 sm:size-14" />
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Mentor workspace</p>
            <p className="text-lg font-semibold">{mentor.name}</p>
            <p className="text-sm text-muted-foreground">Demo mentor account</p>
          </div>
        </div>
        <GuardedLink href={`/mentors/${mentor.slug}`} className={buttonVariants({ variant: "outline" })}>
          View public profile
        </GuardedLink>
      </div>

      <nav aria-label="Workspace" className="scrollbar-none -mx-4 mt-6 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <GuardedLink
            key={tab.href}
            href={tab.href}
            aria-current={current?.href === tab.href ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-ring",
              current?.href === tab.href && "border-primary font-medium text-foreground"
            )}
          >
            {tab.label}
          </GuardedLink>
        ))}
      </nav>
      {children}
      <UnsavedChangesDialog />
    </>
  )
}

export function MentorPageHeader({ title, description, actions, className }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h1 className="text-heading">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
