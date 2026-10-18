import { getCategory } from "@/lib/categories"
import { getMentor } from "@/lib/data"
import type { CategoryId, GroupSession } from "@/lib/types"

export function searchSessions(sessions: GroupSession[], query: string, category: CategoryId | "all") {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return sessions.filter((session) => {
    const text = [session.title, session.summary, session.format, session.language, getMentor(session.mentorSlug)?.name, getCategory(session.category).label, ...session.expertise, ...session.agenda]
      .join(" ")
      .toLowerCase()
    return (category === "all" || session.category === category) && terms.every((term) => text.includes(term))
  })
}
