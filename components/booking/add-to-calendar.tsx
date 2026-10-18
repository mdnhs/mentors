"use client"

import { CalendarPlusIcon, ChevronDownIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar"
import { cn } from "@/lib/utils"

export function AddToCalendar({ event, className }: { event: CalendarEvent; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="lg" className={cn("print:hidden", className)} />}>
        <CalendarPlusIcon aria-hidden="true" />
        Add to calendar
        <ChevronDownIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto min-w-48">
        <DropdownMenuItem render={<a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" />}>
          <ExternalLinkIcon aria-hidden="true" />
          Google Calendar
          <span className="sr-only"> (opens in a new tab)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadIcs(event, `${event.uid}.ics`)}>
          <DownloadIcon aria-hidden="true" />
          Apple, Outlook (.ics)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
