"use client"

import { useState } from "react"
import { CalendarIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  id?: string
  // A calendar day as YYYY-MM-DD, or "" for none.
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  clearable?: boolean
  size?: "default" | "sm"
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

// Parsed as a local calendar day so the picker never shifts it by the viewer's UTC offset.
function toDate(key: string | undefined) {
  const match = key && /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const label = (date: Date) => date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  clearable = false,
  size = "default",
  className,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = toDate(value)
  const from = toDate(min)
  const to = toDate(max)
  const disabled = [...(from ? [{ before: from }] : []), ...(to ? [{ after: to }] : [])]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            size={size}
            data-empty={!selected}
            className={cn("justify-start font-normal data-[empty=true]:text-muted-foreground", size === "sm" && "h-8", className)}
            {...aria}
          />
        }
      >
        <CalendarIcon aria-hidden="true" />
        {selected ? label(selected) : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? from}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date ? toKey(date) : "")
            setOpen(false)
          }}
          className="[--cell-size:--spacing(9)]"
          autoFocus
        />
        {clearable && selected && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              <XIcon aria-hidden="true" />
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
