import { DHAKA_TZ, formatDateParts } from "@/lib/format"
import { cn } from "@/lib/utils"

export function DateBlock({ iso, timeZone = DHAKA_TZ, className }: { iso: string; timeZone?: string; className?: string }) {
  const { weekday, month, day } = formatDateParts(iso, timeZone)

  return (
    <div
      className={cn("flex w-14 shrink-0 flex-col items-center rounded-xl bg-accent py-2 text-accent-foreground", className)}
      aria-hidden="true"
    >
      <span className="text-xs font-semibold">{month}</span>
      <span className="text-xl leading-tight font-semibold">{day}</span>
      <span className="text-xs">{weekday}</span>
    </div>
  )
}
