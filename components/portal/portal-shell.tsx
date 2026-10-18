"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronsUpDownIcon, FlaskConicalIcon, LogOutIcon, MenuIcon, SettingsIcon } from "lucide-react"
import { toast } from "sonner"

import { GuardedLink } from "@/components/mentor/unsaved-guard"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { isActive, portalFor, type NavItem, type Portal } from "@/components/portal/nav"
import { Logo, LogoMark } from "@/components/site/logo"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { signOut, useAuth, type DemoSession } from "@/lib/auth"
import { getMentor } from "@/lib/data"
import { DEMO_MENTOR_SLUG } from "@/lib/permissions"
import { roleLabels } from "@/lib/site"
import { useAppState } from "@/lib/store"
import { cn } from "@/lib/utils"

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const auth = useAuth()
  const portal = portalFor(pathname)

  // The role gates inside render their own sign-in prompt, so a signed-out visitor gets no workspace chrome.
  if (auth.status !== "signed-in") {
    return (
      <div className="flex min-h-dvh flex-col bg-canvas">
        <header className="flex h-16 items-center px-4 sm:px-6">
          <Logo />
        </header>
        <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pb-16">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r bg-sidebar lg:block print:hidden">
        <div className="sticky top-0 flex h-dvh flex-col">
          <div className="flex h-16 items-center px-5">
            <Logo />
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <PortalNav portal={portal} pathname={pathname} />
          </div>
          <div className="border-t p-3">
            <AccountMenu session={auth.session} portal={portal} />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <TopBar portal={portal} pathname={pathname} session={auth.session} />
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-16">
          {children}
        </main>
      </div>

      <TabBar portal={portal} pathname={pathname} session={auth.session} />
    </div>
  )
}

function TopBar({ portal, pathname, session }: { portal: Portal; pathname: string; session: DemoSession }) {
  const current = allItems(portal).find((item) => isActive(item, pathname))

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:h-16 lg:px-10 print:hidden">
      <Link href={portal.home} className="rounded-lg focus-ring lg:hidden" aria-label={`${portal.name} home`}>
        <LogoMark className="size-7" />
      </Link>
      <p className="truncate text-sm font-medium lg:hidden">{current?.label ?? portal.name}</p>
      <p className="hidden text-sm text-muted-foreground lg:block">
        {roleLabels[session.role]} workspace
      </p>
      <div className="ml-auto flex items-center gap-1">
        <DemoChip />
        <ThemeToggle />
      </div>
    </header>
  )
}

function DemoChip() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-3 text-xs font-medium text-warning transition-colors hover:border-warning/60 focus-ring"
          />
        }
      >
        <FlaskConicalIcon className="size-3.5" aria-hidden="true" />
        Demo data
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="font-medium">You&apos;re in a demo</p>
        <p className="text-muted-foreground">
          Login is simulated and everything is stored in this browser. Records marked Sample are made up, and no real money or email is sent.
        </p>
      </PopoverContent>
    </Popover>
  )
}

function PortalNav({ portal, pathname, onNavigate }: { portal: Portal; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label={`${portal.name} workspace`} className="flex flex-col gap-5">
      {portal.groups.map((group, index) => (
        <div key={group.label ?? index}>
          {group.label && <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(item, pathname)} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {portal.links.length > 0 && (
        <div>
          <p className="px-3 pb-1.5 text-xs font-medium text-muted-foreground">Shortcuts</p>
          <ul className="flex flex-col gap-0.5">
            {portal.links.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={false} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  )
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <GuardedLink
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-ring",
        active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-primary" />}
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </GuardedLink>
  )
}

function TabBar({ portal, pathname, session }: { portal: Portal; pathname: string; session: DemoSession }) {
  const [open, setOpen] = useState(false)
  const primary = allItems(portal).filter((item) => item.primary).slice(0, 4)

  return (
    <nav aria-label={`${portal.name} tabs`} className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden print:hidden">
      <ul className="mx-auto flex max-w-lg">
        {primary.map((item) => {
          const Icon = item.icon
          const active = isActive(item, pathname)
          return (
            <li key={item.href} className="flex-1">
              <GuardedLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors focus-ring", active ? "font-medium text-primary" : "text-muted-foreground")}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="max-w-full truncate px-1">{shortLabel(item.label)}</span>
              </GuardedLink>
            </li>
          )
        })}
        <li className="flex-1">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<button type="button" aria-label="Open menu" className="flex h-16 w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground focus-ring" />}
            >
              <MenuIcon className="size-5" aria-hidden="true" />
              More
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-y-auto rounded-t-2xl p-0">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription className="sr-only">Every page in your {portal.name.toLowerCase()} workspace.</SheetDescription>
              </div>
              <div className="p-3">
                <PortalNav portal={portal} pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
              <div className="flex flex-col gap-3 border-t p-4">
                <AccountSummary session={session} />
                <div className="grid grid-cols-2 gap-2">
                  <GuardedLink href="/dashboard/settings" onClick={() => setOpen(false)} className="flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium focus-ring">
                    <SettingsIcon className="size-4" aria-hidden="true" />
                    Settings
                  </GuardedLink>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpen(false)
                      logOut()
                    }}
                  >
                    <LogOutIcon aria-hidden="true" />
                    Log out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  )
}

function AccountMenu({ session, portal }: { session: DemoSession; portal: Portal }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account menu, signed in as ${session.email} (${roleLabels[session.role]})`}
            className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted focus-ring"
          />
        }
      >
        <AccountSummary session={session} />
        <ChevronsUpDownIcon className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{session.email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<GuardedLink href={portal.home} />}>{portal.name} home</DropdownMenuItem>
        <DropdownMenuItem render={<GuardedLink href="/dashboard/settings" />}>
          <SettingsIcon aria-hidden="true" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logOut}>
          <LogOutIcon aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccountSummary({ session }: { session: DemoSession }) {
  const { profile } = useAppState()
  const mentor = session.role === "mentor" ? getMentor(DEMO_MENTOR_SLUG) : undefined
  const handle = session.email.split("@")[0]
  const name = mentor?.name ?? (session.role === "learner" ? profile.name : handle.charAt(0).toUpperCase() + handle.slice(1))

  return (
    <span className="flex min-w-0 items-center gap-3">
      <MentorAvatar name={name} photo={mentor?.photo} className="size-8" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">{roleLabels[session.role]}</span>
      </span>
    </span>
  )
}

function logOut() {
  signOut()
  toast.success("Logged out")
}

function allItems(portal: Portal) {
  return portal.groups.flatMap((group) => group.items)
}

const shortLabel = (label: string) => label.replace("Mentor applications", "Applications").replace("Saved mentors", "Saved")
