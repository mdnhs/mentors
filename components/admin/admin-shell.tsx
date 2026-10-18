"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BanknoteIcon,
  CalendarClockIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  StarIcon,
  Undo2Icon,
  UsersIcon,
} from "lucide-react"

import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

const modules = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/dashboard/admin/applications", label: "Mentor applications", icon: ClipboardListIcon },
  { href: "/dashboard/admin/moderation", label: "Mentors & offers", icon: ShieldCheckIcon },
  { href: "/dashboard/admin/bookings", label: "Bookings", icon: CalendarClockIcon },
  { href: "/dashboard/admin/refunds", label: "Refunds & disputes", icon: Undo2Icon },
  { href: "/dashboard/admin/transactions", label: "Transactions", icon: ReceiptTextIcon },
  { href: "/dashboard/admin/payouts", label: "Payouts", icon: BanknoteIcon },
  { href: "/dashboard/admin/reviews", label: "Reviews", icon: StarIcon },
  { href: "/dashboard/admin/users", label: "Users & support", icon: UsersIcon },
  { href: "/dashboard/admin/audit", label: "Audit log", icon: ScrollTextIcon },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const auth = useAuth()
  const email = auth.status === "signed-in" ? auth.session.email : undefined

  const isActive = (href: string) => (href === "/dashboard/admin" ? pathname === href || pathname === `${href}/` : pathname === href || pathname.startsWith(`${href}/`))

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <ShieldCheckIcon className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-title">Admin workspace</h1>
            <p className="text-sm text-muted-foreground">{email ? `${email} · demo administrator` : "demo administrator"}</p>
          </div>
        </div>
      </header>

      <div className="mt-6 lg:grid lg:grid-cols-[15rem_1fr] lg:items-start lg:gap-8">
        <nav aria-label="Admin modules" className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
          {modules.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors focus-ring lg:w-full",
                  active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
      </div>
    </div>
  )
}
