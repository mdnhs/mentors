"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { CheckIcon, InfoIcon } from "lucide-react"
import { toast } from "sonner"

import { contactErrors } from "@/components/checkout/checkout-parts"
import { clearSampleDataWithUndo } from "@/components/dashboard/clear-sample-data"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { signOut } from "@/lib/auth"
import { timezoneLabel } from "@/lib/format"
import { zonePickerOptions } from "@/lib/timezones-list"
import { resetDemoData, saveProfile, setNotification, useAppState, useIsClient } from "@/lib/store"
import type { NotificationPrefs } from "@/lib/types"

// Each switch only shows or hides a dashboard section; nothing is sent, so `tips` (which drives nothing) isn't offered.
const activityOptions: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "reminders", label: "Get-ready reminders", hint: "Show a “get ready” step in Next steps when a session is less than 48 hours away." },
  { key: "bookingUpdates", label: "Recent activity", hint: "Show confirmations, changes and refunds in a Recent activity list." },
  { key: "mentorActivity", label: "Mentor updates", hint: "Show open live sessions from mentors you've saved or booked." },
]

export function SettingsPanel() {
  const { profile, notifications, bookings } = useAppState()
  const isClient = useIsClient()
  const router = useRouter()
  const [draft, setDraft] = useState(profile)
  const [saved, setSaved] = useState(false)
  const errors = contactErrors(draft)
  const dirty = draft.name !== profile.name || draft.email !== profile.email || draft.timezone !== profile.timezone
  const zones = zonePickerOptions([profile.timezone, ...(isClient ? [Intl.DateTimeFormat().resolvedOptions().timeZone] : [])]).map((zone) => ({
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
            <Input id="profile-name" autoComplete="name" value={draft.name} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "profile-name-error" : undefined} onChange={(event) => { setSaved(false); setDraft({ ...draft, name: event.target.value }) }} />
            {errors.name && (
              <p id="profile-name-error" className="text-sm text-destructive">
                {errors.name}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" type="email" autoComplete="email" value={draft.email} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "profile-email-error" : undefined} onChange={(event) => { setSaved(false); setDraft({ ...draft, email: event.target.value }) }} />
            {errors.email && (
              <p id="profile-email-error" className="text-sm text-destructive">
                {errors.email}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="profile-timezone">Timezone</Label>
            <select id="profile-timezone" value={draft.timezone} onChange={(event) => { setSaved(false); setDraft({ ...draft, timezone: event.target.value }) }} className="h-10 w-full rounded-lg border bg-card px-3 text-sm focus-ring sm:w-72">
              {zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
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

      <section aria-labelledby="dashboard-activity" className="surface p-4 sm:p-5">
        <h2 id="dashboard-activity" className="text-subheading">
          Dashboard activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose what appears on your dashboard. These don&apos;t send emails or notifications.</p>
        <ul className="mt-3 divide-y">
          {activityOptions.map((option) => (
            <li key={option.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <Label htmlFor={`notify-${option.key}`} className="text-sm font-medium">
                  {option.label}
                </Label>
                <p id={`notify-${option.key}-hint`} className="text-sm text-muted-foreground">
                  {option.hint}
                </p>
              </div>
              <Switch id={`notify-${option.key}`} aria-describedby={`notify-${option.key}-hint`} checked={notifications[option.key]} onCheckedChange={(checked) => setNotification(option.key, checked)} />
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
            <Button variant="outline" onClick={clearSampleDataWithUndo}>
              Clear sample data
            </Button>
          )}
          <ConfirmAction
            trigger={<Button variant="outline">Reset demo data</Button>}
            title="Reset all demo data?"
            description="This puts every booking, payment, note, saved mentor, application and setting in this browser back to the original demo. Anything you've added or changed is lost, and it can't be undone."
            confirmLabel="Reset demo data"
            busyLabel="Resetting…"
            cancelLabel="Keep my data"
            destructive
            onConfirm={() => {
              resetDemoData()
              toast.success("Demo data reset")
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              signOut()
              toast.success("Logged out")
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
