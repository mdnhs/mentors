"use client"

import { useState } from "react"
import { LockIcon, PlusIcon, XIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addActionItem, removeActionItem, setPersonalNote, toggleActionItem, useAppState } from "@/lib/store"
import type { Booking } from "@/lib/types"

export function NotesPanel({ booking }: { booking: Booking }) {
  const { notes } = useAppState()
  const current = notes[booking.id]
  const [draft, setDraft] = useState("")
  const actions = current?.actions ?? []
  const done = actions.filter((item) => item.done).length

  return (
    <div className="space-y-6">
      {current?.summary && (
        <div>
          <h3 className="text-sm font-medium">From your mentor</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{current.summary}</p>
        </div>
      )}

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-medium">Action plan</h3>
          {actions.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {done} of {actions.length} done
            </p>
          )}
        </div>
        {actions.length > 0 && (
          <ul className="mt-2 divide-y rounded-xl border">
            {actions.map((item) => (
              <li key={item.id} className="flex items-center gap-3 p-3">
                <input
                  id={`action-${item.id}`}
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleActionItem(booking.id, item.id)}
                  className="size-4 shrink-0 accent-primary"
                />
                <label htmlFor={`action-${item.id}`} className={item.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm"}>
                  {item.text}
                  {item.by === "you" && <span className="ml-2 text-xs text-muted-foreground">added by you</span>}
                </label>
                {item.by === "you" && (
                  <button
                    type="button"
                    aria-label={`Remove ${item.text}`}
                    onClick={() => removeActionItem(booking.id, item.id)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-ring"
                  >
                    <XIcon className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addActionItem(booking.id, draft)
            setDraft("")
          }}
        >
          <Label htmlFor={`new-action-${booking.id}`} className="sr-only">
            Add a step
          </Label>
          <Input id={`new-action-${booking.id}`} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add your own step" maxLength={140} />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted focus-ring disabled:opacity-50"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            Add
          </button>
        </form>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`personal-${booking.id}`} className="flex items-center gap-1.5">
          Your private notes
          <LockIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </Label>
        <Textarea
          id={`personal-${booking.id}`}
          rows={4}
          value={current?.personal ?? ""}
          onChange={(event) => setPersonalNote(booking.id, event.target.value)}
          placeholder="Questions to ask, things you learned…"
          className="bg-card"
        />
        <p className="text-xs text-muted-foreground">Only you can see these. Mentors never do.</p>
      </div>
    </div>
  )
}
