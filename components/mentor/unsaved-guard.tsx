"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useSyncExternalStore, type ComponentProps } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

// One editor is open at a time, so a module-level flag lets the workspace shell guard its links without prop drilling.
type GuardState = { dirty: boolean; leavingTo: string | null }

let guard: GuardState = { dirty: false, leavingTo: null }
const listeners = new Set<() => void>()

function update(next: Partial<GuardState>) {
  guard = { ...guard, ...next }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const serverGuard: GuardState = { dirty: false, leavingTo: null }

export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    update({ dirty })
    return () => update({ dirty: false, leavingTo: null })
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])
}

function hrefToString(href: ComponentProps<typeof Link>["href"]) {
  if (typeof href === "string") return href
  const query = href.query && typeof href.query === "object" ? new URLSearchParams(href.query as Record<string, string>).toString() : (href.query ?? "")
  const hash = href.hash ? `#${href.hash.replace(/^#/, "")}` : ""
  return `${href.pathname ?? "/"}${query ? `?${query}` : ""}${hash}`
}

export function GuardedLink({ onClick, href, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event)
        const newTab = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0
        if (event.defaultPrevented || newTab || !guard.dirty) return
        event.preventDefault()
        update({ leavingTo: hrefToString(href) })
      }}
      {...props}
    />
  )
}

export function UnsavedChangesDialog() {
  const router = useRouter()
  const { leavingTo } = useSyncExternalStore(subscribe, () => guard, () => serverGuard)

  return (
    <AlertDialog open={leavingTo !== null} onOpenChange={(open) => !open && update({ leavingTo: null })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
          <AlertDialogDescription>You have unsaved changes on this page. If you leave now, they will be lost.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              const target = leavingTo
              update({ dirty: false, leavingTo: null })
              if (target) router.push(target)
            }}
          >
            Discard changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function UnsavedIndicator({ dirty }: { dirty: boolean }) {
  if (!dirty) return null
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      Unsaved changes
    </span>
  )
}
