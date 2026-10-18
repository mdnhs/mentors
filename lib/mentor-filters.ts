import { categories, getCategory, offerTypeLabels } from "@/lib/categories"
import { getRating } from "@/lib/data"
import { formatPrice, timezoneLabel } from "@/lib/format"
import { getBookableOffers, getListedMentors } from "@/lib/offers"
import type { CategoryId, Language, Mentor, OfferType, Track } from "@/lib/types"

export type Availability = "all" | "weekend" | "weekday" | "evening" | "daytime"
export type SortKey = "relevance" | "price-asc" | "price-desc" | "rating"

export type MentorFilters = {
  q: string
  track: Track | "all"
  category: CategoryId | "all"
  formats: OfferType[]
  minPrice: number | null
  maxPrice: number | null
  language: Language | "all"
  country: string
  timezone: string
  availability: Availability
  sort: SortKey
}

export type FilterUpdate = Partial<MentorFilters> | ((current: MentorFilters) => Partial<MentorFilters>)

export const defaultFilters: MentorFilters = {
  q: "",
  track: "all",
  category: "all",
  formats: [],
  minPrice: null,
  maxPrice: null,
  language: "all",
  country: "all",
  timezone: "all",
  availability: "all",
  sort: "relevance",
}

const BANGLADESH = "Bangladesh"
// Friday and Saturday are the weekend in Bangladesh.
const WEEKEND_DAYS = [5, 6]
// Below this many reviews an average is too noisy to rank by.
const MIN_REVIEWS_TO_RANK = 2

const formatOrder = Object.keys(offerTypeLabels) as OfferType[]

export const formatOptions = formatOrder.map((value) => ({
  value,
  label: { "one-on-one": "1:1", group: "Group", review: "Expert review", mentorship: "Recurring mentorship" }[value],
}))

const mentors = getListedMentors()
const unique = <T,>(values: T[]) => [...new Set(values)]

export const languageOptions = [
  { value: "all" as const, label: "Any language" },
  ...unique(mentors.flatMap((mentor) => mentor.languages))
    .sort()
    .map((value) => ({ value, label: value })),
]

export const countryOptions = [
  { value: "all", label: "Anywhere" },
  { value: BANGLADESH, label: "In Bangladesh" },
  { value: "abroad", label: "Abroad" },
  ...unique(mentors.map((mentor) => mentor.country))
    .filter((country) => country !== BANGLADESH)
    .sort()
    .map((country) => ({ value: country, label: country })),
]

export const timezoneOptions = [
  { value: "all", label: "Any timezone" },
  ...unique(mentors.map((mentor) => mentor.timezone))
    .map((value) => ({ value, label: timezoneLabel(value, new Date()) }))
    .sort((a, b) => a.label.localeCompare(b.label)),
]

export const availabilityOptions = [
  { value: "all" as const, label: "Any time" },
  { value: "weekend" as const, label: "Weekends (Fri–Sat)" },
  { value: "weekday" as const, label: "Weekdays" },
  { value: "evening" as const, label: "Evenings (after 6 PM Dhaka)" },
  { value: "daytime" as const, label: "Daytime" },
]

const rankedMentorCount = mentors.filter((mentor) => (getRating(mentor.slug)?.count ?? 0) >= MIN_REVIEWS_TO_RANK).length
export const canSortByRating = rankedMentorCount >= 2

export const sortOptions = [
  { value: "relevance" as const, label: "Relevance" },
  ...(canSortByRating ? [{ value: "rating" as const, label: "Top rated" }] : []),
  { value: "price-asc" as const, label: "Price: low to high" },
  { value: "price-desc" as const, label: "Price: high to low" },
]

// Extra words people search with that the category labels don't contain.
const categoryKeywords: Partial<Record<CategoryId, string>> = {
  "study-abroad": "masters ms msc admissions university abroad",
  "phd-research": "phd doctorate research publishing",
  "ai-ml": "ai ml artificial intelligence data",
  "interview-prep": "interviews mock",
  scholarships: "funding funded scholarship",
}

const normalize = (text: string) => text.toLowerCase().replace(/['’]/g, "")

// Higher weights rank matches in a mentor's name or role above incidental mentions in their bio.
function searchFields(mentor: Mentor) {
  const fields: [string, number][] = [
    [mentor.name, 8],
    [`${mentor.role} ${mentor.organization}`, 5],
    [mentor.categories.map((id) => `${getCategory(id).label} ${categoryKeywords[id] ?? ""}`).join(" "), 4],
    [mentor.skills.join(" "), 4],
    [mentor.education, 3],
    [`${mentor.city} ${mentor.country}`, 2],
    [`${mentor.experience} ${mentor.highlights.join(" ")}`, 2],
    [mentor.bio, 1],
  ]
  return fields.map(([text, weight]) => [normalize(text), weight] as const)
}

function relevance(mentor: Mentor, terms: string[]) {
  const fields = searchFields(mentor)
  let score = 0
  for (const term of terms) {
    const best = Math.max(0, ...fields.filter(([text]) => text.includes(term)).map(([, weight]) => weight))
    if (best === 0) return 0
    score += best
  }
  return score
}

function matchesAvailability(mentor: Mentor, filter: Availability) {
  const { days, times } = mentor.availability
  if (filter === "weekend") return days.some((day) => WEEKEND_DAYS.includes(day))
  if (filter === "weekday") return days.some((day) => !WEEKEND_DAYS.includes(day))
  if (filter === "evening") return times.some((time) => time >= "18:00")
  if (filter === "daytime") return times.some((time) => time >= "08:00" && time < "18:00")
  return true
}

function matchesCountry(mentor: Mentor, filter: string) {
  if (filter === "all") return true
  if (filter === "abroad") return mentor.country !== BANGLADESH
  return mentor.country === filter
}

// Group prices are per seat, so they only count when the learner asks for group sessions.
function matchingPrice(mentor: Mentor, filters: MentorFilters) {
  const prices = getBookableOffers(mentor)
    .filter((offer) => (filters.formats.length > 0 ? filters.formats.includes(offer.type) : offer.type !== "group"))
    .map((offer) => offer.price)
    .filter((price) => (filters.minPrice === null || price >= filters.minPrice) && (filters.maxPrice === null || price <= filters.maxPrice))
  return prices.length > 0 ? Math.min(...prices) : null
}

export type MentorResult = { mentor: Mentor; price: number }

export function filterMentors(filters: MentorFilters): MentorResult[] {
  const terms = normalize(filters.q).split(/\s+/).filter(Boolean)

  const scored = mentors.flatMap((mentor, index) => {
    const score = terms.length > 0 ? relevance(mentor, terms) : 1
    const price = matchingPrice(mentor, filters)
    const matches =
      score > 0 &&
      price !== null &&
      (filters.track === "all" || mentor.track === filters.track) &&
      (filters.category === "all" || mentor.categories.includes(filters.category)) &&
      (filters.language === "all" || mentor.languages.includes(filters.language)) &&
      (filters.timezone === "all" || mentor.timezone === filters.timezone) &&
      matchesCountry(mentor, filters.country) &&
      matchesAvailability(mentor, filters.availability)
    return matches ? [{ mentor, price: price!, score, index }] : []
  })

  const byRelevance = (a: (typeof scored)[number], b: (typeof scored)[number]) => b.score - a.score || a.index - b.index

  scored.sort((a, b) => {
    if (filters.sort === "price-asc") return a.price - b.price || byRelevance(a, b)
    if (filters.sort === "price-desc") return b.price - a.price || byRelevance(a, b)
    if (filters.sort === "rating" && canSortByRating) {
      const ra = getRating(a.mentor.slug)
      const rb = getRating(b.mentor.slug)
      const rankedA = (ra?.count ?? 0) >= MIN_REVIEWS_TO_RANK
      const rankedB = (rb?.count ?? 0) >= MIN_REVIEWS_TO_RANK
      if (rankedA !== rankedB) return rankedA ? -1 : 1
      if (rankedA && ra && rb) return rb.average - ra.average || rb.count - ra.count || byRelevance(a, b)
    }
    return byRelevance(a, b)
  })

  return scored.map(({ mentor, price }) => ({ mentor, price }))
}

// Two full rows on the four-column desktop grid.
export const MENTOR_PAGE_SIZE = 8

export function pageFromParams(params: URLSearchParams) {
  const page = Number(params.get("page"))
  return Number.isInteger(page) && page > 1 ? page : 1
}

const byRating = (a: Mentor, b: Mentor) => {
  const ra = getRating(a.slug)
  const rb = getRating(b.slug)
  return (rb?.average ?? 0) - (ra?.average ?? 0) || (rb?.count ?? 0) - (ra?.count ?? 0)
}

// Hand-picked slugs can be delisted or renamed, so missing ones are topped up with the best-rated listed mentors.
export function pickListedMentors(slugs: string[], count: number) {
  const picked = unique(slugs).flatMap((slug) => mentors.filter((mentor) => mentor.slug === slug))
  const rest = mentors.filter((mentor) => !picked.includes(mentor)).sort(byRating)
  return [...picked, ...rest].slice(0, count)
}

export type ActiveFilter = { key: string; label: string; clear: (filters: MentorFilters) => MentorFilters }

// Filters that live in the filter panel; search, track and category are always visible on the page.
export function getActiveFilters(filters: MentorFilters): ActiveFilter[] {
  const active: ActiveFilter[] = filters.formats.map((format) => ({
    key: `format-${format}`,
    label: formatOptions.find((option) => option.value === format)!.label,
    clear: (current) => ({ ...current, formats: current.formats.filter((item) => item !== format) }),
  }))
  const { minPrice: min, maxPrice: max } = filters
  if (min !== null || max !== null) {
    const label =
      min !== null && max !== null
        ? `${formatPrice(min)} – ${formatPrice(max)}`
        : min !== null
          ? `${formatPrice(min)} and up`
          : `Up to ${formatPrice(max!)}`
    active.push({ key: "price", label, clear: (current) => ({ ...current, minPrice: null, maxPrice: null }) })
  }
  const selects = [
    ["language", languageOptions],
    ["country", countryOptions],
    ["timezone", timezoneOptions],
    ["availability", availabilityOptions],
  ] as const
  for (const [key, options] of selects) {
    const value = filters[key]
    if (value === "all") continue
    const label = (options as readonly { value: string; label: string }[]).find((option) => option.value === value)?.label ?? value
    active.push({ key, label, clear: (current) => ({ ...current, [key]: "all" }) })
  }
  return active
}

export function clearPanelFilters(filters: MentorFilters): MentorFilters {
  return { ...defaultFilters, q: filters.q, track: filters.track, category: filters.category, sort: filters.sort }
}

function parsePrice(value: string | null) {
  if (value === null || !/^\d+$/.test(value)) return null
  return Number(value)
}

function oneOf<T extends string>(value: string | null, allowed: readonly { value: T }[], fallback: T): T {
  return allowed.find((option) => option.value === value)?.value ?? fallback
}

export function filtersFromParams(params: URLSearchParams): MentorFilters {
  const category = categories.find((item) => item.id === params.get("category"))
  const track = params.get("track")
  const validTrack = track === "tech" || track === "education" ? track : null
  const keepCategory = category && (!validTrack || validTrack === category.track)
  const formats = (params.get("format") ?? "").split(",")

  return {
    q: params.get("q")?.trim() ?? "",
    track: keepCategory ? category.track : (validTrack ?? "all"),
    category: keepCategory ? category.id : "all",
    formats: formatOrder.filter((format) => formats.includes(format)),
    minPrice: parsePrice(params.get("min")),
    maxPrice: parsePrice(params.get("max")),
    language: oneOf(params.get("lang"), languageOptions, "all"),
    country: oneOf(params.get("country"), countryOptions, "all"),
    timezone: oneOf(params.get("tz"), timezoneOptions, "all"),
    availability: oneOf(params.get("when"), availabilityOptions, "all"),
    sort: oneOf(params.get("sort"), sortOptions, "relevance"),
  }
}

export function filtersToParams(filters: MentorFilters) {
  const params = new URLSearchParams()
  const set = (key: string, value: string | null, fallback: string | null = "all") => {
    if (value !== null && value !== "" && value !== fallback) params.set(key, value)
  }
  set("q", filters.q.trim())
  set("track", filters.category === "all" ? filters.track : null)
  set("category", filters.category)
  set("format", filters.formats.join(","))
  set("min", filters.minPrice?.toString() ?? null)
  set("max", filters.maxPrice?.toString() ?? null)
  set("lang", filters.language)
  set("country", filters.country)
  set("tz", filters.timezone)
  set("when", filters.availability)
  set("sort", filters.sort, "relevance")
  return params
}
