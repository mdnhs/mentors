"use client"

import { useMemo, useState } from "react"
import { CalendarDaysIcon, InfoIcon } from "lucide-react"

import { SlotCalendar, type DayState } from "@/components/booking/slot-calendar"
import { FilterSelect } from "@/components/filters/filter-select"
import {
  bookingRules,
  getBusyIntervals,
  getLearnerIntervals,
  getSlots,
  slotReasonMessage,
  slotsByDay,
  type SlotReason,
} from "@/lib/availability"
import { DHAKA_TZ, formatDate, formatTime, timezoneLabel } from "@/lib/format"
import { DAY_MS, dateKeyInZone } from "@/lib/timezone"
import type { Booking, Mentor } from "@/lib/types"
import { cn } from "@/lib/utils"

const reasonLabels: Record<SlotReason, string> = {
  past: "Passed",
  "too-soon": "Too soon",
  booked: "Booked",
  conflict: "Your session",
}

const noBookings: Booking[] = []

type SchedulePickerProps = {
  mentor: Mentor
  durationMinutes: number
  bookings: Booking[]
  otherBookings?: Booking[]
  now: Date
  ignoreBookingId?: string
  timezone: string
  onTimezone: (timezone: string) => void
  value: string | null
  onChange: (startsAt: string | null) => void
}

export function SchedulePicker({ mentor, durationMinutes, bookings, otherBookings = noBookings, now, ignoreBookingId, timezone, onTimezone, value, onChange }: SchedulePickerProps) {
  const [pickedDay, setPickedDay] = useState<string | null>(null)
  const firstName = mentor.name.split(" ")[0]

  const slots = useMemo(
    () =>
      getSlots(
        mentor,
        durationMinutes,
        getBusyIntervals(mentor, [...bookings, ...otherBookings], now, ignoreBookingId),
        now,
        getLearnerIntervals(bookings, now, ignoreBookingId)
      ),
    [mentor, durationMinutes, bookings, otherBookings, now, ignoreBookingId]
  )
  const byDay = useMemo(() => slotsByDay(slots, timezone), [slots, timezone])

  const day = pickedDay ?? (value ? dateKeyInZone(new Date(value).getTime(), timezone) : null)
  const min = dateKeyInZone(now.getTime(), timezone)
  const max = dateKeyInZone(now.getTime() + bookingRules(mentor).maxAdvanceDays * DAY_MS, timezone)
  const firstOpen = [...byDay.entries()].find(([, list]) => list.some((slot) => slot.available))?.[0]

  const getDay = (dateKey: string): DayState => {
    const list = byDay.get(dateKey)
    if (!list) return { disabled: true, hint: `${firstName} isn't available` }
    const open = list.filter((slot) => slot.available).length
    return open > 0 ? { disabled: false, hint: `${open} ${open === 1 ? "time" : "times"} open` } : { disabled: false, full: true, hint: "fully booked" }
  }

  const reference = new Date(value ?? firstOpen ?? now)
  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timezones = [...new Set([deviceTz, DHAKA_TZ, mentor.timezone])].map((zone) => ({
    value: zone,
    label: timezoneLabel(zone, reference),
  }))

  const daySlots = day ? (byDay.get(day) ?? []) : []
  const blocked = [...new Set(daySlots.filter((slot) => !slot.available).map((slot) => slot.reason!))]
  const end = value ? new Date(new Date(value).getTime() + durationMinutes * 60_000) : null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 tabIndex={-1} className="text-subheading outline-none">
          Pick a date
        </h2>
        <FilterSelect
          label="Your timezone"
          value={timezone}
          options={timezones}
          onChange={(next) => {
            onTimezone(next)
            setPickedDay(null)
          }}
          className="min-w-52"
        />
      </div>

      {slots.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
          {firstName} has no open times in the next {bookingRules(mentor).maxAdvanceDays} days.
        </p>
      ) : (
        <div className="mt-4">
          <SlotCalendar
            selected={day}
            min={min}
            max={max}
            initialFocus={firstOpen ?? min}
            getDay={getDay}
            onSelect={(dateKey) => {
              setPickedDay(dateKey)
              if (value && dateKeyInZone(new Date(value).getTime(), timezone) !== dateKey) onChange(null)
            }}
          />
        </div>
      )}

      <h2 className="mt-8 text-subheading">Pick a time</h2>
      {day && daySlots.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label={`Times on ${formatDate(daySlots[0].startsAt, timezone)}`}>
            {daySlots.map((slot) => {
              const selected = slot.startsAt === value
              const reason = slot.reason
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  data-start={slot.startsAt}
                  aria-pressed={selected}
                  disabled={!slot.available}
                  aria-label={reason ? `${formatTime(slot.startsAt, timezone)}, ${reasonLabels[reason].toLowerCase()}` : undefined}
                  onClick={() => onChange(slot.startsAt)}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center rounded-xl border text-sm font-medium transition focus-ring",
                    selected && "border-primary bg-primary text-primary-foreground",
                    !selected && slot.available && "bg-card hover:border-foreground/30",
                    !slot.available && "cursor-not-allowed bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span className={cn(!slot.available && "line-through")}>{formatTime(slot.startsAt, timezone)}</span>
                  {reason && <span className="text-xs font-normal">{reasonLabels[reason]}</span>}
                </button>
              )
            })}
          </div>
          {blocked.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{blocked.map((reason) => slotReasonMessage(reason, mentor)).join(" ")}</span>
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          <CalendarDaysIcon className="size-4 shrink-0" aria-hidden="true" />
          {day ? `No times on this day in your timezone.` : "Choose a date to see available times."}
        </p>
      )}

      {value && end && (
        <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
          {formatDate(value, timezone)}, {formatTime(value, timezone)} – {formatTime(end, timezone)}
          {mentor.timezone !== timezone &&
            ` · ${formatTime(value, mentor.timezone)} for ${firstName} in ${mentor.city}`}
        </p>
      )}
    </div>
  )
}
