"use client"

import { HeartIcon } from "lucide-react"

import { toggleSaved, useAppState } from "@/lib/store"
import { cn } from "@/lib/utils"

type SaveButtonProps = {
  slug: string
  name: string
  variant?: "overlay" | "outline"
  className?: string
}

export function SaveButton({ slug, name, variant = "overlay", className }: SaveButtonProps) {
  const { saved } = useAppState()
  const isSaved = saved.includes(slug)

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${name} from saved` : `Save ${name}`}
      onClick={() => toggleSaved(slug)}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full transition focus-ring active:scale-95",
        variant === "overlay" && "size-9 bg-white/90 text-foreground shadow-sm backdrop-blur hover:bg-white",
        variant === "outline" && "h-10 border bg-card px-4 text-sm font-medium hover:bg-muted",
        className
      )}
    >
      <HeartIcon className={cn("size-4 transition-colors", isSaved && "fill-saved text-saved")} />
      {variant === "outline" && <span>{isSaved ? "Saved" : "Save"}</span>}
    </button>
  )
}
