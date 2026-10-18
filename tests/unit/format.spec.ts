import { expect, test } from "@playwright/test"

import { timezoneCity, timezoneLabel, timezoneOffset } from "@/lib/format"

test.describe("timezone labels", () => {
  test("city names keep every word", () => {
    expect(timezoneCity("Asia/Dhaka")).toBe("Dhaka")
    expect(timezoneCity("America/New_York")).toBe("New York")
    expect(timezoneCity("America/Argentina/Buenos_Aires")).toBe("Buenos Aires")
  })

  test("offsets follow daylight saving", () => {
    expect(timezoneOffset("Asia/Dhaka", "2026-10-20T08:00:00Z")).toBe("GMT+6")
    expect(timezoneOffset("Europe/Berlin", "2026-10-23T08:00:00Z")).toBe("GMT+2")
    expect(timezoneOffset("Europe/Berlin", "2026-10-26T08:00:00Z")).toBe("GMT+1")
    expect(timezoneLabel("America/New_York", "2026-10-20T08:00:00Z")).toBe("New York (GMT-4)")
  })
})
