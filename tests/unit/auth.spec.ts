import { expect, test } from "@playwright/test"

import { homeFor, landingFor, safeNext } from "@/lib/auth"
import { commonTimezones, zonePickerOptions } from "@/lib/timezones-list"

test.describe("sign-in redirects", () => {
  test("a next page another role owns falls back to the signed-in role's home", () => {
    expect(landingFor("mentor", "/dashboard")).toBe("/dashboard/mentor")
    expect(landingFor("mentor", "/dashboard/bookings/bk-1001")).toBe("/dashboard/mentor")
    expect(landingFor("learner", "/dashboard/mentor/offers")).toBe("/dashboard")
    expect(landingFor("reviewer", "/dashboard/admin")).toBe("/dashboard/reviewer")
    expect(landingFor("admin", "/dashboard/reviewer/app-s2")).toBe("/dashboard/admin")
  })

  test("a next page the role can open is kept", () => {
    expect(landingFor("learner", "/dashboard/bookings")).toBe("/dashboard/bookings")
    expect(landingFor("mentor", "/dashboard/mentor/earnings?tab=1")).toBe("/dashboard/mentor/earnings?tab=1")
    expect(landingFor("admin", "/dashboard/settings")).toBe("/dashboard/settings")
    expect(landingFor("mentor", "/mentors/tanvir-rahman")).toBe("/mentors/tanvir-rahman")
    expect(landingFor("learner", "/mentors/tanvir-rahman/book?offer=tanvir-mock")).toBe("/mentors/tanvir-rahman/book?offer=tanvir-mock")
    expect(landingFor("reviewer", null)).toBe("/dashboard/reviewer")
    expect(landingFor("learner", "//evil.example.com")).toBe("/dashboard")
  })

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
