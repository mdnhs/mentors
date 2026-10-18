"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { addDays, weekdayOf } from "@/lib/timezone"
import { cn } from "@/lib/utils"

export type DayState = { disabled: boolean; hint: string }

type SlotCalendarProps = {
  selected: string | null
  // First and last date a learner can choose, as YYYY-MM-DD in the learner's timezone.
  min: string
  max: string
  initialFocus: string
  getDay: (dateKey: string) => DayState
  onSelect: (dateKey: string) => void
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })

const utc = (dateKey: string) => new Date(`${dateKey}T00:00:00Z`)
const monthStart = (dateKey: string) => `${dateKey.slice(0, 7)}-01`
const clamp = (dateKey: string, min: string, max: string) => (dateKey < min ? min : dateKey > max ? max : dateKey)

function shiftMonth(dateKey: string, delta: number) {
  const date = utc(dateKey)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + delta, date.getUTCDate())).toISOString().slice(0, 10)
}

export function SlotCalendar({ selected, min, max, initialFocus, getDay, onSelect }: SlotCalendarProps) {
  const [focusKey, setFocusKey] = useState(selected ?? initialFocus)
  const [visible, setVisible] = useState(monthStart(selected ?? initialFocus))
  const grid = useRef<HTMLTableElement>(null)
  const moveFocus = useRef(false)

  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    grid.current?.querySelector<HTMLElement>(`[data-date="${focusKey}"]`)?.focus()
  })

  const goTo = (dateKey: string) => {
    const next = clamp(dateKey, min, max)
    moveFocus.current = true
    setFocusKey(next)
    setVisible(monthStart(next))
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, string> = {
      ArrowLeft: addDays(focusKey, -1),
      ArrowRight: addDays(focusKey, 1),
      ArrowUp: addDays(focusKey, -7),
      ArrowDown: addDays(focusKey, 7),
      Home: addDays(focusKey, -weekdayOf(focusKey)),
      End: addDays(focusKey, 6 - weekdayOf(focusKey)),
      PageUp: shiftMonth(focusKey, -1),
      PageDown: shiftMonth(focusKey, 1),
    }
    const target = moves[event.key]
    if (!target) return
    event.preventDefault()
    goTo(target)
  }

  const offset = weekdayOf(visible)
  const lastDay = new Date(Date.UTC(utc(visible).getUTCFullYear(), utc(visible).getUTCMonth() + 1, 0)).getUTCDate()
  const cells = [...Array<null>(offset).fill(null), ...Array.from({ length: lastDay }, (_, index) => addDays(visible, index))]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7))

  const canGoBack = monthStart(min) < visible
  const canGoForward = monthStart(shiftMonth(visible, 1)) <= max

  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => goTo(clamp(shiftMonth(visible, -1), min, max))}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent focus-ring"
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </button>
        <h3 className="text-sm font-semibold" aria-live="polite" id="calendar-month">
          {monthFormat.format(utc(visible))}
        </h3>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => goTo(clamp(shiftMonth(visible, 1), min, max))}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent focus-ring"
        >
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </button>
      </div>

      <table ref={grid} role="grid" aria-labelledby="calendar-month" onKeyDown={onKeyDown} className="mt-2 w-full table-fixed border-separate border-spacing-y-1">
        <thead>
          <tr>
            {WEEKDAYS.map((name) => (
              <th key={name} scope="col" abbr={name} className="pb-1 text-xs font-medium text-muted-foreground">
                {name.slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, index) => (
            <tr key={index}>
              {week.map((dateKey, column) => {
                if (!dateKey) return <td key={column} />
                const outside = dateKey < min || dateKey > max
                const day = outside ? { disabled: true, hint: "outside the booking window" } : getDay(dateKey)
                const isSelected = dateKey === selected
                return (
                  <td key={dateKey} role="gridcell" aria-selected={isSelected} className="p-0 text-center">
                    <button
                      type="button"
                      data-date={dateKey}
                      tabIndex={dateKey === focusKey ? 0 : -1}
                      aria-disabled={day.disabled || undefined}
                      aria-label={`${dayFormat.format(utc(dateKey))}, ${day.hint}`}
                      onFocus={() => setFocusKey(dateKey)}
                      onClick={() => !day.disabled && onSelect(dateKey)}
                      className={cn(
                        "mx-auto flex size-10 items-center justify-center rounded-full text-sm transition focus-ring sm:size-11",
                        isSelected && "bg-primary font-semibold text-primary-foreground",
                        !isSelected && !day.disabled && "bg-accent/60 font-medium hover:bg-accent",
                        !isSelected && day.disabled && "cursor-not-allowed text-muted-foreground/60"
                      )}
                    >
                      {Number(dateKey.slice(8))}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-3 rounded-full bg-accent" aria-hidden="true" />
        Days with open times
      </p>
    </div>
  )
}
