"use client"

import { useEffect } from "react"

import { site } from "@/lib/site"
import "./globals.css"

// This replaces the root layout, so the theme provider is gone; re-apply the saved theme (next-themes' "theme" key) by hand.
function applySavedTheme() {
  let theme: string | null = null
  try {
    theme = window.localStorage.getItem("theme")
  } catch {}
  const dark = theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", dark)
}

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
    applySavedTheme()
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-background p-6 font-sans text-foreground">
        <title>{`Something went wrong · ${site.name}`}</title>
        <main className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-muted-foreground">The site hit an unexpected error. Try again, or reload the page.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" onClick={retry} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-ring">
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} className="h-10 rounded-lg border px-4 text-sm font-medium focus-ring">
              Reload page
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
