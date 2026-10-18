"use client"

import { useState } from "react"
import { CalendarXIcon } from "lucide-react"

import { Chip } from "@/components/filters/chip"
import { SearchInput } from "@/components/filters/search-input"
import { SessionCard } from "@/components/sessions/session-card"
import { EmptyState } from "@/components/site/empty-state"
import { Button } from "@/components/ui/button"
import { categories } from "@/lib/categories"
import { getSessions } from "@/lib/data"
import { searchSessions } from "@/lib/session-search"
import { resolveSession, sessionPhase } from "@/lib/sessions"
import { useAppState, useNow } from "@/lib/store"
import type { CategoryId } from "@/lib/types"

const sessions = getSessions()
const sessionCategories = categories.filter((category) => sessions.some((session) => session.category === category.id))

export function SessionExplorer() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CategoryId | "all">("all")

  const { cancelledSessions, sessionCapacity } = useAppState()
  const now = useNow()
  const [showPast, setShowPast] = useState(false)

  const current = sessions.map((session) => resolveSession(session, { cancelledSessions, sessionCapacity }))
  const visible = current.filter((session) => showPast || !now || sessionPhase(session, now) !== "completed")
  const results = searchSessions(visible, query, category)
  const upcoming = results.filter((session) => !now || sessionPhase(session, now) === "scheduled").length

  return (
    <div className="mt-6">
      <SearchInput value={query} onChange={setQuery} label="Search sessions" placeholder="Topic or mentor" />
      <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Category">
        <Chip active={category === "all"} onClick={() => setCategory("all")}>
          All topics
        </Chip>
        <Chip active={showPast} onClick={() => setShowPast(!showPast)}>
          Show past sessions
        </Chip>
        {sessionCategories.map((item) => (
          <Chip key={item.id} active={category === item.id} onClick={() => setCategory(category === item.id ? "all" : item.id)}>
            <item.icon aria-hidden="true" />
            {item.label}
          </Chip>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground">{upcoming}</span> upcoming {upcoming === 1 ? "session" : "sessions"}
      </p>

      {results.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarXIcon} title="No sessions found" description="Try another topic or clear your search." className="mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setQuery("")
              setCategory("all")
            }}
          >
            Show all sessions
          </Button>
        </EmptyState>
      )}
    </div>
  )
}
