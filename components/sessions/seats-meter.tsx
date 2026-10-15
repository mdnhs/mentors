import { cn } from "@/lib/utils"

export function SeatsMeter({ seats, className }: { seats: { total: number; taken: number }; className?: string }) {
  const left = Math.max(seats.total - seats.taken, 0)
  const almostFull = left <= seats.total * 0.25

  return (
    <div className={className}>
      <p className={cn("text-xs font-medium", almostFull ? "text-warning" : "text-muted-foreground")}>
        {left === 0 ? "Fully booked" : `${left} of ${seats.total} seats left`}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", almostFull ? "bg-warning" : "bg-primary")}
          style={{ width: `${(seats.taken / seats.total) * 100}%` }}
        />
      </div>
    </div>
  )
}
