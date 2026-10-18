"use client"

import { Suspense, useId, useMemo, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, Columns3Icon, DownloadIcon, XIcon } from "lucide-react"

import { Chip } from "@/components/filters/chip"
import { SearchInput } from "@/components/filters/search-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { downloadBlob } from "@/lib/download"
import { formatSort, pageWindow, paramKey, parsePage, parseSort, replaceSearchParams, toCsv, type SortState } from "@/lib/admin-table"
import { cn } from "@/lib/utils"

export type SortValue = string | number

export type Column<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => SortValue
  // Plain value for CSV export; falls back to sortValue, and columns with neither are left out.
  csv?: (row: T) => string | number | null | undefined
  className?: string
  align?: "left" | "right"
  // Secondary columns collapse into an expandable detail row on narrow screens.
  secondary?: boolean
  hideable?: boolean
}

export type FilterOption<T> = { id: string; label: string; match: (row: T) => boolean }
export type FilterGroup<T> = { id: string; label: string; options: FilterOption<T>[] }
export type ExtraFilter = { id: string; label: string; onClear: () => void }

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
  initialSort?: SortState
  caption?: string
  // Namespaces the URL params, needed when a page shows more than one table.
  urlKey?: string
  loading?: boolean
  selectable?: boolean
  bulkActions?: (selected: T[], clear: () => void) => ReactNode
  exportFilename?: string
  toolbar?: ReactNode
  // Filters kept outside the table (e.g. in the toolbar); a new value sends the table back to page one.
  pageResetKey?: string
  extraFilters?: ExtraFilter[]
}

export function DataTable<T>(props: DataTableProps<T>) {
  // useSearchParams needs a Suspense boundary so a prerendered route can still build.
  return (
    <Suspense fallback={<TableSkeleton columns={Math.min(props.columns.length, 4)} rows={5} />}>
      <DataTableInner {...props} />
    </Suspense>
  )
}

function DataTableInner<T>({
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
  urlKey,
  loading,
  selectable,
  bulkActions,
  exportFilename,
  toolbar,
  pageResetKey,
  extraFilters = [],
}: DataTableProps<T>) {
  const params = useSearchParams()
  const param = (name: string) => params.get(paramKey(urlKey, name))
  const columnIds = columns.map((column) => column.id)
  const id = useId()

  // URL is a mirror of local state, written with replaceState so views are shareable and survive reload.
  const [query, setQuery] = useState(() => param("q") ?? "")
  const [selected, setSelected] = useState<Record<string, string | undefined>>(() =>
    Object.fromEntries(filters.map((group) => [group.id, group.options.some((option) => option.id === param(group.id)) ? param(group.id)! : undefined]))
  )
  const [sort, setSort] = useState<SortState | undefined>(() => parseSort(param("sort"), columnIds) ?? initialSort)
  const [page, setPage] = useState(() => parsePage(param("page")))
  const [lastResetKey, setLastResetKey] = useState(pageResetKey)
  if (pageResetKey !== lastResetKey) {
    setLastResetKey(pageResetKey)
    setPage(0)
  }
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [picked, setPicked] = useState<Set<string>>(() => new Set())
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const writeUrl = (changes: Record<string, string | undefined>) =>
    replaceSearchParams(Object.fromEntries(Object.entries(changes).map(([name, value]) => [paramKey(urlKey, name), value])))

  const goToPage = (next: number) => {
    setPage(next)
    writeUrl({ page: next > 0 ? String(next + 1) : undefined })
  }

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

  const visible = columns.filter((column) => !hidden.has(column.id))
  const secondary = visible.filter((column) => column.secondary)
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const pickedRows = sorted.filter((row) => picked.has(rowKey(row)))
  const allOnPage = pageRows.length > 0 && pageRows.every((row) => picked.has(rowKey(row)))
  const someOnPage = pageRows.some((row) => picked.has(rowKey(row)))
  const totalColumns = visible.length + (selectable ? 1 : 0) + (secondary.length > 0 ? 1 : 0)

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return
    const next: SortState =
      sort?.columnId === column.id ? { columnId: column.id, direction: sort.direction === "asc" ? "desc" : "asc" } : { columnId: column.id, direction: "asc" }
    setSort(next)
    setPage(0)
    writeUrl({ sort: formatSort(next), page: undefined })
  }

  const choose = (groupId: string, optionId: string | undefined) => {
    const value = optionId && selected[groupId] !== optionId ? optionId : undefined
    setSelected((current) => ({ ...current, [groupId]: value }))
    setPage(0)
    writeUrl({ [groupId]: value, page: undefined })
  }

  const changeQuery = (value: string) => {
    setQuery(value)
    setPage(0)
    writeUrl({ q: value.trim() || undefined, page: undefined })
  }

  const toggleSet = (set: Set<string>, key: string) => {
    const next = new Set(set)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  }

  const exportCsv = () => {
    const exportable = visible
      .filter((column) => column.csv || column.sortValue)
      .map((column) => ({ header: column.header, value: (row: T) => (column.csv ? column.csv(row) : column.sortValue!(row)) }))
    downloadBlob(new Blob([toCsv(exportable, sorted)], { type: "text/csv;charset=utf-8" }), `${exportFilename}.csv`)
  }

  const activeFilters: ExtraFilter[] = [
    ...filters.flatMap((group) => {
      const option = group.options.find((item) => item.id === selected[group.id])
      return option ? [{ id: group.id, label: `${group.label}: ${option.label}`, onClear: () => choose(group.id, undefined) }] : []
    }),
    ...extraFilters,
  ]
  const hideable = columns.filter((column, index) => index > 0 && column.hideable !== false)

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {search ? (
          <div className="sm:max-w-xs sm:flex-1">
            <SearchInput value={query} onChange={changeQuery} label={searchLabel} placeholder={searchPlaceholder} />
          </div>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-sm text-muted-foreground" role="status">
            {loading ? "Loading records…" : sorted.length === rows.length ? `${rows.length} ${rows.length === 1 ? "record" : "records"}` : `${sorted.length} of ${rows.length} records`}
          </p>
          {hideable.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Columns3Icon aria-hidden="true" />
                Columns
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                  {hideable.map((column) => (
                    <DropdownMenuCheckboxItem key={column.id} checked={!hidden.has(column.id)} onCheckedChange={() => setHidden((current) => toggleSet(current, column.id))}>
                      {column.header}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {exportFilename && (
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || sorted.length === 0}>
              <DownloadIcon aria-hidden="true" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {(filters.length > 0 || toolbar) && (
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
          {toolbar}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters" role="group">
          {activeFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={filter.onClear}
              className="inline-flex h-7 items-center gap-1 rounded-md border bg-card pr-1.5 pl-2 text-xs text-muted-foreground focus-ring hover:text-foreground"
            >
              {filter.label}
              <XIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Clear filter</span>
            </button>
          ))}
          {activeFilters.length > 1 && (
            <Button variant="ghost" size="sm" onClick={() => activeFilters.forEach((filter) => filter.onClear())}>
              Clear all
            </Button>
          )}
        </div>
      )}

      {selectable && pickedRows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-accent/40 p-2 pl-3" role="region" aria-label="Bulk actions">
          <span className="text-sm font-medium">{pickedRows.length} selected</span>
          <div className="flex flex-wrap gap-1.5">{bulkActions?.(pickedRows, () => setPicked(new Set()))}</div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setPicked(new Set())}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="surface mt-4 overflow-hidden">
        <Table aria-busy={loading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPage}
                    indeterminate={someOnPage && !allOnPage}
                    onCheckedChange={(checked) =>
                      setPicked((current) => {
                        const next = new Set(current)
                        for (const row of pageRows) {
                          if (checked) next.add(rowKey(row))
                          else next.delete(rowKey(row))
                        }
                        return next
                      })
                    }
                    aria-label="Select all rows on this page"
                  />
                </TableHead>
              )}
              {visible.map((column) => {
                const isSorted = sort?.columnId === column.id
                const SortIcon = isSorted ? (sort.direction === "asc" ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon
                return (
                  <TableHead
                    key={column.id}
                    scope="col"
                    aria-sort={column.sortValue ? (isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
                    className={cn(column.align === "right" && "text-right", column.secondary && "hidden md:table-cell", column.className)}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={cn("inline-flex items-center gap-1 rounded-sm focus-ring hover:text-foreground", isSorted && "text-foreground")}
                      >
                        {column.header}
                        <SortIcon className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">, sort</span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
              {secondary.length > 0 && (
                <TableHead className="w-10 md:hidden">
                  <span className="sr-only">Details</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
                <TableRow key={index} className="hover:bg-transparent">
                  {Array.from({ length: totalColumns }, (_, cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pageRows.length > 0 ? (
              pageRows.flatMap((row) => {
                const key = rowKey(row)
                const isOpen = expanded.has(key)
                const detailId = `${id}-${key}-details`
                const cells = (
                  <TableRow key={key} data-state={picked.has(key) ? "selected" : undefined}>
                    {selectable && (
                      <TableCell>
                        <Checkbox checked={picked.has(key)} onCheckedChange={() => setPicked((current) => toggleSet(current, key))} aria-label={`Select row ${key}`} />
                      </TableCell>
                    )}
                    {visible.map((column) => (
                      <TableCell key={column.id} className={cn(column.align === "right" && "text-right", column.secondary && "hidden md:table-cell", column.className)}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                    {secondary.length > 0 && (
                      <TableCell className="md:hidden">
                        <Button variant="ghost" size="icon-sm" aria-expanded={isOpen} aria-controls={isOpen ? detailId : undefined} onClick={() => setExpanded((current) => toggleSet(current, key))}>
                          <ChevronDownIcon className={cn("transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                          <span className="sr-only">{isOpen ? "Hide details" : "Show details"}</span>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
                if (!isOpen || secondary.length === 0) return [cells]
                return [
                  cells,
                  <TableRow key={`${key}-details`} id={detailId} className="bg-muted/30 hover:bg-muted/30 md:hidden">
                    <TableCell colSpan={totalColumns}>
                      <dl className="grid gap-2">
                        {secondary.map((column) => (
                          <div key={column.id} className="grid gap-0.5">
                            <dt className="text-xs font-medium text-muted-foreground">{column.header}</dt>
                            <dd>{column.cell(row)}</dd>
                          </div>
                        ))}
                      </dl>
                    </TableCell>
                  </TableRow>,
                ]
              })
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={totalColumns} className="py-12 text-center text-muted-foreground">
                  {empty ?? "No records match these filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {!loading && sorted.length > pageSize && (
        <nav aria-label={`${searchLabel.replace(/^Search /, "")} pages`} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {safePage * pageSize + 1}–{Math.min(sorted.length, safePage * pageSize + pageSize)} of {sorted.length}
          </p>
          <ul className="flex flex-wrap items-center gap-1">
            <li>
              <Button variant="outline" size="sm" onClick={() => goToPage(Math.max(0, safePage - 1))} disabled={safePage === 0}>
                <ChevronLeftIcon aria-hidden="true" />
                Previous
              </Button>
            </li>
            {pageWindow(safePage, pageCount).map((index, position) =>
              index === null ? (
                <li key={`gap-${position}`} className="px-1 text-sm text-muted-foreground" aria-hidden="true">
                  …
                </li>
              ) : (
                <li key={index}>
                  <Button variant={index === safePage ? "default" : "ghost"} size="sm" aria-current={index === safePage ? "page" : undefined} onClick={() => goToPage(index)}>
                    <span className="sr-only">Page </span>
                    {index + 1}
                  </Button>
                </li>
              )
            )}
            <li>
              <Button variant="outline" size="sm" onClick={() => goToPage(Math.min(pageCount - 1, safePage + 1))} disabled={safePage >= pageCount - 1}>
                Next
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div aria-busy="true" aria-label="Loading records" className="space-y-3">
      <Skeleton className="h-12 w-full max-w-xs rounded-xl" />
      <div className="surface space-y-3 p-4">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex gap-3">
            {Array.from({ length: columns }, (_, cell) => (
              <Skeleton key={cell} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
