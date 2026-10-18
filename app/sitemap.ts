import type { MetadataRoute } from "next"

import { getListedMentors } from "@/lib/offers"
import { site } from "@/lib/site"

const url = (path: string) => new URL(path, site.url).toString()

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/mentors"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/sessions"), changeFrequency: "daily", priority: 0.8 },
    { url: url("/become-a-mentor"), changeFrequency: "monthly", priority: 0.6 },
    { url: url("/help"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ]
  const mentors: MetadataRoute.Sitemap = getListedMentors().map((mentor) => ({
    url: url(`/mentors/${mentor.slug}`),
    changeFrequency: "weekly",
    priority: 0.7,
    ...(mentor.photo && { images: [url(mentor.photo)] }),
  }))
  return [...pages, ...mentors]
}
