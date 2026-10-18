"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { MenuIcon } from "lucide-react"

import { Container } from "@/components/site/container"
import { Logo } from "@/components/site/logo"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { signOut, useAuth } from "@/lib/auth"
import { nav } from "@/lib/site"
import { cn } from "@/lib/utils"

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const auth = useAuth()
  const signedIn = auth.status === "signed-in"
  const isAdmin = signedIn && auth.session.role === "admin"

  const isActive = (href: string) => {
    const path = href.split("?")[0]
    return href === path && (pathname === path || pathname.startsWith(`${path}/`))
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
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
          {isAdmin && (
            <Link href="/dashboard/admin" className={cn(buttonVariants({ variant: "ghost" }), "hidden px-3 lg:inline-flex")}>
              Admin
            </Link>
          )}
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost" }), "hidden px-3 lg:inline-flex")}>
            My sessions
          </Link>
          {signedIn ? (
            <Button variant="ghost" className="hidden px-3 lg:inline-flex" onClick={signOut}>
              Log out
            </Button>
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden px-3 lg:inline-flex")}>
              Log in
            </Link>
          )}
          <Link href="/become-a-mentor" className={cn(buttonVariants(), "hidden lg:inline-flex")}>
            Become a Mentor
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}>
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs gap-0 p-0">
              <div className="flex h-16 items-center border-b px-4">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo />
              </div>
              <nav aria-label="Mobile" className="flex flex-col p-2">
                {[...nav, { label: "My sessions", href: "/dashboard" }, ...(isAdmin ? [{ label: "Admin", href: "/dashboard/admin" }] : [])].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t p-4">
                <Link href="/become-a-mentor" onClick={() => setOpen(false)} className={cn(buttonVariants({ size: "lg" }), "text-base")}>
                  Become a Mentor
                </Link>
                {signedIn ? (
                  <Button variant="outline" size="lg" className="text-base" onClick={() => { signOut(); setOpen(false) }}>
                    Log out
                  </Button>
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
