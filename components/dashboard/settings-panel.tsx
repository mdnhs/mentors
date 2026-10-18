"use client"

import { useRouter } from "next/navigation"
import { useState, type ReactNode } from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { contactErrors } from "@/components/checkout/checkout-parts"
import { clearSampleDataWithUndo } from "@/components/dashboard/clear-sample-data"
import { PageHeader } from "@/components/portal/ui"
import { ConfirmAction } from "@/components/site/confirm-action"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { signOut, useAuth } from "@/lib/auth"
import { timezoneCity, timezoneLabel } from "@/lib/format"
import { roleLabels } from "@/lib/site"
import { zonePickerOptions } from "@/lib/timezones-list"
import { resetDemoData, saveProfile, setNotification, useAppState, useIsClient } from "@/lib/store"
import type { NotificationPrefs } from "@/lib/types"

// Each switch only shows or hides a workspace section; nothing is sent, so `tips` (which drives nothing) isn't offered.
const activityOptions: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "reminders", label: "Get-ready reminders", hint: "A nudge in Up next 48 hours before a session." },
  { key: "bookingUpdates", label: "Recent activity", hint: "Payments and refunds on your overview." },
  { key: "mentorActivity", label: "Mentor updates", hint: "Live sessions from mentors you follow, on Saved mentors." },
]

export function SettingsPanel() {
  const { profile, notifications, bookings } = useAppState()
  const auth = useAuth()
  const isClient = useIsClient()
  const router = useRouter()
  const [draft, setDraft] = useState({ name: profile.name, email: profile.email })
  const [saved, setSaved] = useState(false)
  const errors = contactErrors(draft)
  const dirty = draft.name !== profile.name || draft.email !== profile.email
  const hasSamples = bookings.some((booking) => booking.sample)
  const zones = zonePickerOptions([profile.timezone, ...(isClient ? [Intl.DateTimeFormat().resolvedOptions().timeZone] : [])]).map((zone) => ({
    value: zone,
    label: timezoneLabel(zone, new Date("2026-01-01T00:00:00Z")),
  }))

  const edit = (change: Partial<typeof draft>) => {
    setSaved(false)
    setDraft({ ...draft, ...change })
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="divide-y">
        <Section id="profile" title="Profile" help="How mentors see you on bookings.">
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (errors.name || errors.email) return
              saveProfile({ ...profile, name: draft.name.trim(), email: draft.email.trim() })
              setSaved(true)
              toast.success("Profile saved")
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="profile-name">Full name</Label>
              <Input id="profile-name" autoComplete="name" value={draft.name} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? "profile-name-error" : undefined} onChange={(event) => edit({ name: event.target.value })} />
              {errors.name && (
                <p id="profile-name-error" className="text-sm text-destructive">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" type="email" autoComplete="email" value={draft.email} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? "profile-email-error" : undefined} onChange={(event) => edit({ email: event.target.value })} />
              {errors.email && (
                <p id="profile-email-error" className="text-sm text-destructive">
                  {errors.email}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 border-t pt-4">
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
        </Section>

        <Section id="preferences" title="Preferences" help="Every date and time follows this zone.">
          <div className="grid gap-1.5">
            <Label htmlFor="profile-timezone">Timezone</Label>
            <select
              id="profile-timezone"
              value={profile.timezone}
              onChange={(event) => {
                saveProfile({ ...profile, timezone: event.target.value })
                toast.success(`Times now show in ${timezoneCity(event.target.value)} time`)
              }}
              className="h-10 w-full rounded-lg border bg-card px-3 text-sm focus-ring sm:w-72"
            >
              {zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section id="dashboard-activity" title="Dashboard activity" help="Choose what shows in your workspace. Nothing is emailed or sent.">
          <ul className="-my-3 divide-y">
            {activityOptions.map((option) => (
              <li key={option.key} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <Label htmlFor={`notify-${option.key}`} className="text-sm font-medium">
                    {option.label}
                  </Label>
                  <p id={`notify-${option.key}-hint`} className="text-sm text-muted-foreground">
                    {option.hint}
                  </p>
                </div>
                <Switch
                  id={`notify-${option.key}`}
                  aria-describedby={`notify-${option.key}-hint`}
                  checked={notifications[option.key]}
                  onCheckedChange={(checked) => {
                    setNotification(option.key, checked)
                    toast.success(`${option.label} ${checked ? "on" : "off"}`)
                  }}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section id="demo-data" title="Demo data" help="Everything here lives only in this browser.">
          <ul className="-my-3 divide-y">
            <SettingRow title="Sample records" hint={hasSamples ? "Remove the made-up bookings and notes." : "No sample records left."}>
              {hasSamples && (
                <Button variant="outline" onClick={clearSampleDataWithUndo}>
                  Clear sample data
                </Button>
              )}
            </SettingRow>
            <SettingRow title="Start over" hint="Restore the original demo for every role.">
              <ConfirmAction
                trigger={
                  <Button variant="outline" className="text-destructive">
                    Reset demo data
                  </Button>
                }
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
            </SettingRow>
          </ul>
        </Section>

        <Section id="account" title="Account" help="Login is simulated in this demo.">
          <ul className="-my-3 divide-y">
            <SettingRow title={auth.status === "signed-in" ? auth.session.email : "Signed in"} hint={auth.status === "signed-in" ? `${roleLabels[auth.session.role]} account` : undefined}>
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
            </SettingRow>
          </ul>
        </Section>
      </div>
    </>
  )
}

function Section({ id, title, help, children }: { id: string; title: string; help: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 py-8 first:pt-0 lg:grid-cols-3 lg:gap-10">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{help}</p>
      </div>
      <div className="rounded-2xl border bg-card p-5 lg:col-span-2">{children}</div>
    </section>
  )
}

function SettingRow({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </li>
  )
}
