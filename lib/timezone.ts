const MINUTE = 60_000
export const DAY_MS = 24 * 60 * MINUTE

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string) {
  let cached = formatters.get(timeZone)
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
    formatters.set(timeZone, cached)
  }
  return cached
}

export function isTimeZone(timeZone: string) {
  try {
    formatter(timeZone)
    return true
  } catch {
    return false
  }
}

function zonedParts(ms: number, timeZone: string) {
  const values: Record<string, number> = {}
  for (const part of formatter(timeZone).formatToParts(ms)) {
    if (part.type !== "literal") values[part.type] = Number(part.value)
  }
  return values
}

// Offset of the zone from UTC at an instant, so it already reflects daylight saving.
export function offsetMs(ms: number, timeZone: string) {
  const p = zonedParts(ms, timeZone)
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second)
  return local - Math.floor(ms / 1000) * 1000
}

const pad = (value: number) => String(value).padStart(2, "0")

export function dateKeyInZone(ms: number, timeZone: string) {
  const p = zonedParts(ms, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function timeKeyInZone(ms: number, timeZone: string) {
  const p = zonedParts(ms, timeZone)
  return `${pad(p.hour % 24)}:${pad(p.minute)}`
}

export function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function weekdayOf(dateKey: string) {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay()
}

// The instant a wall-clock time happens in a zone. Returns null when daylight saving skips that time,
// and the earlier instant when it happens twice.
export function zonedTimeToUtc(dateKey: string, time: string, timeZone: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  const [hour, minute] = time.split(":").map(Number)
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const offsets = new Set([offsetMs(guess - DAY_MS, timeZone), offsetMs(guess + DAY_MS, timeZone)])
  const matches = [...offsets].map((offset) => guess - offset).filter((instant) => offsetMs(instant, timeZone) === guess - instant)
  return matches.length > 0 ? Math.min(...matches) : null
}
