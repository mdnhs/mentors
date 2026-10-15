import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="focus-ring -my-2 inline-flex min-h-10 items-center gap-1.5 rounded-md py-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}
