import { CheckIcon } from "lucide-react"

import type { Step } from "@/components/booking/steps/flow"
import { cn } from "@/lib/utils"

type StepProgressProps = {
  steps: { id: Step; label: string }[]
  current: Step
  disabled: boolean
  onEdit: (step: Step) => void
}

export function StepProgress({ steps, current, disabled, onEdit }: StepProgressProps) {
  const currentIndex = steps.findIndex((item) => item.id === current)
  const status = `Step ${currentIndex + 1} of ${steps.length} · ${steps[currentIndex]?.label}`

  return (
    <>
      <ol className="mt-5 flex items-center gap-2 text-sm" aria-label="Booking steps">
        {steps.map((item, index) => {
          const done = index < currentIndex
          const isCurrent = index === currentIndex
          const marker = (
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                done && "bg-success text-success-foreground",
                isCurrent && "bg-primary text-primary-foreground",
                !done && !isCurrent && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <CheckIcon className="size-3.5" aria-hidden="true" /> : index + 1}
            </span>
          )
          const label = <span className={cn(isCurrent ? "font-medium" : "text-muted-foreground", "hidden sm:inline")}>{item.label}</span>

          return (
            <li key={item.id} aria-current={isCurrent ? "step" : undefined} className="flex items-center gap-2">
              {index > 0 && <span className="h-px w-4 bg-border sm:w-8" aria-hidden="true" />}
              {done ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onEdit(item.id)}
                  aria-label={`Edit ${item.label.toLowerCase()}`}
                  className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-muted focus-ring disabled:cursor-default"
                >
                  {marker}
                  {label}
                </button>
              ) : (
                <span className="flex items-center gap-2 px-2 py-2">
                  {marker}
                  {label}
                  <span className="sr-only sm:hidden">{item.label}</span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-1 text-sm font-medium sm:hidden">{status}</p>
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
    </>
  )
}
