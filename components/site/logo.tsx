import Link from "next/link"

import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 text-primary", className)}>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M7 21.5c1.8-5 5.2-7.5 9-7.5s7.2 2.5 9 7.5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="10" r="2.4" fill="#fff" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex min-h-10 items-center gap-2 rounded-lg font-semibold tracking-tight focus-ring", className)}
    >
      <LogoMark />
      <span className="text-lg">{site.name}</span>
    </Link>
  )
}
