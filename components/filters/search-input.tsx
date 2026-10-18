"use client"

import { SearchIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type SearchInputProps = {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  className?: string
}

export function SearchInput({ value, onChange, label, placeholder, className }: SearchInputProps) {
  return (
    <div
      className={cn(
        "flex h-12 items-center gap-2 rounded-xl border bg-card px-3 shadow-card transition focus-within:border-primary/50 focus-within:ring-3 focus-within:ring-ring/20",
        className
      )}
    >
      <SearchIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-ring"
        >
          <XIcon className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
