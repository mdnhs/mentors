import {
  BrainCircuitIcon,
  Code2Icon,
  FlaskConicalIcon,
  GraduationCapIcon,
  MessagesSquareIcon,
  PlaneIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react"

import type { CategoryId, OfferType, Track } from "@/lib/types"

export type Category = {
  id: CategoryId
  label: string
  track: Track
  icon: LucideIcon
}

export const categories: Category[] = [
  {
    id: "software-engineering",
    label: "Software Engineering",
    track: "tech",
    icon: Code2Icon,
  },
  {
    id: "ai-ml",
    label: "AI & Machine Learning",
    track: "tech",
    icon: BrainCircuitIcon,
  },
  {
    id: "interview-prep",
    label: "Interview Preparation",
    track: "tech",
    icon: MessagesSquareIcon,
  },
  {
    id: "career-growth",
    label: "Career Growth",
    track: "tech",
    icon: TrendingUpIcon,
  },
  {
    id: "study-abroad",
    label: "Study Abroad",
    track: "education",
    icon: PlaneIcon,
  },
  {
    id: "scholarships",
    label: "Scholarships & Funding",
    track: "education",
    icon: GraduationCapIcon,
  },
  {
    id: "phd-research",
    label: "PhD & Research",
    track: "education",
    icon: FlaskConicalIcon,
  },
]

export const tracks: { id: Track; label: string }[] = [
  { id: "tech", label: "Tech career" },
  { id: "education", label: "Higher education" },
]

export function getCategory(id: CategoryId) {
  return categories.find((category) => category.id === id)!
}

export const offerTypeLabels: Record<OfferType, string> = {
  "one-on-one": "1:1 session",
  group: "Group session",
  review: "Expert review",
  mentorship: "Ongoing mentorship",
}
