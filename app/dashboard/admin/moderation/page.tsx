import type { Metadata } from "next"

import { MentorModeration } from "@/components/admin/mentor-moderation"

export const metadata: Metadata = {
  title: "Mentors & offers",
}

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function AdminModerationPage() {
  return <MentorModeration />
}
