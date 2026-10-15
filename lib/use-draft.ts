"use client"

import { useEffect, useState } from "react"

// Local text that commits after a pause, and resets when the committed value changes elsewhere (e.g. "Clear all").
export function useDraft(value: string, commit: (draft: string) => void, delay = 300, normalize = (text: string) => text.trim()) {
  const [draft, setDraft] = useState(value)
  const [synced, setSynced] = useState(value)

  if (normalize(value) !== normalize(synced)) {
    setSynced(value)
    setDraft(value)
  }

  const pending = normalize(draft) !== normalize(synced)

  const flush = () => {
    if (!pending) return
    setSynced(draft)
    commit(draft)
  }

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => {
      setSynced(draft)
      commit(draft)
    }, delay)
    return () => clearTimeout(timer)
  }, [pending, draft, commit, delay])

  return [draft, setDraft, flush] as const
}
