"use client"

import { useSyncExternalStore } from "react"

import type { Principal, Role } from "@/lib/permissions"

// No real authentication exists. This simulated sign-in only gates the demo screens in this browser
// and protects nothing; real access control needs server-side sessions.
const KEY = "mentorbridge:session"

export type DemoSession = { email: string; role: Role }
export type AuthState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; session: DemoSession }

const loading: AuthState = { status: "loading" }
const signedOut: AuthState = { status: "signed-out" }
const listeners = new Set<() => void>()
let cache: { raw: string | null; value: AuthState } | null = null

function read(): AuthState {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {}
  if (cache && cache.raw === raw) return cache.value
  let value: AuthState = signedOut
  try {
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed.email === "string") {
      const role: Role = parsed.role === "mentor" || parsed.role === "reviewer" || parsed.role === "admin" ? parsed.role : "learner"
      value = { status: "signed-in", session: { email: parsed.email, role } }
    }
  } catch {}
  cache = { raw, value }
  return value
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function signIn(email: string, role: Role = "learner") {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ email, role }))
  } catch {
    return false
  }
  notify()
  return true
}

export function signOut() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {}
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, read, () => loading)
}

export function usePrincipal(): Principal | null {
  const auth = useAuth()
  return auth.status === "signed-in" ? { role: auth.session.role, email: auth.session.email } : null
}

export const workspaces: Record<Role, { href: string; label: string }> = {
  learner: { href: "/dashboard", label: "My sessions" },
  mentor: { href: "/dashboard/mentor", label: "Mentor workspace" },
  reviewer: { href: "/dashboard/reviewer", label: "Review queue" },
  admin: { href: "/dashboard/admin", label: "Admin" },
}

export const homeFor = (role: Role) => workspaces[role].href

// Only same-site paths, so a `next` parameter can't be used to bounce someone elsewhere.
// Browsers read a backslash as "/" and drop tabs and newlines, so those could still point off-site.
export function safeNext(next: string | null | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !/[\\\s]/.test(next) ? next : fallback
}

// Workspace pages belong to one role; following `next` into another role's area would land on an access wall.
function ownerOf(path: string): Role | null {
  const pathname = path.split(/[?#]/)[0]
  const under = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  if (under("/dashboard/admin")) return "admin"
  if (under("/dashboard/mentor")) return "mentor"
  if (under("/dashboard/reviewer")) return "reviewer"
  if (pathname === "/dashboard" || under("/dashboard/bookings") || under("/dashboard/saved")) return "learner"
  return null
}

export function landingFor(role: Role, next: string | null | undefined) {
  const home = homeFor(role)
  const target = safeNext(next, home)
  const owner = ownerOf(target)
  return owner && owner !== role ? home : target
}
