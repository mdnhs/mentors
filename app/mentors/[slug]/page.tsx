import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ArrowUpRightIcon, CheckIcon, MapPinIcon, ShieldCheckIcon, ShieldIcon, StarIcon } from "lucide-react"

import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { MentorReviews } from "@/components/mentors/mentor-reviews"
import { MentorsBackLink } from "@/components/mentors/mentors-back-link"
import { VerificationList } from "@/components/mentors/verification-list"
import { MobileBookBar } from "@/components/mentors/mobile-book-bar"
import { OfferPanel } from "@/components/mentors/offer-panel"
import { ProfileSkeleton } from "@/components/mentors/profile-skeleton"
import { SaveButton } from "@/components/mentors/save-button"
import { ShareButton } from "@/components/mentors/share-button"
import { TimezoneLabel } from "@/components/mentors/timezone-label"
import { Container } from "@/components/site/container"
import { availabilityLabel, getLocation, getMentor, getMentors, getRating, getReviews } from "@/lib/data"
import { site } from "@/lib/site"
import { hasAnyCheck, verificationSummary } from "@/lib/verification"
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

function summarize(text: string, max = 160) {
  if (text.length <= max) return text
  return `${text.slice(0, text.lastIndexOf(" ", max - 1))}…`
}

export async function generateMetadata({ params }: PageProps<"/mentors/[slug]">): Promise<Metadata> {
  const mentor = getMentor((await params).slug)
  if (!mentor) return {}

  const title = `${mentor.name}, ${mentor.role}`
  const description = summarize(mentor.bio)
  const url = `/mentors/${mentor.slug}`
  const images = mentor.photo ? [{ url: mentor.photo, alt: `Portrait of ${mentor.name}` }] : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "profile", siteName: site.name, url, title, description, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description, images },
  }
}

// schema.org only allows aggregateRating on things like services, not people, so the rating sits on the mentoring service.
function MentorJsonLd({ mentor }: { mentor: Mentor }) {
  const rating = getRating(mentor.slug)
  const url = new URL(`/mentors/${mentor.slug}`, site.url).toString()
  const person = {
    "@type": "Person",
    "@id": `${url}#person`,
    name: mentor.name,
    jobTitle: mentor.role,
    worksFor: { "@type": "Organization", name: mentor.organization },
    description: mentor.bio,
    url,
    image: mentor.photo ? new URL(mentor.photo, site.url).toString() : undefined,
    address: { "@type": "PostalAddress", addressLocality: mentor.city, addressCountry: mentor.country },
    knowsAbout: mentor.skills,
    knowsLanguage: mentor.languages,
    sameAs: mentor.links?.map((link) => link.url),
  }
  const service = rating && {
    "@type": "Service",
    name: `Mentoring with ${mentor.name}`,
    provider: { "@id": person["@id"] },
    aggregateRating: { "@type": "AggregateRating", ratingValue: rating.average, reviewCount: rating.count, bestRating: 5, worstRating: 1 },
  }
  const jsonLd = { "@context": "https://schema.org", "@graph": service ? [person, service] : [person] }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
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

  return (
    <>
      <MentorJsonLd mentor={mentor} />
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

            <VerificationList verification={mentor.verification} />
            <MentorReviews reviews={getReviews(mentor.slug)} rating={getRating(mentor.slug)} firstName={firstName} />
          </div>
        </div>
      </Container>

      <MobileBookBar slug={mentor.slug} firstName={firstName} />
    </>
  )
}

function ProfileHeader({ mentor, className }: { mentor: Mentor; className?: string }) {
  const rating = getRating(mentor.slug)
  const verified = hasAnyCheck(mentor.verification)
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
              {verificationSummary(mentor.verification)}
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
          <ShareButton title={`${mentor.name}, ${mentor.role}`} text={`Book a session with ${mentor.name} on ${site.name}`} />
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
      value: mentor.availability.days.length > 0 ? `${availabilityLabel(mentor)}, mentor local time` : "No open times right now",
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
