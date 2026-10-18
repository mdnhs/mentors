"use client"

import { useId, useState } from "react"

import { cn } from "@/lib/utils"

export type BarDatum = { key: string; label: string; value: number }

const WIDTH = 600
const HEIGHT = 200
const GAP = 2

// A single-series bar chart. Marks are drawn in SVG; text stays in HTML so it never scales with the viewBox.
export function BarChart({
  title,
  description,
  data,
  formatValue = String,
  valueLabel = "Value",
  className,
}: {
  title: string
  description: string
  data: BarDatum[]
  formatValue?: (value: number) => string
  valueLabel?: string
  className?: string
}) {
  const id = useId()
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(0, ...data.map((item) => item.value))
  const min = Math.min(0, ...data.map((item) => item.value))
  const span = max - min || 1
  const zero = HEIGHT * (max / span)
  const step = WIDTH / Math.max(data.length, 1)
  const barWidth = Math.max(step - GAP, 1)
  const shown = active ?? data.length - 1
  const tickEvery = Math.max(1, Math.ceil(data.length / 4))

  const move = (key: string) => {
    if (data.length === 0) return
    const current = active ?? data.length - 1
    if (key === "ArrowLeft") setActive(Math.max(0, current - 1))
    if (key === "ArrowRight") setActive(Math.min(data.length - 1, current + 1))
    if (key === "Home") setActive(0)
    if (key === "End") setActive(data.length - 1)
  }

  return (
    <figure className={cn("surface p-4", className)}>
      <figcaption>
        <span id={`${id}-title`} className="block text-sm font-medium">
          {title}
        </span>
        <span id={`${id}-desc`} className="block text-xs text-muted-foreground">
          {description}
        </span>
      </figcaption>

      <p className="mt-3 min-h-5 text-sm tabular-nums" aria-live="polite">
        {data[shown] && (
          <>
            <span className="text-muted-foreground">{data[shown].label}: </span>
            <span className="font-medium">{formatValue(data[shown].value)}</span>
          </>
        )}
      </p>

      <div className="mt-2 flex gap-2">
        <div className="flex w-16 shrink-0 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums" aria-hidden="true">
          <span>{formatValue(max)}</span>
          {min < 0 && <span>{formatValue(min)}</span>}
          {min === 0 && <span>{formatValue(0)}</span>}
        </div>
        <div
          tabIndex={0}
          role="group"
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-desc`}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
            event.preventDefault()
            move(event.key)
          }}
          onMouseLeave={() => setActive(null)}
          className="min-w-0 flex-1 rounded-md focus-ring"
        >
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full" aria-hidden="true">
            <line x1={0} x2={WIDTH} y1={0} y2={0} className="stroke-border" vectorEffect="non-scaling-stroke" />
            <line x1={0} x2={WIDTH} y1={HEIGHT / 2} y2={HEIGHT / 2} className="stroke-border" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            {data.map((item, index) => {
              const height = (Math.abs(item.value) / span) * HEIGHT
              const y = item.value >= 0 ? zero - height : zero
              return (
                <g key={item.key} onMouseEnter={() => setActive(index)}>
                  <rect x={index * step} y={0} width={step} height={HEIGHT} className="fill-transparent" />
                  <rect
                    x={index * step + GAP / 2}
                    y={y}
                    width={barWidth}
                    height={Math.max(height, item.value === 0 ? 0 : 1)}
                    rx={1}
                    className={cn("transition-opacity", item.value < 0 ? "fill-chart-3" : "fill-chart-1", active !== null && active !== index && "opacity-50")}
                  />
                </g>
              )
            })}
            <line x1={0} x2={WIDTH} y1={zero} y2={zero} className="stroke-muted-foreground/50" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="mt-1 flex justify-between gap-2 overflow-hidden text-xs whitespace-nowrap text-muted-foreground" aria-hidden="true">
            {data
              .filter((_, index) => index % tickEvery === 0 || index === data.length - 1)
              .map((item) => (
                <span key={item.key}>{item.label}</span>
              ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.key}>
              <th scope="row">{item.label}</th>
              <td>{formatValue(item.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
