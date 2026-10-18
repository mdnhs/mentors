"use client"

import { useId, useState } from "react"

import { cn } from "@/lib/utils"

export type BarDatum = { key: string; label: string; value: number }

const WIDTH = 600
const HEIGHT = 200
const GAP = 2

// A single-series chart drawn as bars or a filled line. Marks are drawn in SVG; text and the hover marker
// stay in HTML so they never stretch with the viewBox.
export function BarChart({
  title,
  description,
  data,
  formatValue = String,
  formatTick,
  valueLabel = "Value",
  variant = "bar",
  framed = true,
  className,
}: {
  title: string
  description: string
  data: BarDatum[]
  formatValue?: (value: number) => string
  // Shorter labels for the y axis; falls back to formatValue.
  formatTick?: (value: number) => string
  valueLabel?: string
  variant?: "bar" | "area"
  // Draws its own card; turn off when the chart already sits inside a panel.
  framed?: boolean
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
  const tickEvery = Math.max(1, Math.ceil(data.length / 5))
  const tick = formatTick ?? formatValue

  const yOf = (value: number) => zero - (value / span) * HEIGHT
  const xOf = (index: number) => (data.length <= 1 ? WIDTH / 2 : (index / (data.length - 1)) * WIDTH)
  const ticks = [max, max / 2, ...(min < 0 ? [min] : [0])].filter((value, index, all) => all.indexOf(value) === index)

  const line = data.map((item, index) => `${index === 0 ? "M" : "L"}${xOf(index)},${yOf(item.value)}`).join(" ")
  const area = data.length > 0 ? `${line} L${xOf(data.length - 1)},${zero} L${xOf(0)},${zero} Z` : ""

  const move = (key: string) => {
    if (data.length === 0) return
    const current = active ?? data.length - 1
    if (key === "ArrowLeft") setActive(Math.max(0, current - 1))
    if (key === "ArrowRight") setActive(Math.min(data.length - 1, current + 1))
    if (key === "Home") setActive(0)
    if (key === "End") setActive(data.length - 1)
  }

  const marker = data[shown] && variant === "area"
  const markerLeft = `${(variant === "area" ? xOf(shown) : shown * step + step / 2) / WIDTH * 100}%`

  return (
    <figure className={cn(framed && "surface p-4", className)}>
      <figcaption className={cn(!framed && "sr-only")}>
        <span id={`${id}-title`} className="block text-sm font-medium">
          {title}
        </span>
        <span id={`${id}-desc`} className="block text-xs text-muted-foreground">
          {description}
        </span>
      </figcaption>

      <p className={cn("min-h-5 text-sm tabular-nums", framed && "mt-3")} aria-live="polite">
        {data[shown] && (
          <>
            <span className="text-muted-foreground">{data[shown].label}: </span>
            <span className="font-medium">{formatValue(data[shown].value)}</span>
          </>
        )}
      </p>

      <div className="mt-3 flex gap-3">
        <div className="relative h-40 w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums" aria-hidden="true">
          {ticks.map((value) => (
            <span key={value} className="absolute right-0 -translate-y-1/2" style={{ top: `${(yOf(value) / HEIGHT) * 100}%` }}>
              {tick(value)}
            </span>
          ))}
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
          <div className="relative">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="block h-40 w-full overflow-visible" aria-hidden="true">
              {ticks.map((value) => (
                <line key={value} x1={0} x2={WIDTH} y1={yOf(value)} y2={yOf(value)} className="stroke-border" strokeDasharray={value === 0 ? undefined : "3 4"} vectorEffect="non-scaling-stroke" />
              ))}
              {variant === "area" ? (
                <>
                  <path d={area} className="fill-chart-1 opacity-15" />
                  <path d={line} fill="none" className="stroke-chart-1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  {data[shown] && <line x1={xOf(shown)} x2={xOf(shown)} y1={0} y2={HEIGHT} className="stroke-muted-foreground/40" vectorEffect="non-scaling-stroke" />}
                </>
              ) : (
                data.map((item, index) => {
                  const height = (Math.abs(item.value) / span) * HEIGHT
                  const y = item.value >= 0 ? zero - height : zero
                  return (
                    <rect
                      key={item.key}
                      x={index * step + GAP / 2}
                      y={y}
                      width={barWidth}
                      height={Math.max(height, item.value === 0 ? 0 : 1)}
                      rx={1}
                      className={cn("transition-opacity", item.value < 0 ? "fill-chart-3" : "fill-chart-1", active !== null && active !== index && "opacity-50")}
                    />
                  )
                })
              )}
              {data.map((item, index) => (
                <rect key={item.key} x={index * step} y={0} width={step} height={HEIGHT} className="fill-transparent" onMouseEnter={() => setActive(index)} />
              ))}
            </svg>
            {marker && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-chart-1"
                style={{ left: markerLeft, top: `${(yOf(data[shown].value) / HEIGHT) * 100}%` }}
              />
            )}
          </div>
          <div className="mt-2 flex justify-between gap-2 overflow-hidden text-xs whitespace-nowrap text-muted-foreground" aria-hidden="true">
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
