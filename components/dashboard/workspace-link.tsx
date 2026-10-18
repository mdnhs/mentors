"use client"

import Link from "next/link"

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
    <p className="mt-12 text-sm text-muted-foreground">
      {role === "learner" ? "Want to share what you know?" : workspaces[role].question}{" "}
      <Link href={role === "learner" ? "/become-a-mentor" : homeFor(role)} className="link">
        {role === "learner" ? "Apply to become a mentor" : workspaces[role].label}
      </Link>
    </p>
  )
}
