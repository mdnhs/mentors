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
  } catch {}
  notify()
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
