import { DHAKA_TZ } from "@/lib/format"

function dhakaDate(now: Date) {
  const values: Record<string, number> = {}
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: DHAKA_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now)) {
    values[part.type] = Number(part.value)
  }
  return { year: values.year, month: values.month, day: values.day }
}

// Returns YYYY-MM-DD dates (Dhaka calendar) from tomorrow onward that fall on the mentor's available weekdays.
export function upcomingDays(availableDays: number[], range = 14, now = new Date()) {
  const { year, month, day } = dhakaDate(now)
  const result: string[] = []
  for (let offset = 1; offset <= range; offset++) {
    const date = new Date(Date.UTC(year, month - 1, day + offset))
    if (availableDays.includes(date.getUTCDay())) result.push(date.toISOString().slice(0, 10))
  }
  return result
}

export function slotIso(day: string, time: string) {
  return `${day}T${time}:00+06:00`
}

export function daysFromNow(days: number, now = new Date()) {
  const { year, month, day } = dhakaDate(now)
  return `${new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)}T12:00:00+06:00`
}
