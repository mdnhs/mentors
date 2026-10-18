import type { Role } from "@/lib/permissions"

export const site = {
  name: "MentorBridge",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description:
    "Book 1:1 sessions, live group sessions and expert reviews with experienced mentors in tech careers and higher education.",
  learner: {
    name: "Rafi Ahmed",
    firstName: "Rafi",
    email: "rafi@example.com",
    photo: "/images/people/learner.jpg",
  },
  social: [
    { label: "Facebook", href: "https://www.facebook.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
    { label: "YouTube", href: "https://www.youtube.com/" },
  ],
} as const

export const nav = [
  { label: "Find Mentors", href: "/mentors" },
  { label: "Tech Career", href: "/mentors?track=tech" },
  { label: "Study Abroad", href: "/mentors?track=education" },
  { label: "Group Sessions", href: "/sessions" },
] as const

export const roleLabels: Record<Role, string> = {
  learner: "Learner",
  mentor: "Mentor",
  reviewer: "Reviewer",
  admin: "Admin",
}
