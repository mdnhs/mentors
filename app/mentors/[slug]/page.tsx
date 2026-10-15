import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowUpRightIcon, CheckIcon, ClockIcon, MapPinIcon, MessageSquareIcon, ShieldCheckIcon, ShieldIcon, StarIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { MentorsBackLink } from "@/components/mentors/mentors-back-link"
import { MobileBookBar } from "@/components/mentors/mobile-book-bar"
import { OfferPanel } from "@/components/mentors/offer-panel"
import { ProfileSkeleton } from "@/components/mentors/profile-skeleton"
import { SaveButton } from "@/components/mentors/save-button"
import { TimezoneLabel } from "@/components/mentors/timezone-label"
import { Container } from "@/components/site/container"
import { offerTypeLabels } from "@/lib/categories"
import { availabilityLabel, getLocation, getMentor, getMentors, getRating, getReviews } from "@/lib/data"
import { formatMonthYear } from "@/lib/format"
import { getStartingPrice } from "@/lib/offers"
import type { Mentor, MentorLinkKind } from "@/lib/types"
import { cn } from "@/lib/utils"

const linkLabels: Record<MentorLinkKind, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  website: "Website",
  portfolio: "Portfolio",
  publications: "Publications",
}

export function generateStaticParams() {
  return getMentors().map((mentor) => ({ slug: mentor.slug }))
}

export async function generateMetadata({ params }: PageProps<"/mentors/[slug]">): Promise<Metadata> {
  const mentor = getMentor((await params).slug)
  return mentor ? { title: `${mentor.name}, ${mentor.role}` } : {}
}

export default function MentorProfilePage({ params }: PageProps<"/mentors/[slug]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <MentorProfile params={params} />
    </Suspense>
  )
}

async function MentorProfile({ params }: Pick<PageProps<"/mentors/[slug]">, "params">) {
  const mentor = getMentor((await params).slug)
  if (!mentor) notFound()

  const firstName = mentor.name.split(" ")[0]
  const startingPrice = getStartingPrice(mentor)

  return (
    <>
      <Container className="pt-6 pb-16 sm:pt-8 sm:pb-24">
        <MentorsBackLink />

        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
          <ProfileHeader mentor={mentor} className="lg:col-span-3" />

          <aside className="lg:col-span-2 lg:col-start-4 lg:row-span-2 lg:row-start-1">
            <div className="lg:sticky lg:top-24">
              <OfferPanel mentor={mentor} />
            </div>
          </aside>

          <div className="space-y-12 lg:col-span-3">
            <section aria-labelledby="about">
              <h2 id="about" className="text-subheading">About</h2>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-foreground/80">{mentor.bio}</p>
              {mentor.highlights.length > 0 && (
                <ul className="mt-5 space-y-2.5">
                  {mentor.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2.5 text-sm">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <AtAGlance mentor={mentor} />

            {mentor.skills.length > 0 && (
              <section aria-labelledby="expertise">
                <h2 id="expertise" className="text-subheading">Expertise</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {mentor.skills.map((skill) => (
                    <li key={skill} className="rounded-lg bg-muted px-3 py-1.5 text-sm">
                      {skill}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Verification mentor={mentor} />
            <Reviews mentor={mentor} />
          </div>
        </div>
      </Container>

      {startingPrice !== null && <MobileBookBar price={startingPrice} firstName={firstName} />}
    </>
  )
}

function verificationSummary(mentor: Mentor) {
  const { identity, experience } = mentor.verification
  if (identity && experience) return "ID and experience verified"
  if (identity) return "ID verified"
  if (experience) return "Experience verified"
  return "Not verified yet"
}

function ProfileHeader({ mentor, className }: { mentor: Mentor; className?: string }) {
  const rating = getRating(mentor.slug)
  const verified = mentor.verification.identity || mentor.verification.experience
  const VerifiedIcon = verified ? ShieldCheckIcon : ShieldIcon

  return (
    <header className={cn("flex gap-5 sm:gap-8", className)}>
      <div className="relative aspect-4/5 w-28 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-card sm:w-48 sm:rounded-3xl lg:w-56">
        <MentorPhoto src={mentor.photo} name={mentor.name} alt={`Portrait of ${mentor.name}`} priority sizes="(min-width: 1024px) 224px, (min-width: 640px) 192px, 112px" />
      </div>
      <div className="min-w-0 flex-1 sm:pt-2">
        <h1 className="text-title">{mentor.name}</h1>
        <p className="mt-1 sm:text-lg">{mentor.role}</p>
        <p className="text-sm text-muted-foreground sm:text-base">{mentor.organization}</p>

        <ul className="mt-4 space-y-1.5 text-sm">
          <li className="flex items-center gap-1.5 text-muted-foreground">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            {getLocation(mentor)}
          </li>
          <li>
            <a href="#verification" className={cn("inline-flex items-center gap-1.5 rounded-sm focus-ring hover:underline", verified ? "text-success" : "text-muted-foreground")}>
              <VerifiedIcon className="size-4 shrink-0" aria-hidden="true" />
              {verificationSummary(mentor)}
            </a>
          </li>
          {rating && (
            <li>
              <a href="#reviews" className="inline-flex items-center gap-1.5 rounded-sm focus-ring hover:underline">
                <StarIcon className="size-4 shrink-0 fill-rating text-rating" aria-hidden="true" />
                <span className="font-medium">{rating.average.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  · {rating.count} {rating.count === 1 ? "review" : "reviews"}
                </span>
              </a>
            </li>
          )}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <SaveButton slug={mentor.slug} name={mentor.name} variant="outline" />
          {mentor.links?.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1 rounded-sm text-sm font-medium focus-ring hover:underline"
            >
              {linkLabels[link.kind]}
              <ArrowUpRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
        </div>
      </div>
    </header>
  )
}

function AtAGlance({ mentor }: { mentor: Mentor }) {
  const rows = [
    { label: "Experience", value: mentor.experience },
    { label: "Education", value: mentor.education },
    { label: "Languages", value: mentor.languages.join(", ") },
    { label: "Timezone", value: <TimezoneLabel timeZone={mentor.timezone} /> },
    {
      label: "Usually free",
      value: mentor.availability.days.length > 0 ? `${availabilityLabel(mentor)}, Dhaka time` : "No open times right now",
    },
  ].filter((row) => row.value)

  return (
    <section aria-labelledby="glance">
      <h2 id="glance" className="text-subheading">At a glance</h2>
      <dl className="mt-3 divide-y border-y text-sm">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 gap-4 py-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="col-span-2">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Verification({ mentor }: { mentor: Mentor }) {
  const checks = [
    {
      done: mentor.verification.identity,
      title: mentor.verification.identity ? "Identity verified" : "Identity not verified yet",
      detail: mentor.verification.identity ? "A government-issued ID was checked by our team." : "We haven't confirmed this mentor's ID yet.",
    },
    {
      done: mentor.verification.experience,
      title: mentor.verification.experience ? "Experience verified" : "Experience not verified yet",
      detail: mentor.verification.experience
        ? "The role and education shown were confirmed with documents."
        : "The role and education shown are as stated by the mentor.",
    },
  ]

  return (
    <section aria-labelledby="verification">
      <h2 id="verification" className="scroll-mt-24 text-subheading">Verification</h2>
      <ul className="mt-4 grid gap-5 sm:grid-cols-2">
        {checks.map((check) => (
          <li key={check.title} className="flex gap-3">
            {check.done ? (
              <ShieldCheckIcon className="size-5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <ClockIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-medium">{check.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Verification confirms who a mentor is and what they&apos;ve done. It isn&apos;t a rating of their mentoring; reviews from completed sessions are.
      </p>
    </section>
  )
}

function Reviews({ mentor }: { mentor: Mentor }) {
  const reviews = getReviews(mentor.slug)
  const rating = getRating(mentor.slug)
  const firstName = mentor.name.split(" ")[0]

  return (
    <section aria-labelledby="reviews">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="reviews" className="scroll-mt-24 text-subheading">Reviews</h2>
        {rating && (
          <p className="flex items-center gap-1.5 text-sm">
            <StarIcon className="size-4 fill-rating text-rating" aria-hidden="true" />
            <span className="font-semibold">{rating.average.toFixed(1)}</span>
            <span className="text-muted-foreground">
              · {rating.count} {rating.count === 1 ? "review" : "reviews"}
            </span>
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
        <ul className="mt-2 divide-y">
          {reviews.map((review) => (
            <li key={review.id} className="py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <MentorAvatar name={review.author} className="size-9" />
                  <div>
                    <p className="text-sm font-medium">{review.author}</p>
                    <p className="text-xs text-muted-foreground">{review.authorRole}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="flex justify-end gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
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
      )}
    </section>
  )
}
