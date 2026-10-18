"use client"

import { useState } from "react"
import { CircleAlertIcon, CircleCheckIcon, PlusIcon, XIcon } from "lucide-react"

import { SaveBar } from "@/components/mentor/save-bar"
import { useUnsavedGuard } from "@/components/mentor/unsaved-guard"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { PageHeader, Panel } from "@/components/portal/ui"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addDayOff, availabilityDefaults, availabilityEqual, startTimes, validateAvailability, weekdays, type AvailabilityErrors } from "@/lib/availability-settings"
import { formatDate, timezoneLabel } from "@/lib/format"
import { saveAvailability } from "@/lib/store"
import { dateKeyInZone } from "@/lib/timezone"
import type { MentorAvailability } from "@/lib/types"
import { cn } from "@/lib/utils"

// DOM order, so submitting focuses the first invalid control a reader would reach.
const focusOrder: [keyof AvailabilityErrors, string][] = [
  ["days", "avail-day-0"],
  ["times", "avail-time-0"],
  ["bufferMinutes", "avail-buffer"],
  ["minNoticeHours", "avail-notice"],
  ["maxAdvanceDays", "avail-advance"],
  ["unavailableDates", "avail-day-off"],
]

const parseNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN)

export function AvailabilityEditor() {
  const { mentor, actor, now } = useMentorWorkspace()
  const current = mentor.availability
  const [saved, setSaved] = useState<MentorAvailability>(current)
  const [days, setDays] = useState(current.days)
  const [times, setTimes] = useState(current.times)
  const [buffer, setBuffer] = useState(String(current.bufferMinutes ?? availabilityDefaults.bufferMinutes))
  const [notice, setNotice] = useState(String(current.minNoticeHours ?? availabilityDefaults.minNoticeHours))
  const [advance, setAdvance] = useState(String(current.maxAdvanceDays ?? availabilityDefaults.maxAdvanceDays))
  const [blocked, setBlocked] = useState<string[]>(current.unavailableDates ?? [])
  const [dayOff, setDayOff] = useState("")
  const [dayOffError, setDayOffError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const build = (): MentorAvailability => ({
    days,
    times,
    bufferMinutes: parseNumber(buffer),
    minNoticeHours: parseNumber(notice),
    maxAdvanceDays: parseNumber(advance),
    unavailableDates: blocked,
  })
  const errors = validateAvailability(build())
  const dirty = !availabilityEqual(build(), saved)
  useUnsavedGuard(dirty)

  const today = now ? dateKeyInZone(now.getTime(), mentor.timezone) : ""
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  const changed = () => setMessage(null)

  const addBlocked = () => {
    const result = addDayOff(blocked, dayOff, today)
    if (!result.ok) {
      setDayOffError(result.error)
      document.getElementById("avail-day-off")?.focus()
      return
    }
    setBlocked(result.dates)
    setDayOff("")
    setDayOffError(null)
    changed()
  }

  const save = () => {
    const next = build()
    const invalid = validateAvailability(next)
    const first = focusOrder.find(([field]) => invalid[field])
    if (first) {
      setMessage({ tone: "error", text: "Fix the highlighted fields to continue." })
      document.getElementById(first[1])?.focus()
      return
    }
    const result = saveAvailability(actor, next)
    if (result.ok) setSaved(next)
    setMessage(result.ok ? { tone: "ok", text: "Availability saved. Learners see the new times right away." } : { tone: "error", text: result.message ?? "Fix the highlighted fields." })
  }

  const slotsPerDay = times.length
  const weeklySlots = days.length * slotsPerDay

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <PageHeader title="Availability" description={`Times are in ${now ? timezoneLabel(mentor.timezone, now) : mentor.timezone}. Learners see theirs.`} />

      <div className="space-y-6">
        <Panel id="schedule" title="Weekly schedule" action={<span className="text-sm text-muted-foreground tabular-nums">{weeklySlots} slots a week</span>}>
          <fieldset aria-describedby={errors.days ? "avail-days-error" : undefined}>
            <legend className="text-sm font-medium">Days</legend>
            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekdays.map((label, day) => {
                const open = days.includes(day)
                return (
                  <button
                    key={label}
                    id={`avail-day-${day}`}
                    type="button"
                    aria-pressed={open}
                    onClick={() => {
                      setDays(toggle(days, day))
                      changed()
                    }}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors focus-ring sm:h-20",
                      open ? "border-primary/40 bg-accent font-medium text-accent-foreground" : "bg-card text-muted-foreground hover:border-foreground/20"
                    )}
                  >
                    {label}
                    <span aria-hidden="true" className={cn("text-xs tabular-nums", open ? "text-primary" : "text-muted-foreground/70")}>
                      {open ? slotsPerDay : "Off"}
                    </span>
                  </button>
                )
              })}
            </div>
            {errors.days && (
              <p id="avail-days-error" className="mt-1 text-sm text-destructive">
                {errors.days}
              </p>
            )}
          </fieldset>

          <fieldset className="mt-6" aria-describedby={errors.times ? "avail-times-error" : days.length === 0 || times.length === 0 ? "avail-closed-warning" : undefined}>
            <legend className="text-sm font-medium">Start times</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {startTimes.map((time, index) => (
                <button
                  key={time}
                  id={`avail-time-${index}`}
                  type="button"
                  aria-pressed={times.includes(time)}
                  onClick={() => {
                    setTimes(toggle(times, time).sort())
                    changed()
                  }}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-sm tabular-nums transition-colors focus-ring",
                    times.includes(time) ? "border-primary bg-primary font-medium text-primary-foreground" : "bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
            {errors.times && (
              <p id="avail-times-error" className="mt-1 text-sm text-destructive">
                {errors.times}
              </p>
            )}
            {days.length === 0 || times.length === 0 ? (
              <p id="avail-closed-warning" className="mt-3 text-sm text-warning">
                With no days or times open, your calls can&apos;t be booked.
              </p>
            ) : null}
          </fieldset>
        </Panel>

        <Panel id="rules" title="Booking rules">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField id="avail-buffer" label="Buffer between calls (min)" value={buffer} error={errors.bufferMinutes} onChange={(value) => { setBuffer(value); changed() }} />
            <NumberField id="avail-notice" label="Minimum notice (hours)" value={notice} error={errors.minNoticeHours} onChange={(value) => { setNotice(value); changed() }} />
            <NumberField id="avail-advance" label="Book up to (days ahead)" value={advance} error={errors.maxAdvanceDays} onChange={(value) => { setAdvance(value); changed() }} />
          </div>
        </Panel>

        <Panel id="days-off" title="Days off">
          <fieldset>
            <legend className="sr-only">Days off</legend>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="avail-day-off" className="text-xs text-muted-foreground">
                  Add a day off
                </Label>
                <DatePicker
                  id="avail-day-off"
                  min={today || undefined}
                  value={dayOff}
                  aria-invalid={dayOffError || errors.unavailableDates ? true : undefined}
                  aria-describedby={dayOffError || errors.unavailableDates ? "avail-day-off-error" : "avail-day-off-help"}
                  onChange={(value) => {
                    setDayOff(value)
                    setDayOffError(null)
                  }}
                  className="w-52"
                />
              </div>
              <Button type="button" variant="outline" onClick={addBlocked} disabled={!dayOff}>
                <PlusIcon aria-hidden="true" />
                Add
              </Button>
            </div>
            {dayOffError || errors.unavailableDates ? (
              <p id="avail-day-off-error" className="mt-1 text-sm text-destructive">
                {dayOffError ?? errors.unavailableDates}
              </p>
            ) : (
              <p id="avail-day-off-help" className="mt-1 text-xs text-muted-foreground">
                Learners can&apos;t book you on these dates.
              </p>
            )}
            {blocked.length > 0 ? (
              <ul aria-label="Days off" className="mt-4 flex flex-wrap gap-2">
                {blocked.map((date) => (
                  <li key={date} className={cn("inline-flex h-8 items-center gap-1 rounded-full border bg-muted/50 pr-1 pl-3 text-sm tabular-nums", today && date < today && "text-muted-foreground")}>
                    <time dateTime={date}>{formatDate(`${date}T12:00:00Z`, "UTC")}</time>
                    <button
                      type="button"
                      onClick={() => {
                        setBlocked(blocked.filter((item) => item !== date))
                        changed()
                      }}
                      className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
                    >
                      <XIcon className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">Remove {date}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No days off.</p>
            )}
          </fieldset>
        </Panel>

        {message && (
          <Alert variant={message.tone === "error" ? "destructive" : "success"} role={message.tone === "error" ? "alert" : "status"}>
            {message.tone === "error" ? <CircleAlertIcon aria-hidden="true" /> : <CircleCheckIcon aria-hidden="true" />}
            <AlertDescription className="text-current">{message.text}</AlertDescription>
          </Alert>
        )}
      </div>

      <SaveBar dirty={dirty} className="mt-6">
        <Button type="submit">Save availability</Button>
      </SaveBar>
    </form>
  )
}

function NumberField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="numeric" value={value} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => onChange(event.target.value)} />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
