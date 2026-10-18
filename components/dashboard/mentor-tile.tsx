import Link from "next/link"

import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { formatPrice } from "@/lib/format"
import { getStartingPrice } from "@/lib/offers"
import type { Mentor } from "@/lib/types"

// A compact, scrollable suggestion; the full card lives on the mentor directory.
export function MentorTileRow({ mentors, now, label }: { mentors: Mentor[]; now: Date; label: string }) {
  return (
    <ul aria-label={label} className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {mentors.map((mentor) => {
        const price = getStartingPrice(mentor, now)
        return (
          <li key={mentor.slug} className="w-40 shrink-0 snap-start">
            <Link href={`/mentors/${mentor.slug}`} className="group block rounded-2xl border bg-card p-2 transition-colors hover:border-primary/40 focus-ring">
              <span className="relative block aspect-square overflow-hidden rounded-xl bg-muted">
                <MentorPhoto src={mentor.photo} name={mentor.name} alt="" sizes="160px" />
              </span>
              <span className="block px-1 pt-2.5 pb-1">
                <span className="block truncate text-sm font-medium group-hover:text-primary">{mentor.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{mentor.role}</span>
                {price !== null && <span className="mt-1.5 block text-xs text-muted-foreground tabular-nums">From {formatPrice(price)}</span>}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
