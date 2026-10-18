import Link from "next/link"
import { BadgeCheckIcon, CalendarIcon, ChevronRightIcon, MapPinIcon } from "lucide-react"

import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { Rating } from "@/components/mentors/rating"
import { SaveButton } from "@/components/mentors/save-button"
import { availabilityLabel, getLocation } from "@/lib/data"
import { formatPrice } from "@/lib/format"
import { getStartingPrice } from "@/lib/offers"
import type { Mentor } from "@/lib/types"
import { hasCoreChecks } from "@/lib/verification"
import { cn } from "@/lib/utils"

type MentorCardProps = {
  mentor: Mentor
  priority?: boolean
  // Lowest price among the offers matching the active filters; defaults to the starting price.
  price?: number
  // "vertical" keeps the portrait layout at every width (used in horizontal carousels).
  layout?: "responsive" | "vertical"
  className?: string
}

export function MentorCard({ mentor, priority, price, layout = "responsive", className }: MentorCardProps) {
  const isVerified = hasCoreChecks(mentor.verification)
  const responsive = layout === "responsive"
  const skills = mentor.skills.slice(0, 2)

  return (
    <article
      className={cn(
        "group relative flex min-w-0 surface-interactive p-2",
        responsive ? "gap-3 sm:flex-col sm:gap-0" : "flex-col",
        className
      )}
    >
      <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-muted", responsive ? "aspect-4/5 w-28 sm:w-auto" : "aspect-4/5")}>
        <MentorPhoto
          src={mentor.photo}
          name={mentor.name}
          priority={priority}
          sizes={responsive ? "(min-width: 1024px) 270px, (min-width: 640px) 45vw, 112px" : "256px"}
          className="transition duration-500 group-hover:scale-105"
        />
        <SaveButton slug={mentor.slug} name={mentor.name} className={cn("absolute top-2 right-2 z-10", responsive && "hidden sm:inline-flex")} />
        <span
          className={cn(
            "absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 text-xs font-medium backdrop-blur",
            responsive && "hidden sm:inline-flex"
          )}
        >
          <MapPinIcon className="size-3" aria-hidden="true" />
          {getLocation(mentor)}
        </span>
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", responsive ? "py-1 pr-1 sm:px-2 sm:pt-3 sm:pb-1" : "px-2 pt-3 pb-1")}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1 text-base font-semibold">
            <span className="truncate">{mentor.name}</span>
            {isVerified && <BadgeCheckIcon className="size-4 shrink-0 text-primary" role="img" aria-label="ID and credentials checked" />}
          </h3>
          {responsive && <SaveButton slug={mentor.slug} name={mentor.name} className="-mt-1.5 -mr-1.5 size-9 shadow-none sm:hidden" />}
          <Rating slug={mentor.slug} className={cn("shrink-0", responsive && "hidden sm:inline-flex")} />
        </div>
        <p className="mt-0.5 truncate text-sm">{mentor.role}</p>
        <p className="truncate text-sm text-muted-foreground">{mentor.experience}</p>

        <ul className={cn("mt-3 flex gap-1.5 overflow-hidden", responsive && "hidden sm:flex")} aria-label="Expertise">
          {skills.map((skill) => (
            <li key={skill} className="min-w-0 truncate rounded-md bg-muted px-2 py-1 text-xs">
              {skill}
            </li>
          ))}
        </ul>
        <p className={cn("mt-2 flex items-center gap-1.5 text-xs text-muted-foreground", responsive && "hidden sm:flex")}>
          <CalendarIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {availabilityLabel(mentor)}
        </p>

        <div className={cn("mt-auto flex items-end justify-between gap-2 pt-3", responsive ? "sm:mt-3 sm:border-t" : "mt-3 border-t")}>
          {responsive && <Rating slug={mentor.slug} className="sm:hidden" />}
          <CardPrice price={price ?? getStartingPrice(mentor)} />
          <Link
            href={`/mentors/${mentor.slug}`}
            className={cn(
              "inline-flex items-center rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-colors outline-none group-hover:bg-primary group-hover:text-primary-foreground after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50",
              responsive && "max-sm:px-2"
            )}
          >
            <span className={cn(responsive && "max-sm:sr-only")}>Book session</span>
            <span className="sr-only"> with {mentor.name}</span>
            {responsive && <ChevronRightIcon className="size-4 sm:hidden" aria-hidden="true" />}
          </Link>
        </div>
      </div>
    </article>
  )
}

function CardPrice({ price }: { price: number | null }) {
  if (price === null) return <p className="text-sm text-muted-foreground">Not taking bookings</p>
  return (
    <p className="text-xs text-muted-foreground">
      From
      <span className="ml-1 text-base font-semibold text-foreground">{formatPrice(price)}</span>
    </p>
  )
}
