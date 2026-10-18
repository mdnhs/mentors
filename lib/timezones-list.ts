import { DHAKA_TZ } from "@/lib/format"

// Where MentorBridge learners and mentors most often are; Dhaka first as the marketplace's home zone.
export const commonTimezones = [
  DHAKA_TZ,
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Toronto",
  "America/Los_Angeles",
  "Australia/Sydney",
] as const

export function zonePickerOptions(extra: string[] = []) {
  return [...new Set([...extra.filter(Boolean), ...commonTimezones])]
}
