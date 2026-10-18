import { downloadBlob } from "@/lib/download"

export type CalendarEvent = {
  uid: string
  start: string | Date
  durationMinutes: number
  title: string
  description?: string
  location?: string
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

function range(event: CalendarEvent) {
  const start = new Date(event.start)
  const end = new Date(start.getTime() + event.durationMinutes * 60_000)
  return { start: stamp(start), end: stamp(end) }
}

const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

// RFC 5545 caps content lines at 75 octets; continuation lines start with a space.
function fold(line: string) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let current = ""
  let size = 0
  for (const char of line) {
    const length = new TextEncoder().encode(char).length
    if (size + length > (parts.length === 0 ? 75 : 74)) {
      parts.push(current)
      current = ""
      size = 0
    }
    current += char
    size += length
  }
  parts.push(current)
  return parts.join("\r\n ")
}

export function icsContent(event: CalendarEvent, now = new Date()) {
  const { start, end } = range(event)
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MentorBridge//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}@mentorbridge`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null)
  return `${lines.map(fold).join("\r\n")}\r\n`
}

export function googleCalendarUrl(event: CalendarEvent) {
  const { start, end } = range(event)
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${start}/${end}` })
  if (event.description) params.set("details", event.description)
  if (event.location) params.set("location", event.location)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function downloadIcs(event: CalendarEvent, filename = "session.ics") {
  downloadBlob(new Blob([icsContent(event)], { type: "text/calendar;charset=utf-8" }), filename)
}
