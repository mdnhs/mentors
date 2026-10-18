"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronDownIcon, LogOutIcon, MenuIcon, SettingsIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Container } from "@/components/site/container"
import { Logo } from "@/components/site/logo"
import { ThemeToggle } from "@/components/site/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { signOut, useAuth, workspaces, type DemoSession } from "@/lib/auth"
import { nav, roleLabels } from "@/lib/site"
import { cn } from "@/lib/utils"

const accountName = (email: string) => email.split("@")[0]

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const auth = useAuth()
  const session = auth.status === "signed-in" ? auth.session : null
  // Mentors already have a workspace, so only visitors and learners are invited to apply.
  const showApply = auth.status === "signed-out" || session?.role === "learner"
  const workspace = session && workspaces[session.role]

  const isActive = (href: string) => {
    const path = href.split("?")[0]
    return href === path && (pathname === path || pathname.startsWith(`${path}/`))
  }

  const mobileLinks = workspace ? [...nav, workspace] : nav

  return (
    <header className="sticky top-0 z-40 border-b print:hidden border-border/70 bg-background/85 backdrop-blur-md">
      <Container className="flex h-14 items-center gap-8 sm:h-16">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-ring aria-[current=page]:font-medium aria-[current=page]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {workspace && (
            <Link
              href={workspace.href}
              aria-current={isActive(workspace.href) ? "page" : undefined}
              className={cn(buttonVariants({ variant: "ghost" }), "hidden px-3 aria-[current=page]:bg-muted lg:inline-flex")}
            >
              {workspace.label}
            </Link>
          )}
          {auth.status === "signed-out" && (
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden px-3 lg:inline-flex")}>
              Log in
            </Link>
          )}
          {showApply && (
            <Link href="/become-a-mentor" className={cn(buttonVariants(), "hidden lg:inline-flex")}>
              Become a Mentor
            </Link>
          )}

          <ThemeToggle />

          {session && <AccountMenu session={session} />}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}>
              <MenuIcon aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs gap-0 p-0">
              <div className="flex h-16 items-center border-b px-4">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo />
              </div>
              <nav aria-label="Mobile" className="flex flex-col p-2">
                {mobileLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-muted focus-ring aria-[current=page]:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t p-4">
                {session && <AccountSummary session={session} className="mb-2" />}
                {showApply && (
                  <Link href="/become-a-mentor" onClick={() => setOpen(false)} className={cn(buttonVariants({ size: "lg" }), "text-base")}>
                    Become a Mentor
                  </Link>
                )}
                {session ? (
                  <>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setOpen(false)}
                      className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-base")}
                    >
                      Account settings
                    </Link>
                    <Button
                      variant="outline"
                      size="lg"
                      className="text-base"
                      onClick={() => {
                        signOut()
                        setOpen(false)
                      }}
                    >
                      Log out
                    </Button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setOpen(false)} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base")}>
                    Log in
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  )
}

function AccountSummary({ session, className }: { session: DemoSession; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <MentorAvatar name={accountName(session.email)} className="size-9" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{session.email}</p>
        <Badge tone="accent" className="mt-0.5">
          {roleLabels[session.role]}
        </Badge>
      </div>
    </div>
  )
}

function AccountMenu({ session }: { session: DemoSession }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="hidden gap-1.5 px-1.5 lg:inline-flex"
            aria-label={`Account menu, signed in as ${session.email} (${roleLabels[session.role]})`}
          />
        }
      >
        <MentorAvatar name={accountName(session.email)} className="size-7" />
        <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-1.5 py-2">
            <AccountSummary session={session} />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={workspaces[session.role].href} />}>{workspaces[session.role].label}</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
          <SettingsIcon aria-hidden="true" />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOutIcon aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
