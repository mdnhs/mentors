"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type Option<T extends string> = { value: T; label: string }

type FilterSelectProps<T extends string> = {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  className?: string
}

export function FilterSelect<T extends string>({ label, value, options, onChange, className }: FilterSelectProps<T>) {
  const isActive = value !== options[0]?.value

  return (
    <Select items={options} value={value} onValueChange={(next) => next && onChange(next as T)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "min-w-36",
          isActive && "border-primary/40 bg-accent text-accent-foreground",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="py-2">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
