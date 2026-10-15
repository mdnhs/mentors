"use client"

import { timezoneLabel } from "@/lib/format"

// The UTC offset depends on today's date (daylight saving), so it's worked out in the browser.
export function TimezoneLabel({ timeZone }: { timeZone: string }) {
  return timezoneLabel(timeZone, new Date())
}
