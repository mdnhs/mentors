"use client"

import { useEffect, useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"

// Shown only once the offer panel has scrolled out of view, so there's one booking action on screen at a time.
export function MobileBookBar({ price, firstName }: { price: number; firstName: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById("offers")
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { rootMargin: "-64px 0px 0px 0px" })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  if (!visible) return null

  return (
    <div data-mobile-bar className="mobile-bar">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <p className="text-sm">
          <span className="text-muted-foreground">From </span>
          <span className="font-semibold">{formatPrice(price)}</span>
        </p>
        <a href="#offers" className={buttonVariants({ size: "lg" })}>
          Book {firstName}
        </a>
      </div>
    </div>
  )
}
