"use client"

import Link from "next/link"
import { useState } from "react"

import { BookingRow } from "@/components/dashboard/booking-row"
import { offerIcons, offerMeta } from "@/components/mentors/offer-meta"
import { SeatsMeter } from "@/components/sessions/seats-meter"
import { DateBlock } from "@/components/sessions/date-block"
import { Switch } from "@/components/ui/switch"
import { getMentorSessions } from "@/lib/data"
import { formatPrice, formatTime } from "@/lib/format"
import { site } from "@/lib/site"
import { useAppState } from "@/lib/store"
import type { Mentor } from "@/lib/types"
import { cn } from "@/lib/utils"

export function MentorDashboard({ mentor }: { mentor: Mentor }) {
  const { bookings } = useAppState()
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(mentor.offers.map((offer) => [offer.id, offer.status === "published"]))
  )

  const upcoming = [
    ...getMentorSessions(mentor.slug).map((session) => ({ date: session.startsAt, session })),
    ...bookings
      .filter((booking) => booking.mentorSlug === mentor.slug && booking.kind !== "group" && booking.status !== "completed")
      .map((booking) => ({ date: booking.date, booking })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-5">
      <section aria-labelledby="mentor-upcoming" className="lg:col-span-3">
        <h2 id="mentor-upcoming" className="text-subheading">
          Upcoming
        </h2>
        <ul className="mt-4 divide-y surface">
          {upcoming.map((item) =>
            "session" in item ? (
              <li key={item.session.id} className="flex items-center gap-4 p-4">
                <DateBlock iso={item.session.startsAt} />
                <div className="min-w-0 flex-1">
                  <Link href={`/sessions/${item.session.id}`} className="font-medium hover:underline">
                    {item.session.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">Group session · {formatTime(item.session.startsAt)}</p>
                  {item.session.seats && <SeatsMeter seats={item.session.seats} className="mt-2 max-w-xs" />}
                </div>
              </li>
            ) : (
              <BookingRow key={item.booking.id} booking={item.booking} person={{ name: site.learner.name, photo: site.learner.photo }} />
            )
          )}
          {upcoming.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No upcoming sessions yet.</li>}
        </ul>
      </section>

      <section aria-labelledby="mentor-offers" className="lg:col-span-2">
        <h2 id="mentor-offers" className="text-subheading">
          Your offers
        </h2>
        <ul className="mt-4 space-y-2">
          {mentor.offers.map((offer) => {
            const Icon = offerIcons[offer.type]
            const isVisible = visible[offer.id]
            return (
              <li key={offer.id} className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 transition", !isVisible && "opacity-60")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-medium">{offer.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(offer.price)} · {offerMeta(offer)}
                  </p>
                </div>
                <Switch
                  checked={isVisible}
                  onCheckedChange={(checked) => setVisible((current) => ({ ...current, [offer.id]: checked }))}
                  aria-label={`Show ${offer.title} on your profile`}
                />
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Hidden offers stay saved but won&apos;t appear on your profile. Demo only.</p>
      </section>
    </div>
  )
}
