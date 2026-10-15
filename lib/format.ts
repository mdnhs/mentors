export const DHAKA_TZ = "Asia/Dhaka"

const priceFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })

export function formatPrice(amount: number) {
  return `৳${priceFormatter.format(amount)}`
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

function parts(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const result: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {}
  for (const part of new Intl.DateTimeFormat("en-US", { timeZone, ...options }).formatToParts(date)) {
    result[part.type] = part.value
  }
  return result
}

// Assembled from parts so server and browser ICU whitespace differences can't cause hydration mismatches.
export function formatTime(iso: string | Date, timeZone = DHAKA_TZ) {
  const p = parts(new Date(iso), timeZone, { hour: "numeric", minute: "2-digit", hour12: true })
  return `${p.hour}:${p.minute} ${p.dayPeriod}`
}

export function formatDate(iso: string | Date, timeZone = DHAKA_TZ) {
  const p = parts(new Date(iso), timeZone, { weekday: "short", month: "short", day: "numeric" })
  return `${p.weekday}, ${p.month} ${p.day}`
}

export function formatDateParts(iso: string | Date, timeZone = DHAKA_TZ) {
  const p = parts(new Date(iso), timeZone, { weekday: "short", month: "short", day: "numeric" })
  return { weekday: p.weekday ?? "", month: p.month ?? "", day: p.day ?? "" }
}

export function formatMonthYear(iso: string) {
  const p = parts(new Date(iso), DHAKA_TZ, { month: "long", year: "numeric" })
  return `${p.month} ${p.year}`
}

export function timezoneLabel(timeZone: string, at: string | Date) {
  const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone
  const p = parts(new Date(at), timeZone, { timeZoneName: "shortOffset" })
  return `${city} (${p.timeZoneName})`
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
}
