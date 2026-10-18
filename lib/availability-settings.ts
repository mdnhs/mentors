import { isDateKey } from "@/lib/timezone"
import type { MentorAvailability } from "@/lib/types"

export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

// Hourly start times a mentor can open, in their own timezone.
export const startTimes = Array.from({ length: 17 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`)

export type AvailabilityErrors = Partial<Record<"days" | "times" | "bufferMinutes" | "minNoticeHours" | "maxAdvanceDays" | "unavailableDates", string>>

export const availabilityDefaults = { bufferMinutes: 15, minNoticeHours: 24, maxAdvanceDays: 30 }

const inRange = (value: number | undefined, min: number, max: number) => value === undefined || (Number.isInteger(value) && value >= min && value <= max)

export function validateAvailability(value: MentorAvailability): AvailabilityErrors {
  const errors: AvailabilityErrors = {}
  if (value.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || new Set(value.days).size !== value.days.length) errors.days = "Pick days of the week"
  if (value.times.some((time) => !startTimes.includes(time)) || new Set(value.times).size !== value.times.length) errors.times = "Pick start times from the list"
  if (!inRange(value.bufferMinutes, 0, 60)) errors.bufferMinutes = "Buffer must be 0 to 60 minutes"
  if (!inRange(value.minNoticeHours, 0, 168)) errors.minNoticeHours = "Notice must be 0 to 168 hours"
  if (!inRange(value.maxAdvanceDays, 1, 180)) errors.maxAdvanceDays = "Booking window must be 1 to 180 days"
  if ((value.unavailableDates ?? []).some((date) => !isDateKey(date))) errors.unavailableDates = "Use real dates like 2026-12-25"
  return errors
}

export const hasOpenTimes = (value: MentorAvailability) => value.days.length > 0 && value.times.length > 0
