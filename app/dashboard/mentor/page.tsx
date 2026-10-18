import { MentorOverview } from "@/components/mentor/mentor-overview"

// The page sits behind a client-side login gate, so it can't be part of the instant shell.
export const instant = false

export default function MentorDashboardPage() {
  return <MentorOverview />
}
