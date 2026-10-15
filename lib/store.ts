"use client"

import { useSyncExternalStore } from "react"

import { demoBookings, demoSavedMentors } from "@/lib/data/bookings"
import type { Booking } from "@/lib/types"

type State = { saved: string[]; bookings: Booking[] }

const STORAGE_KEY = "mentorbridge:v1"
const initialState: State = { saved: demoSavedMentors, bookings: demoBookings }

let state = initialState
let hydrated = false
const listeners = new Set<() => void>()

function readStorage() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) state = { ...initialState, ...JSON.parse(raw) }
  } catch {
    state = initialState
  }
}

function setState(next: State) {
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  readStorage()
  return state
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initialState)
}

export function toggleSaved(slug: string) {
  const saved = state.saved.includes(slug)
    ? state.saved.filter((item) => item !== slug)
    : [...state.saved, slug]
  setState({ ...state, saved })
}

export function createBookingId() {
  return `MB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function addBooking(booking: Booking) {
  setState({ ...state, bookings: [booking, ...state.bookings] })
}

const SEARCH_KEY = "mentorbridge:mentor-search"

function readSearch() {
  try {
    return window.sessionStorage.getItem(SEARCH_KEY) ?? ""
  } catch {
    return ""
  }
}

export function rememberMentorSearch(query: string) {
  if (query === readSearch()) return
  try {
    window.sessionStorage.setItem(SEARCH_KEY, query)
  } catch {}
  listeners.forEach((listener) => listener())
}

export function useMentorsHref() {
  const query = useSyncExternalStore(subscribe, readSearch, () => "")
  return query ? `/mentors?${query}` : "/mentors"
}

const noop = () => () => {}

export function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false)
}
