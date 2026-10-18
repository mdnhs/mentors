"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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
            <h1 className="text-title">Mentor workspace</h1>
            <p className="text-sm text-muted-foreground">{mentor.name} · demo mentor account</p>
          </div>
        </div>
        <Link href={`/mentors/${mentor.slug}`} className={buttonVariants({ variant: "outline" })}>
          View public profile
        </Link>
      </div>

      <nav aria-label="Workspace" className="scrollbar-none -mx-4 mt-6 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current?.href === tab.href ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 border-transparent px-3 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-ring",
              current?.href === tab.href && "border-primary font-medium text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  )
}
