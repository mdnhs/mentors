"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckIcon, InfoIcon } from "lucide-react"

import { contactErrors } from "@/components/checkout/checkout-parts"
import { FilterSelect } from "@/components/filters/filter-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { signOut } from "@/lib/auth"
import { DHAKA_TZ, timezoneLabel } from "@/lib/format"
import { clearSampleData, resetDemoData, saveProfile, setNotification, useAppState, useIsClient } from "@/lib/store"
import type { NotificationPrefs } from "@/lib/types"

const notificationOptions: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "reminders", label: "Session reminders", hint: "A nudge before each session starts." },
  { key: "bookingUpdates", label: "Booking and payment updates", hint: "Confirmations, changes and refunds." },
  { key: "mentorActivity", label: "Mentor activity", hint: "New live sessions from mentors you follow." },
  { key: "tips", label: "Tips and offers", hint: "Occasional guidance. Off by default." },
]

export function SettingsPanel() {
  const { profile, notifications, bookings } = useAppState()
  const isClient = useIsClient()
  const router = useRouter()
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const errors = contactErrors(draft)
  const dirty = draft.name !== profile.name || draft.email !== profile.email || draft.timezone !== profile.timezone
  const zones = [...new Set([profile.timezone, DHAKA_TZ, ...(isClient ? [Intl.DateTimeFormat().resolvedOptions().timeZone] : [])])].map((zone) => ({
    value: zone,
    label: timezoneLabel(zone, new Date("2026-01-01T00:00:00Z")),
  }))

  return (
    <div className="mt-6 max-w-2xl space-y-8">
      <p role="note" className="flex gap-2.5 rounded-xl bg-warning-soft p-3 text-sm text-warning ring-1 ring-warning/20">
        <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium">Demo settings.</span> They are saved only in this browser. No emails or messages are sent; the switches control which activity shows on your dashboard.
        </span>
      </p>

      <section aria-labelledby="account" className="surface p-4 sm:p-5">
        <h2 id="account" className="text-subheading">
          Account
        </h2>
        <form
          className="mt-4 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (errors.name || errors.email) return
            saveProfile({ ...draft, name: draft.name.trim(), email: draft.email.trim() })
            setSaved(true)
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="profile-name">Full name</Label>
            <Input id="profile-name" autoComplete="name" value={draft.name} aria-invalid={errors.name ? true : undefined} onChange={(event) => { setSaved(false); setDraft({ ...draft, name: event.target.value }) }} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" autoComplete="email" value={draft.email} aria-invalid={errors.email ? true : undefined} onChange={(event) => { setSaved(false); setDraft({ ...draft, email: event.target.value }) }} />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label>Timezone</Label>
            <FilterSelect label="Timezone" value={draft.timezone} options={zones} onChange={(timezone) => { setSaved(false); setDraft({ ...draft, timezone }) }} className="w-full sm:w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!dirty || Boolean(errors.name || errors.email)}>
              Save changes
            </Button>
            {saved && (
              <span role="status" className="flex items-center gap-1.5 text-sm text-success">
                <CheckIcon className="size-4" aria-hidden="true" />
                Saved
              </span>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="notifications" className="surface p-4 sm:p-5">
        <h2 id="notifications" className="text-subheading">
          Notifications
        </h2>
        <ul className="mt-3 divide-y">
          {notificationOptions.map((option) => (
            <li key={option.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <Label htmlFor={`notify-${option.key}`} className="text-sm font-medium">
                  {option.label}
                </Label>
                <p className="text-sm text-muted-foreground">{option.hint}</p>
              </div>
              <Switch id={`notify-${option.key}`} checked={notifications[option.key]} onCheckedChange={(checked) => setNotification(option.key, checked)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="data" className="surface p-4 sm:p-5">
        <h2 id="data" className="text-subheading">
          Demo data &amp; session
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {bookings.some((booking) => booking.sample) && (
            <Button variant="outline" onClick={clearSampleData}>
              Clear sample data
            </Button>
          )}
          <Button variant="outline" onClick={resetDemoData}>
            Reset demo data
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              signOut()
              router.push("/login")
            }}
          >
            Log out
          </Button>
        </div>
      </section>
    </div>
  )
}
