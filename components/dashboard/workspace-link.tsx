"use client"

import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { homeFor, useAuth } from "@/lib/auth"

const workspaces = {
  mentor: { question: "Mentoring today?", label: "Open the mentor dashboard" },
  reviewer: { question: "Reviewing applications?", label: "Open the review queue" },
  admin: { question: "Running the marketplace?", label: "Open the admin workspace" },
} as const

// Only points at a workspace the signed-in role can open; learners are invited to apply instead.
export function WorkspaceLink() {
  const auth = useAuth()
  if (auth.status !== "signed-in") return null
  const { role } = auth.session

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-6 text-sm text-muted-foreground">
      {role === "learner" ? "Want to share what you know?" : workspaces[role].question}
      <Link href={role === "learner" ? "/become-a-mentor" : homeFor(role)} className="inline-flex items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-ring">
        {role === "learner" ? "Apply to become a mentor" : workspaces[role].label}
        <ArrowRightIcon className="size-3.5" aria-hidden="true" />
      </Link>
    </p>
  )
}
