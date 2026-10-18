import { expect, test } from "@playwright/test"

import { homeFor, safeNext } from "@/lib/auth"
import { commonTimezones, zonePickerOptions } from "@/lib/timezones-list"

test.describe("sign-in redirects", () => {
  test("only same-site paths are followed", () => {
    expect(safeNext("/dashboard/settings", "/dashboard")).toBe("/dashboard/settings")
    expect(safeNext("//evil.example.com", "/dashboard")).toBe("/dashboard")
    expect(safeNext("https://evil.example.com", "/dashboard")).toBe("/dashboard")
    expect(safeNext("/\\evil.example.com", "/dashboard")).toBe("/dashboard")
    expect(safeNext("/\t/evil.example.com", "/dashboard")).toBe("/dashboard")
    expect(safeNext(null, "/dashboard/mentor")).toBe("/dashboard/mentor")
  })

  test("each role has its own home", () => {
    expect(homeFor("learner")).toBe("/dashboard")
    expect(homeFor("mentor")).toBe("/dashboard/mentor")
    expect(homeFor("reviewer")).toBe("/dashboard/reviewer")
    expect(homeFor("admin")).toBe("/dashboard/admin")
  })
})

test.describe("timezone options", () => {
  test("keep extra zones first and never repeat one", () => {
    const options = zonePickerOptions(["Europe/Paris", "Asia/Dhaka", ""])
    expect(options[0]).toBe("Europe/Paris")
    expect(options.filter((zone) => zone === "Asia/Dhaka")).toHaveLength(1)
    expect(options).toEqual(expect.arrayContaining([...commonTimezones]))
  })
})
