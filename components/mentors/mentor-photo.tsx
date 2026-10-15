"use client"

import Image from "next/image"
import { useState } from "react"

import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type MentorPhotoProps = {
  src?: string
  name: string
  alt?: string
  sizes: string
  priority?: boolean
  className?: string
}

export function MentorPhoto({ src, name, alt, sizes, priority, className }: MentorPhotoProps) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-accent text-3xl font-semibold text-accent-foreground" role="img" aria-label={alt ?? name}>
        {initials(name)}
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt ?? name}
      fill
      sizes={sizes}
      loading={priority ? "eager" : undefined}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  )
}
