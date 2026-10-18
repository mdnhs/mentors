"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  ChevronsUpDownIcon,
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

import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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
  const current = modules.find((item) => isActive(item.href)) ?? modules[0]
  const [menuOpen, setMenuOpen] = useState(false)
  const CurrentIcon = current.icon

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <ShieldCheckIcon className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Admin workspace</p>
            <p className="text-sm text-muted-foreground">{email ? `${email} · demo administrator` : "demo administrator"}</p>
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger render={<button type="button" className={cn(buttonVariants({ variant: "outline" }), "mt-6 w-full justify-between lg:hidden")} />}>
          <span className="flex items-center gap-2">
            <CurrentIcon className="size-4" aria-hidden="true" />
            <span className="sr-only">Admin module: </span>
            {current.label}
          </span>
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        </SheetTrigger>
        <SheetContent side="left" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Admin modules</SheetTitle>
            <SheetDescription>Jump to another part of the admin workspace.</SheetDescription>
          </SheetHeader>
          <ModuleNav isActive={isActive} onNavigate={() => setMenuOpen(false)} className="px-4 pb-4" />
        </SheetContent>
      </Sheet>

      <div className="mt-6 lg:grid lg:grid-cols-[15rem_1fr] lg:items-start lg:gap-8">
        <ModuleNav isActive={isActive} className="hidden lg:sticky lg:top-24 lg:flex" />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}

function ModuleNav({ isActive, onNavigate, className }: { isActive: (href: string) => boolean; onNavigate?: () => void; className?: string }) {
  return (
    <nav aria-label="Admin modules" className={cn("flex flex-col gap-0.5", className)}>
      {modules.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors focus-ring",
              active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
