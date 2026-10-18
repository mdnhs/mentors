import { expect, test } from "@playwright/test"

import type { AdminAuditEvent } from "@/lib/admin"
import { auditActors, filterAudit } from "@/lib/admin-selectors"
import { formatSort, pageWindow, paramKey, parsePage, parseSort, toCsv } from "@/lib/admin-table"

test.describe("table URL state", () => {
  test("sort round-trips and ignores unknown columns or directions", () => {
    expect(parseSort(formatSort({ columnId: "when", direction: "desc" }), ["when"])).toEqual({ columnId: "when", direction: "desc" })
    expect(parseSort("nope:asc", ["when"])).toBeUndefined()
    expect(parseSort("when:sideways", ["when"])).toBeUndefined()
    expect(parseSort(null, ["when"])).toBeUndefined()
  })

  test("pages are 1-based in the URL and fall back to the first page", () => {
    expect(parsePage("3")).toBe(2)
    expect(parsePage("0")).toBe(0)
    expect(parsePage("x")).toBe(0)
    expect(parsePage(null)).toBe(0)
  })

  test("params are namespaced only when a key is given", () => {
    expect(paramKey(undefined, "q")).toBe("q")
    expect(paramKey("refunds", "status")).toBe("refunds.status")
  })
})

test.describe("pagination window", () => {
  test("shows every page when there are few", () => {
    expect(pageWindow(0, 5)).toEqual([0, 1, 2, 3, 4])
  })

  test("collapses distant pages into gaps", () => {
    expect(pageWindow(5, 12)).toEqual([0, null, 4, 5, 6, null, 11])
    expect(pageWindow(0, 12)).toEqual([0, 1, null, 11])
    expect(pageWindow(11, 12)).toEqual([0, null, 10, 11])
  })
})

test.describe("CSV export", () => {
  test("quotes separators and neutralises spreadsheet formulas", () => {
    const csv = toCsv(
      [
        { header: "Name", value: (row: { name: string; total: number }) => row.name },
        { header: "Total", value: (row: { name: string; total: number }) => row.total },
      ],
      [
        { name: 'Rafi, "R"', total: 1500 },
        { name: "=HYPERLINK()", total: -20 },
      ]
    )
    expect(csv.split("\r\n")).toEqual(["Name,Total", '"Rafi, ""R""",1500', "'=HYPERLINK(),-20"])
  })
})

test.describe("audit log filters", () => {
  const event = (id: string, at: string, actor: string): AdminAuditEvent => ({ id, at, actor, action: "ticket-updated", target: id })
  // 2026-10-17T19:30Z is already 18 October in Dhaka (UTC+6).
  const events = [event("a", "2026-10-10T08:00:00Z", "admin@example.com"), event("b", "2026-10-17T19:30:00Z", "ops@example.com"), event("c", "2026-10-20T08:00:00Z", "admin@example.com")]

  test("filters by inclusive Dhaka-time date range and by actor", () => {
    expect(filterAudit(events, { from: "2026-10-18" }).map((item) => item.id)).toEqual(["b", "c"])
    expect(filterAudit(events, { to: "2026-10-17" }).map((item) => item.id)).toEqual(["a"])
    expect(filterAudit(events, { from: "2026-10-10", to: "2026-10-18", actor: "admin@example.com" }).map((item) => item.id)).toEqual(["a"])
    expect(filterAudit(events, {})).toHaveLength(3)
  })

  test("lists each actor once", () => {
    expect(auditActors(events)).toEqual(["admin@example.com", "ops@example.com"])
  })
})
