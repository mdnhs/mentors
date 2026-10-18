"use client"

import { HeartIcon } from "lucide-react"
import { toast } from "sonner"

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

  const toggle = () => {
    toggleSaved(slug)
    toast.success(isSaved ? `Removed ${name} from saved` : `Saved ${name}`)
  }

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={`Save ${name}`}
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full transition focus-ring active:scale-95",
        variant === "overlay" && "size-9 bg-background/90 text-foreground shadow-sm backdrop-blur hover:bg-background",
        variant === "outline" && "h-10 border bg-card px-4 text-sm font-medium hover:bg-muted",
        className
      )}
    >
      <HeartIcon className={cn("size-4 transition-colors", isSaved && "fill-saved text-saved")} aria-hidden="true" />
      {variant === "outline" && <span aria-hidden="true">{isSaved ? "Saved" : "Save"}</span>}
    </button>
  )
}
