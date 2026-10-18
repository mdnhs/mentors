"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { SearchXIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"

import { Chip } from "@/components/filters/chip"
import { FilterSelect } from "@/components/filters/filter-select"
import { SearchInput } from "@/components/filters/search-input"
import { MentorCard } from "@/components/mentors/mentor-card"
import { MentorFilterPanel } from "@/components/mentors/mentor-filter-panel"
import { EmptyState } from "@/components/site/empty-state"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { categories, tracks } from "@/lib/categories"
import {
  clearPanelFilters,
  defaultFilters,
  filterMentors,
  filtersFromParams,
  filtersToParams,
  getActiveFilters,
  MENTOR_PAGE_SIZE,
  pageFromParams,
  sortOptions,
  type FilterUpdate,
  type MentorFilters,
} from "@/lib/mentor-filters"
import { rememberMentorSearch } from "@/lib/store"
import { useDraft } from "@/lib/use-draft"
import { cn } from "@/lib/utils"

const desktopQuery = "(min-width: 768px)"

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(desktopQuery).matches, () => false)
}

function toParams(filters: MentorFilters, page = 1) {
  const params = filtersToParams(filters)
  if (page > 1) params.set("page", page.toString())
  return params
}

function toUrl(pathname: string, filters: MentorFilters, page = 1) {
  // Commas stay readable in shared links (format=one-on-one,group).
  const query = toParams(filters, page).toString().replace(/%2C/g, ",")
  return query ? `${pathname}?${query}` : pathname
}

type HistoryMode = "push" | "replace"

function writeUrl(url: string, mode: HistoryMode) {
  if (url === `${window.location.pathname}${window.location.search}`) return
  if (mode === "push") window.history.pushState(null, "", url)
  else window.history.replaceState(null, "", url)
}

export function MentorExplorer() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isDesktop = useIsDesktop()
  const [sheetOpen, setSheetOpen] = useState(false)
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams])
  const page = pageFromParams(searchParams)

  // The URL is the single source of truth, so links, reloads and the back button all restore the same results.
  // Discrete changes push a history entry so Back undoes them; typing replaces so Back skips every keystroke.
  // Patches read the live URL rather than the last render, so rapid toggles don't overwrite each other.
  const apply = useCallback(
    (update: FilterUpdate, mode: HistoryMode = "push") => {
      const current = filtersFromParams(new URLSearchParams(window.location.search))
      const patch = typeof update === "function" ? update(current) : update
      writeUrl(toUrl(pathname, { ...current, ...patch }), mode)
    },
    [pathname]
  )

  const commitQuery = useCallback((q: string) => apply({ q }, "replace"), [apply])
  const [query, setQuery] = useDraft(filters.q, commitQuery)

  useEffect(() => {
    const normalized = toParams(filters, page).toString()
    if (normalized !== searchParams.toString()) window.history.replaceState(null, "", toUrl(pathname, filters, page))
    rememberMentorSearch(normalized)
  }, [filters, page, searchParams, pathname])

  const results = useMemo(() => filterMentors({ ...filters, q: query }), [filters, query])
  const visible = results.slice(0, page * MENTOR_PAGE_SIZE)
  const gridRef = useRef<HTMLDivElement>(null)
  const focusIndex = useRef<number | null>(null)

  // The button can vanish on the last page, so focus moves to the first newly shown mentor instead.
  useEffect(() => {
    if (focusIndex.current === null) return
    gridRef.current?.querySelectorAll("article")[focusIndex.current]?.querySelector("a")?.focus()
    focusIndex.current = null
  }, [page])

  const showMore = () => {
    focusIndex.current = visible.length
    const live = new URLSearchParams(window.location.search)
    writeUrl(toUrl(pathname, filtersFromParams(live), pageFromParams(live) + 1), "replace")
  }

  const active = getActiveFilters(filters)
  const visibleCategories = categories.filter((item) => filters.track === "all" || item.track === filters.track)
  const resultLabel = `${results.length} ${results.length === 1 ? "mentor" : "mentors"}`

  const setTrack = (track: MentorFilters["track"]) =>
    apply((current) => ({
      track,
      category: categories.find((item) => item.id === current.category)?.track === track ? current.category : "all",
    }))

  const resetAll = () => apply(defaultFilters)

  return (
    <div className="mt-6">
      <div className="flex gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search mentors"
          placeholder="Name, skill, company or university"
          className="flex-1"
        />
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                className={cn("relative h-12 w-12 rounded-xl md:w-auto md:px-4", active.length > 0 && "border-foreground")}
              />
            }
          >
            <SlidersHorizontalIcon className="size-5 md:size-4" aria-hidden="true" />
            <span className="sr-only md:not-sr-only">Filters</span>
            {active.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground md:static">
                {active.length}
                <span className="sr-only"> active</span>
              </span>
            )}
          </SheetTrigger>
          <SheetContent side={isDesktop ? "right" : "bottom"} className={cn(isDesktop ? "w-full sm:max-w-sm" : "max-h-dvh rounded-t-2xl")}>
            <SheetHeader className="border-b">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto px-4 py-1">
              <MentorFilterPanel filters={filters} onChange={apply} showSort={!isDesktop} />
            </div>
            <SheetFooter className="flex-row border-t">
              <Button variant="ghost" size="lg" className="flex-1" onClick={() => apply(clearPanelFilters)} disabled={active.length === 0}>
                Reset
              </Button>
              <Button size="lg" className="flex-2" onClick={() => setSheetOpen(false)}>
                Show {resultLabel}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="scrollbar-none -mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex shrink-0 rounded-xl bg-muted p-1" role="group" aria-label="Track">
          {[{ id: "all" as const, label: "All" }, ...tracks].map((track) => (
            <button
              key={track.id}
              type="button"
              aria-pressed={filters.track === track.id}
              onClick={() => setTrack(track.id)}
              className={cn(
                "h-9 rounded-lg px-3 text-sm whitespace-nowrap text-muted-foreground transition focus-ring",
                filters.track === track.id && "bg-card font-medium text-foreground shadow-sm"
              )}
            >
              {track.label}
            </button>
          ))}
        </div>
        <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden="true" />
        <div className="flex gap-2" role="group" aria-label="Topic">
          {visibleCategories.map((category) => (
            <Chip
              key={category.id}
              active={filters.category === category.id}
              onClick={() => apply((current) => ({ category: current.category === category.id ? "all" : category.id }))}
            >
              <category.icon aria-hidden="true" />
              {category.label}
            </Chip>
          ))}
        </div>
      </div>

      {active.length > 0 && (
        <ul className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {active.map((filter) => (
            <li key={filter.key}>
              <button
                type="button"
                onClick={() => apply(filter.clear)}
                aria-label={`Remove filter: ${filter.label}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent pr-2 pl-3 text-sm text-accent-foreground transition hover:bg-accent/70 focus-ring"
              >
                {filter.label}
                <XIcon className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => apply(clearPanelFilters)} className="px-1 link text-sm">
              Clear filters
            </button>
          </li>
        </ul>
      )}

      <section aria-labelledby="results-heading">
        <h2 id="results-heading" className="sr-only">
          Results
        </h2>
        <div className="mt-6 flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            <span className="font-medium text-foreground">{results.length}</span> {results.length === 1 ? "mentor" : "mentors"}
            {query.trim() && <span> for “{query.trim()}”</span>}
          </p>
          <FilterSelect
            label="Sort by"
            value={filters.sort}
            options={sortOptions}
            onChange={(sort) => apply({ sort })}
            className="hidden min-w-44 md:flex"
          />
        </div>

        {results.length > 0 ? (
          <>
            <div ref={gridRef} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visible.map(({ mentor, price }, index) => (
                <MentorCard key={mentor.slug} mentor={mentor} price={price} priority={index < 4} />
              ))}
            </div>
            {visible.length < results.length && (
              <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {visible.length} of {results.length} mentors
                </p>
                <Button variant="outline" size="lg" onClick={showMore}>
                  Show more mentors
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={SearchXIcon}
            title="No mentors match"
            description="Try a shorter search, another topic, or fewer filters."
            className="mt-4"
          >
            <Button variant="outline" onClick={resetAll}>
              Reset search and filters
            </Button>
          </EmptyState>
        )}
      </section>
    </div>
  )
}
