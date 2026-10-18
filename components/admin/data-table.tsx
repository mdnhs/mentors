"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Chip } from "@/components/filters/chip"
import { SearchInput } from "@/components/filters/search-input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type SortValue = string | number

export type Column<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => SortValue
  className?: string
  align?: "left" | "right"
  // Columns that are secondary hide on narrow screens so the table stays readable.
  secondary?: boolean
}

export type FilterOption<T> = { id: string; label: string; match: (row: T) => boolean }
export type FilterGroup<T> = { id: string; label: string; options: FilterOption<T>[] }

export type DataTableProps<T> = {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  search?: (row: T) => string
  searchPlaceholder?: string
  searchLabel?: string
  filters?: FilterGroup<T>[]
  pageSize?: number
  empty?: ReactNode
  initialSort?: { columnId: string; direction: "asc" | "desc" }
  caption?: string
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  search,
  searchPlaceholder = "Search…",
  searchLabel = "Search records",
  filters = [],
  pageSize = 10,
  empty,
  initialSort,
  caption,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Record<string, string | undefined>>({})
  const [sort, setSort] = useState<{ columnId: string; direction: "asc" | "desc" } | undefined>(initialSort)
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (needle && search && !search(row).toLowerCase().includes(needle)) return false
      return filters.every((group) => {
        const chosen = selected[group.id]
        if (!chosen) return true
        const option = group.options.find((item) => item.id === chosen)
        return option ? option.match(row) : true
      })
    })
  }, [rows, query, search, filters, selected])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const column = columns.find((item) => item.id === sort.columnId)
    if (!column?.sortValue) return filtered
    const factor = sort.direction === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      const left = column.sortValue!(a)
      const right = column.sortValue!(b)
      if (typeof left === "number" && typeof right === "number") return (left - right) * factor
      return String(left).localeCompare(String(right)) * factor
    })
  }, [filtered, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return
    setPage(0)
    setSort((current) =>
      current?.columnId === column.id
        ? { columnId: column.id, direction: current.direction === "asc" ? "desc" : "asc" }
        : { columnId: column.id, direction: "asc" }
    )
  }

  const choose = (groupId: string, optionId: string) => {
    setPage(0)
    setSelected((current) => ({ ...current, [groupId]: current[groupId] === optionId ? undefined : optionId }))
  }

  const activeFilters = filters.filter((group) => selected[group.id])

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {search ? (
          <div className="sm:max-w-xs sm:flex-1">
            <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(0) }} label={searchLabel} placeholder={searchPlaceholder} />
          </div>
        ) : (
          <div />
        )}
        <p className="text-sm text-muted-foreground" role="status">
          {sorted.length === rows.length ? `${rows.length} ${rows.length === 1 ? "record" : "records"}` : `${sorted.length} of ${rows.length} records`}
        </p>
      </div>

      {filters.length > 0 && (
        <div className="scrollbar-none -mx-4 mt-3 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filters">
          {filters.map((group) => (
            <div key={group.id} className="flex shrink-0 items-center gap-2" role="group" aria-label={group.label}>
              <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
              <div className="flex gap-1.5">
                {group.options.map((option) => (
                  <Chip key={option.id} active={selected[group.id] === option.id} onClick={() => choose(group.id, option.id)} className="h-8 px-2.5">
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="surface mt-4 overflow-hidden">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                const isSorted = sort?.columnId === column.id
                const SortIcon = isSorted ? (sort.direction === "asc" ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon
                return (
                  <TableHead
                    key={column.id}
                    className={cn(column.align === "right" && "text-right", column.secondary && "hidden md:table-cell", column.className)}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        aria-label={`Sort by ${column.header}`}
                        className={cn("inline-flex items-center gap-1 rounded-sm focus-ring hover:text-foreground", isSorted && "text-foreground")}
                      >
                        {column.header}
                        <SortIcon className="size-3.5" aria-hidden="true" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length > 0 ? (
              pageRows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.id} className={cn(column.align === "right" && "text-right", column.secondary && "hidden md:table-cell", column.className)}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-12 text-center text-muted-foreground">
                  {empty ?? "No records match these filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {sorted.length > pageSize && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {safePage * pageSize + 1}–{Math.min(sorted.length, safePage * pageSize + pageSize)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} aria-label="Previous page">
              <ChevronLeftIcon aria-hidden="true" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground" aria-live="polite">
              Page {safePage + 1} of {pageCount}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))} disabled={safePage >= pageCount - 1} aria-label="Next page">
              Next
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {activeFilters.map((group) => (
            <button key={group.id} type="button" onClick={() => setSelected((current) => ({ ...current, [group.id]: undefined }))} className="rounded-md border bg-card px-2 py-0.5 text-xs text-muted-foreground focus-ring hover:text-foreground">
              Clear {group.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
