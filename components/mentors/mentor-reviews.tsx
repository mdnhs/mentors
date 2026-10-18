"use client"

import { useEffect, useRef, useState } from "react"
import { MessageSquareIcon, StarIcon } from "lucide-react"

import { Chip } from "@/components/filters/chip"
import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { Button } from "@/components/ui/button"
import { offerTypeLabels } from "@/lib/categories"
import type { getRating, getReviews } from "@/lib/data"
import { formatMonthYear } from "@/lib/format"
import type { OfferType } from "@/lib/types"
import { cn } from "@/lib/utils"

type MentorReview = ReturnType<typeof getReviews>[number]

const PAGE_SIZE = 5
const stars = [5, 4, 3, 2, 1]

type MentorReviewsProps = {
  reviews: MentorReview[]
  rating: ReturnType<typeof getRating>
  firstName: string
}

export function MentorReviews({ reviews, rating, firstName }: MentorReviewsProps) {
  const [type, setType] = useState<OfferType | "all">("all")
  const [limit, setLimit] = useState(PAGE_SIZE)
  const listRef = useRef<HTMLUListElement>(null)
  const focusIndex = useRef<number | null>(null)

  // The button disappears once everything is shown, so focus moves to the first newly revealed review.
  useEffect(() => {
    if (focusIndex.current === null) return
    const item = listRef.current?.children[focusIndex.current]
    if (item instanceof HTMLElement) item.focus()
    focusIndex.current = null
  }, [limit])

  const types = (Object.keys(offerTypeLabels) as OfferType[]).filter((item) => reviews.some((review) => review.offerType === item))
  const filtered = type === "all" ? reviews : reviews.filter((review) => review.offerType === type)
  const shown = filtered.slice(0, limit)
  const countLabel = (count: number) => `${count} ${count === 1 ? "review" : "reviews"}`

  const showMore = () => {
    focusIndex.current = shown.length
    setLimit(shown.length + PAGE_SIZE)
  }

  const selectType = (next: OfferType | "all") => {
    setType(next)
    setLimit(PAGE_SIZE)
  }

  return (
    <section aria-labelledby="reviews">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="reviews" className="scroll-mt-24 text-subheading">
          Reviews
        </h2>
        {rating && (
          <p className="flex items-center gap-1.5 text-sm">
            <StarIcon className="size-4 fill-rating text-rating" aria-hidden="true" />
            <span className="font-semibold">{rating.average.toFixed(1)}</span>
            <span className="text-muted-foreground">· {countLabel(rating.count)}</span>
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Only learners who completed a booking can leave a review.</p>

      {reviews.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareIcon className="size-4" aria-hidden="true" />
          No reviews yet. {firstName} hasn&apos;t completed any reviewed bookings.
        </p>
      ) : (
        <>
          <div className="mt-4 max-w-sm space-y-1.5" role="group" aria-label="Rating breakdown">
            {stars.map((star) => {
              const count = reviews.filter((review) => review.rating === star).length
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 text-muted-foreground">
                    {star} <span className="sr-only">{star === 1 ? "star" : "stars"}</span>
                    <StarIcon className="inline size-3 fill-rating text-rating" aria-hidden="true" />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span className="block h-full rounded-full bg-rating" style={{ width: `${(count / reviews.length) * 100}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right text-muted-foreground tabular-nums">
                    {count}
                    <span className="sr-only"> {count === 1 ? "review" : "reviews"}</span>
                  </span>
                </div>
              )
            })}
          </div>

          {types.length > 1 && (
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter reviews by session type">
              <Chip active={type === "all"} onClick={() => selectType("all")}>
                All
              </Chip>
              {types.map((item) => (
                <Chip key={item} active={type === item} onClick={() => selectType(item)}>
                  {offerTypeLabels[item]}
                </Chip>
              ))}
            </div>
          )}

          <p className="sr-only" aria-live="polite">
            Showing {shown.length} of {countLabel(filtered.length)}
          </p>
          <ul ref={listRef} className="mt-2 divide-y" aria-label="Reviews">
            {shown.map((review) => (
              <li key={review.id} tabIndex={-1} className="py-5 focus-ring">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MentorAvatar name={review.author} className="size-9" />
                    <div>
                      <p className="text-sm font-medium">{review.author}</p>
                      <p className="text-xs text-muted-foreground">{review.authorRole}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="flex justify-end gap-0.5" role="img" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, index) => (
                        <StarIcon
                          key={index}
                          className={cn("size-3.5", index < review.rating ? "fill-rating text-rating" : "fill-muted text-muted")}
                          aria-hidden="true"
                        />
                      ))}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatMonthYear(review.date)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{review.text}</p>
                <p className="mt-2 text-xs text-muted-foreground">{offerTypeLabels[review.offerType]}</p>
              </li>
            ))}
          </ul>

          {filtered.length > shown.length && (
            <Button variant="outline" className="mt-2" onClick={showMore}>
              Show more reviews
              <span className="sr-only"> ({filtered.length - shown.length} more)</span>
            </Button>
          )}
        </>
      )}
    </section>
  )
}
