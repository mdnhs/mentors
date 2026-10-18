"use client"

import { Share2Icon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

type ShareButtonProps = {
  title: string
  text?: string
  className?: string
}

export function ShareButton({ title, text, className }: ShareButtonProps) {
  const share = async () => {
    const url = window.location.href.split("#")[0]
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copied", { description: "Paste it anywhere to share this profile." })
    } catch {
      toast.error("Couldn't copy the link", { description: url })
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border bg-card px-4 text-sm font-medium transition hover:bg-muted focus-ring active:scale-95",
        className
      )}
    >
      <Share2Icon className="size-4" aria-hidden="true" />
      Share
    </button>
  )
}
