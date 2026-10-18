import Form from "next/form"
import Link from "next/link"
import { SearchIcon } from "lucide-react"

import { MentorAvatar } from "@/components/mentors/mentor-avatar"
import { MentorPhoto } from "@/components/mentors/mentor-photo"
import { Container } from "@/components/site/container"
import { buttonVariants } from "@/components/ui/button"
import { getSessions } from "@/lib/data"
import { formatPrice } from "@/lib/format"
import { pickListedMentors } from "@/lib/mentor-filters"
import { getListedMentors } from "@/lib/offers"
import { cn } from "@/lib/utils"

const captions: Record<string, string> = {
  "nusrat-jahan": "ML Engineer, Dhaka",
  "arif-hossain": "PhD Researcher, Munich",
  "sadia-islam": "Product Designer, Toronto",
}

export function Hero() {
  const mentors = getListedMentors()
  const fromPrice = Math.min(...getSessions().map((session) => session.price))
  const portraits = pickListedMentors(Object.keys(captions), 3)

  return (
    <section>
      <Container className="grid grid-cols-1 items-center gap-10 pt-8 pb-14 sm:pt-14 lg:grid-cols-12 lg:gap-12 lg:pt-16 lg:pb-20">
        <div className="lg:col-span-6">
          <h1 className="max-w-xl text-display">Learn from those who&apos;ve been there.</h1>
          <p lang="bn" className="mt-4 font-bangla text-xl text-foreground/80">
            যাঁরা এই পথ পেরিয়ে এসেছেন, শিখুন তাঁদের কাছ থেকে।
          </p>
          <p className="mt-3 max-w-md text-lg text-muted-foreground">
            1:1 calls, live group sessions and expert reviews, from {formatPrice(fromPrice)}.
          </p>

          <Form
            action="/mentors"
            role="search"
            className="mt-8 flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center sm:rounded-2xl sm:border sm:bg-card sm:p-1.5 sm:shadow-card sm:transition sm:focus-within:border-primary/50 sm:focus-within:ring-3 sm:focus-within:ring-ring/20"
          >
            <div className="flex h-12 flex-1 items-center gap-2 rounded-xl border bg-card px-3 shadow-card transition focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-ring/20 sm:h-11 sm:border-0 sm:bg-transparent sm:px-0 sm:shadow-none sm:focus-within:ring-0">
              <SearchIcon className="size-5 shrink-0 text-muted-foreground sm:ml-3" aria-hidden="true" />
              <input
                name="q"
                type="search"
                aria-label="Search mentors by skill, role or goal"
                placeholder="System design, scholarships, AI…"
                className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button type="submit" className={cn(buttonVariants({ size: "lg" }), "h-12 rounded-xl sm:h-11")}>
              Find a Mentor
            </button>
          </Form>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {mentors.slice(3, 8).map((mentor) => (
                <MentorAvatar key={mentor.slug} name={mentor.name} photo={mentor.photo} className="size-8 ring-2 ring-background" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{mentors.length} mentors in Dhaka, Singapore, Munich, Toronto and more.</p>
          </div>
        </div>

        <div className="grid h-72 grid-cols-5 grid-rows-2 gap-2 sm:h-96 sm:gap-3 lg:col-span-6 lg:h-120" role="group" aria-label="Featured mentor portraits">
          {portraits.map((mentor, index) => (
            <Link
              key={mentor.slug}
              href={`/mentors/${mentor.slug}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl bg-muted focus-ring sm:rounded-3xl",
                index === 0 ? "col-span-3 row-span-2" : "col-span-2"
              )}
            >
              <MentorPhoto
                src={mentor.photo}
                name={mentor.name}
                alt={`${mentor.name}, ${mentor.role}`}
                priority={index === 0}
                sizes={index === 0 ? "(min-width: 1024px) 340px, 60vw" : "(min-width: 1024px) 220px, 40vw"}
                className="transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-2 bottom-2 hidden truncate rounded-lg bg-background/90 px-2.5 py-1.5 text-xs font-medium backdrop-blur sm:block">
                {mentor.name.split(" ")[0]} · {captions[mentor.slug] ?? `${mentor.role}, ${mentor.city}`}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  )
}
