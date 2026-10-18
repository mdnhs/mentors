import { expect, test } from "@playwright/test"

import { googleCalendarUrl, icsContent, type CalendarEvent } from "@/lib/calendar"

const event: CalendarEvent = {
  uid: "bk-123",
  start: "2026-10-20T08:30:00.000Z",
  durationMinutes: 45,
  title: "ML project review, with Nusrat",
  description: "Booking bk-123\nJoin from My sessions; link appears before the start.",
}

test.describe("calendar export", () => {
  test("builds a valid .ics event in UTC with CRLF line endings", () => {
    const ics = icsContent(event, new Date("2026-10-18T06:00:00Z"))
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true)
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
    expect(ics).toContain("DTSTART:20261020T083000Z")
    expect(ics).toContain("DTEND:20261020T091500Z")
    expect(ics).toContain("DTSTAMP:20261018T060000Z")
    expect(ics).toContain("UID:bk-123@mentorbridge")
    expect(ics).toContain("SUMMARY:ML project review\\, with Nusrat")
    expect(ics).not.toMatch(/[^\r]\n/)
  })

  test("escapes text and folds long lines", () => {
    const ics = icsContent({ ...event, description: "a;b\\c\n".repeat(20) })
    const unfolded = ics.replace(/\r\n /g, "")
    expect(unfolded).toContain("DESCRIPTION:a\\;b\\\\c\\n")
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })

  test("omits optional fields that weren't given", () => {
    const ics = icsContent({ uid: "x", start: event.start, durationMinutes: 30, title: "Call" })
    expect(ics).not.toContain("DESCRIPTION")
    expect(ics).not.toContain("LOCATION")
    expect(ics).toContain("DTEND:20261020T090000Z")
  })

  test("builds a Google Calendar template link", () => {
    const url = new URL(googleCalendarUrl(event))
    expect(url.origin).toBe("https://calendar.google.com")
    expect(url.searchParams.get("action")).toBe("TEMPLATE")
    expect(url.searchParams.get("dates")).toBe("20261020T083000Z/20261020T091500Z")
    expect(url.searchParams.get("text")).toBe(event.title)
    expect(url.searchParams.get("details")).toBe(event.description)
  })
})
