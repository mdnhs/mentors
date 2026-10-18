import Link from "next/link"

import { Container } from "@/components/site/container"
import { Logo } from "@/components/site/logo"
import { site } from "@/lib/site"

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Find Mentors", href: "/mentors" },
      { label: "Tech Career", href: "/mentors?track=tech" },
      { label: "Study Abroad", href: "/mentors?track=education" },
      { label: "Group Sessions", href: "/sessions" },
    ],
  },
  {
    title: "Mentors",
    links: [
      { label: "Become a Mentor", href: "/become-a-mentor" },
      { label: "Mentor workspace", href: "/dashboard/mentor" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "My sessions", href: "/dashboard" },
      { label: "Settings", href: "/dashboard/settings" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "/help" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t bg-card print:hidden">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-10 py-12 sm:grid-cols-4 lg:grid-cols-6">
        <div className="col-span-2 sm:col-span-4 lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Mentorship from people who&apos;ve done it, for students and young professionals in Bangladesh.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-2 space-y-1">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="focus-ring -my-2 inline-flex min-h-10 items-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="flex flex-col gap-3 border-t py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {site.name} · Demo build with sample data
        </p>
        <ul className="flex gap-4">
          {site.social.map((item) => (
            <li key={item.label}>
              <a href={item.href} target="_blank" rel="noopener noreferrer" className="focus-ring -my-2 inline-flex min-h-10 items-center rounded-sm transition-colors hover:text-foreground">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  )
}
