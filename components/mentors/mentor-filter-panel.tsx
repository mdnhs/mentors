"use client"

import { useId } from "react"

import { Chip } from "@/components/filters/chip"
import { FilterSelect } from "@/components/filters/filter-select"
import {
  availabilityOptions,
  countryOptions,
  formatOptions,
  languageOptions,
  sortOptions,
  timezoneOptions,
  type FilterUpdate,
  type MentorFilters,
} from "@/lib/mentor-filters"
import { getBookableOffers, getListedMentors } from "@/lib/offers"
import { useDraft } from "@/lib/use-draft"
import { cn } from "@/lib/utils"

const allPrices = getListedMentors().flatMap((mentor) => getBookableOffers(mentor).map((offer) => offer.price))
const priceFloor = Math.min(...allPrices)
const priceCeiling = Math.max(...allPrices)

const digits = (text: string) => text.replace(/\D/g, "")
const toPrice = (text: string) => (digits(text) === "" ? null : Number(digits(text)))

type PanelProps = {
  filters: MentorFilters
  onChange: (update: FilterUpdate) => void
  showSort?: boolean
}

export function MentorFilterPanel({ filters, onChange, showSort }: PanelProps) {
  const invalidRange = filters.minPrice !== null && filters.maxPrice !== null && filters.minPrice > filters.maxPrice

  const toggleFormat = (format: MentorFilters["formats"][number]) =>
    onChange((current) => ({
      formats: current.formats.includes(format)
        ? current.formats.filter((item) => item !== format)
        : [...current.formats, format],
    }))

  return (
    <div className="space-y-6">
      <Field label="Session format">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Session format">
          {formatOptions.map((option) => (
            <Chip key={option.value} active={filters.formats.includes(option.value)} onClick={() => toggleFormat(option.value)}>
              {option.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Price" hint={filters.formats.includes("group") ? "Group sessions are priced per seat." : undefined}>
        <div className="flex items-center gap-2">
          <PriceInput
            label="Minimum price"
            placeholder={priceFloor.toString()}
            value={filters.minPrice}
            invalid={invalidRange}
            onCommit={(minPrice) => onChange({ minPrice })}
          />
          <span className="text-muted-foreground" aria-hidden="true">
            –
          </span>
          <PriceInput
            label="Maximum price"
            placeholder={priceCeiling.toString()}
            value={filters.maxPrice}
            invalid={invalidRange}
            onCommit={(maxPrice) => onChange({ maxPrice })}
          />
        </div>
        {invalidRange && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            Minimum is higher than maximum.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-1">
        <Field label="Language">
          <FilterSelect label="Language" value={filters.language} options={languageOptions} onChange={(language) => onChange({ language })} className="w-full" />
        </Field>
        <Field label="Availability">
          <FilterSelect label="Availability" value={filters.availability} options={availabilityOptions} onChange={(availability) => onChange({ availability })} className="w-full" />
        </Field>
        <Field label="Country">
          <FilterSelect label="Mentor's country" value={filters.country} options={countryOptions} onChange={(country) => onChange({ country })} className="w-full" />
        </Field>
        <Field label="Timezone">
          <FilterSelect label="Mentor's timezone" value={filters.timezone} options={timezoneOptions} onChange={(timezone) => onChange({ timezone })} className="w-full" />
        </Field>
        {showSort && (
          <Field label="Sort by">
            <FilterSelect label="Sort by" value={filters.sort} options={sortOptions} onChange={(sort) => onChange({ sort })} className="w-full" />
          </Field>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {children}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

type PriceInputProps = {
  label: string
  placeholder: string
  value: number | null
  invalid: boolean
  onCommit: (value: number | null) => void
}

function PriceInput({ label, placeholder, value, invalid, onCommit }: PriceInputProps) {
  const id = useId()
  const [draft, setDraft, flush] = useDraft(value?.toString() ?? "", (text) => onCommit(toPrice(text)), 400, digits)

  return (
    <div
      className={cn(
        "flex h-10 min-w-0 flex-1 items-center gap-1 rounded-lg border border-input bg-card px-3 transition focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive"
      )}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <span className="text-sm text-muted-foreground" aria-hidden="true">
        ৳
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={draft}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(event) => setDraft(digits(event.target.value))}
        onBlur={flush}
        onKeyDown={(event) => event.key === "Enter" && flush()}
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
      />
    </div>
  )
}
