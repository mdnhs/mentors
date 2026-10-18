import {
  BanknoteIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CompassIcon,
  ExternalLinkIcon,
  HeartIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  ReceiptTextIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StarIcon,
  Undo2Icon,
  UsersIcon,
  UsersRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { DEMO_MENTOR_SLUG, type Role } from "@/lib/permissions"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  // Shown in the phone tab bar; everything else lives under "More".
  primary?: boolean
  // Matches only this exact path, for overview pages that sit above their siblings.
  exact?: boolean
}

export type NavGroup = { label?: string; items: NavItem[] }

export type Portal = {
  role: Role
  name: string
  home: string
  groups: NavGroup[]
  links: NavItem[]
}

export const portals: Record<Role, Portal> = {
  learner: {
    role: "learner",
    name: "Learner",
    home: "/dashboard",
    groups: [
      {
        items: [
          { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon, primary: true, exact: true },
          { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDaysIcon, primary: true },
          { href: "/dashboard/messages", label: "Messages", icon: MessageSquareIcon, primary: true },
          { href: "/dashboard/saved", label: "Saved mentors", icon: HeartIcon, primary: true },
          { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
        ],
      },
    ],
    links: [
      { href: "/mentors", label: "Find a mentor", icon: CompassIcon },
      { href: "/sessions", label: "Group sessions", icon: UsersRoundIcon },
    ],
  },
  mentor: {
    role: "mentor",
    name: "Mentor",
    home: "/dashboard/mentor",
    groups: [
      {
        items: [
          { href: "/dashboard/mentor", label: "Overview", icon: LayoutDashboardIcon, primary: true, exact: true },
          { href: "/dashboard/mentor/bookings", label: "Bookings", icon: CalendarDaysIcon, primary: true },
          { href: "/dashboard/mentor/messages", label: "Messages", icon: MessageSquareIcon, primary: true },
          { href: "/dashboard/mentor/offers", label: "Offers", icon: LayersIcon, primary: true },
          { href: "/dashboard/mentor/availability", label: "Availability", icon: CalendarClockIcon },
          { href: "/dashboard/mentor/earnings", label: "Earnings", icon: WalletIcon },
        ],
      },
    ],
    links: [{ href: `/mentors/${DEMO_MENTOR_SLUG}`, label: "Public profile", icon: ExternalLinkIcon }],
  },
  reviewer: {
    role: "reviewer",
    name: "Reviewer",
    home: "/dashboard/reviewer",
    groups: [{ items: [{ href: "/dashboard/reviewer", label: "Applications", icon: ClipboardListIcon, primary: true }] }],
    links: [{ href: "/become-a-mentor", label: "Applicant view", icon: ExternalLinkIcon }],
  },
  admin: {
    role: "admin",
    name: "Admin",
    home: "/dashboard/admin",
    groups: [
      { items: [{ href: "/dashboard/admin", label: "Overview", icon: LayoutDashboardIcon, primary: true, exact: true }] },
      {
        label: "Marketplace",
        items: [
          { href: "/dashboard/admin/applications", label: "Mentor applications", icon: ClipboardListIcon, primary: true },
          { href: "/dashboard/admin/moderation", label: "Mentors & offers", icon: ShieldCheckIcon },
          { href: "/dashboard/admin/reviews", label: "Reviews", icon: StarIcon },
        ],
      },
      {
        label: "Money",
        items: [
          { href: "/dashboard/admin/bookings", label: "Bookings", icon: CalendarClockIcon, primary: true },
          { href: "/dashboard/admin/transactions", label: "Transactions", icon: ReceiptTextIcon },
          { href: "/dashboard/admin/refunds", label: "Refunds & disputes", icon: Undo2Icon },
          { href: "/dashboard/admin/payouts", label: "Payouts", icon: BanknoteIcon },
        ],
      },
      {
        label: "Support",
        items: [
          { href: "/dashboard/admin/users", label: "Users & support", icon: UsersIcon },
          { href: "/dashboard/admin/audit", label: "Audit log", icon: ScrollTextIcon },
        ],
      },
    ],
    links: [],
  },
}

export function portalFor(pathname: string): Portal {
  if (pathname.startsWith("/dashboard/admin")) return portals.admin
  if (pathname.startsWith("/dashboard/mentor")) return portals.mentor
  if (pathname.startsWith("/dashboard/reviewer")) return portals.reviewer
  return portals.learner
}

export function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
}
