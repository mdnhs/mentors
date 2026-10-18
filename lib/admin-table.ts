export type SortDirection = "asc" | "desc"
export type SortState = { columnId: string; direction: SortDirection }

export function parseSort(value: string | null, columnIds: readonly string[]): SortState | undefined {
  if (!value) return undefined
  const [columnId, direction] = value.split(":")
  if (!columnIds.includes(columnId) || (direction !== "asc" && direction !== "desc")) return undefined
  return { columnId, direction }
}

export const formatSort = (sort: SortState) => `${sort.columnId}:${sort.direction}`

export function parsePage(value: string | null) {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page - 1 : 0
}

// Page indexes to show as buttons, with null marking a gap: 0 … 4 5 6 … 11.
export function pageWindow(current: number, count: number, radius = 1): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index)
  const pages: (number | null)[] = [0]
  const start = Math.max(1, current - radius)
  const end = Math.min(count - 2, current + radius)
  if (start > 1) pages.push(null)
  for (let page = start; page <= end; page++) pages.push(page)
  if (end < count - 2) pages.push(null)
  pages.push(count - 1)
  return pages
}

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value)
  // Leading = + - @ would be run as formulas by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(text) && typeof value !== "number" ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv<T>(columns: { header: string; value: (row: T) => string | number | null | undefined }[], rows: T[]) {
  const lines = [columns.map((column) => csvCell(column.header)).join(",")]
  for (const row of rows) lines.push(columns.map((column) => csvCell(column.value(row))).join(","))
  return lines.join("\r\n")
}

// A namespaced query key, so two tables on one page keep separate state.
export const paramKey = (namespace: string | undefined, name: string) => (namespace ? `${namespace}.${name}` : name)

// Browser only. Next.js syncs replaceState with useSearchParams without a navigation or a history entry.
export function replaceSearchParams(changes: Record<string, string | undefined>) {
  const next = new URLSearchParams(window.location.search)
  for (const [name, value] of Object.entries(changes)) {
    if (value) next.set(name, value)
    else next.delete(name)
  }
  const qs = next.toString()
  window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
}
