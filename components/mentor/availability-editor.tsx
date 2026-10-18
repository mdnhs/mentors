"use client"

import { useState } from "react"

import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { availabilityDefaults, startTimes, validateAvailability, weekdays } from "@/lib/availability-settings"
import { timezoneLabel } from "@/lib/format"
import { saveAvailability } from "@/lib/store"
import type { MentorAvailability } from "@/lib/types"
import { cn } from "@/lib/utils"

export function AvailabilityEditor() {
  const { mentor, actor } = useMentorWorkspace()
  const current = mentor.availability
  const [days, setDays] = useState(current.days)
  const [times, setTimes] = useState(current.times)
  const [buffer, setBuffer] = useState(String(current.bufferMinutes ?? availabilityDefaults.bufferMinutes))
  const [notice, setNotice] = useState(String(current.minNoticeHours ?? availabilityDefaults.minNoticeHours))
  const [advance, setAdvance] = useState(String(current.maxAdvanceDays ?? availabilityDefaults.maxAdvanceDays))
  const [blocked, setBlocked] = useState((current.unavailableDates ?? []).join(", "))
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)

  const parseNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN)
  const build = (): MentorAvailability => ({
    days,
    times,
    bufferMinutes: parseNumber(buffer),
    minNoticeHours: parseNumber(notice),
    maxAdvanceDays: parseNumber(advance),
    unavailableDates: blocked.split(/[\s,]+/).filter(Boolean),
  })
  const errors = validateAvailability(build())
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  const dirty = () => setMessage(null)

  const save = () => {
    const result = saveAvailability(actor, build())
    setMessage(result.ok ? { tone: "ok", text: "Availability saved. Learners see the new times right away." } : { tone: "error", text: result.message ?? "Fix the highlighted fields." })
  }

  return (
    <form
      noValidate
      className="mt-6 max-w-2xl space-y-8"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <div>
        <h2 className="text-subheading">Weekly availability</h2>
        <p className="text-sm text-muted-foreground">Times are in your timezone: {timezoneLabel(mentor.timezone, new Date("2026-10-18T00:00:00Z"))}. Learners see them in theirs.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Days</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {weekdays.map((label, day) => (
            <button
              key={label}
              type="button"
              aria-pressed={days.includes(day)}
              onClick={() => { setDays(toggle(days, day)); dirty() }}
              className={cn("h-10 min-w-12 rounded-lg border bg-card px-3 text-sm transition hover:border-foreground/20 focus-ring", days.includes(day) && "border-primary bg-accent/60 font-medium")}
            >
              {label}
            </button>
          ))}
        </div>
        {errors.days && <p className="mt-1 text-sm text-destructive">{errors.days}</p>}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Start times</legend>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {startTimes.map((time) => (
            <button
              key={time}
              type="button"
              aria-pressed={times.includes(time)}
              onClick={() => { setTimes(toggle(times, time).sort()); dirty() }}
              className={cn("h-10 rounded-lg border bg-card text-sm transition hover:border-foreground/20 focus-ring", times.includes(time) && "border-primary bg-accent/60 font-medium")}
            >
              {time}
            </button>
          ))}
        </div>
        {errors.times && <p className="mt-1 text-sm text-destructive">{errors.times}</p>}
        {days.length === 0 || times.length === 0 ? <p className="mt-2 text-sm text-warning">With no days or times open, your calls can&apos;t be booked.</p> : null}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <NumberField id="avail-buffer" label="Buffer between calls (min)" value={buffer} error={errors.bufferMinutes} onChange={(value) => { setBuffer(value); dirty() }} />
        <NumberField id="avail-notice" label="Minimum notice (hours)" value={notice} error={errors.minNoticeHours} onChange={(value) => { setNotice(value); dirty() }} />
        <NumberField id="avail-advance" label="Book up to (days ahead)" value={advance} error={errors.maxAdvanceDays} onChange={(value) => { setAdvance(value); dirty() }} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="avail-blocked">Days off</Label>
        <Input id="avail-blocked" value={blocked} placeholder="2026-12-25, 2026-12-31" onChange={(event) => { setBlocked(event.target.value); dirty() }} aria-invalid={errors.unavailableDates ? true : undefined} />
        {errors.unavailableDates ? <p className="text-sm text-destructive">{errors.unavailableDates}</p> : <p className="text-xs text-muted-foreground">Dates as YYYY-MM-DD, separated by commas.</p>}
      </div>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={cn("rounded-xl p-3 text-sm", message.tone === "error" ? "bg-warning-soft text-warning" : "bg-success-soft text-success")}>
          {message.text}
        </p>
      )}
      <Button type="submit" size="lg" disabled={Object.keys(errors).length > 0}>
        Save availability
      </Button>
    </form>
  )
}

function NumberField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="numeric" value={value} aria-invalid={error ? true : undefined} onChange={(event) => onChange(event.target.value)} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
