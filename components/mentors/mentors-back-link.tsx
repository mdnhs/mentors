"use client"

import { BackLink } from "@/components/site/back-link"
import { useMentorsHref } from "@/lib/store"

export function MentorsBackLink() {
  return <BackLink href={useMentorsHref()}>All mentors</BackLink>
}
