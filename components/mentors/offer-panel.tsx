"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarOffIcon, CheckIcon } from "lucide-react"

import { offerFacts, offerIcons, offerMeta, priceUnits } from "@/components/mentors/offer-meta"
import { Button, buttonVariants } from "@/components/ui/button"
import { offerTypeLabels } from "@/lib/categories"
import { formatPrice } from "@/lib/format"
import { cancellationTerms, getOfferAvailability, getPublishedOffers, offerActionLabels, offerHref } from "@/lib/offers"
import type { Mentor } from "@/lib/types"
import { cn } from "@/lib/utils"

export function OfferPanel({ mentor }: { mentor: Mentor }) {
  const firstName = mentor.name.split(" ")[0]
  const offers = getPublishedOffers(mentor).map((offer) => ({ offer, availability: getOfferAvailability(mentor, offer, new Date()) }))
  const [selectedId, setSelectedId] = useState(() => (offers.find((item) => item.availability.bookable) ?? offers[0])?.offer.id)

  if (offers.length === 0) {
    return (
      <section id="offers" aria-labelledby="offers-title" className="scroll-mt-24 surface p-5 text-center shadow-card">
        <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <CalendarOffIcon className="size-5" aria-hidden="true" />
        </span>
        <h2 id="offers-title" className="mt-3 font-semibold">
          {firstName} isn&apos;t taking bookings right now
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Save their profile to check back later.</p>
        <Link href="/mentors" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
          Find another mentor
        </Link>
      </section>
    )
  }

  const selected = offers.find((item) => item.offer.id === selectedId) ?? offers[0]
  const { offer, availability } = selected
  const unit = priceUnits[offer.type]

  return (
    <section id="offers" aria-labelledby="offers-title" className="scroll-mt-24 surface p-4 shadow-card sm:p-5">
      <h2 id="offers-title" className="font-semibold">
        Ways to learn with {firstName}
      </h2>

      <div role="radiogroup" aria-labelledby="offers-title" className="mt-4 space-y-2">
        {offers.map(({ offer: item, availability: itemAvailability }) => {
          const Icon = offerIcons[item.type]
          const itemUnit = priceUnits[item.type]
          return (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:border-foreground/20 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="offer"
                value={item.id}
                checked={item.id === offer.id}
                onChange={() => setSelectedId(item.id)}
                className="sr-only"
              />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug font-medium">{item.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {offerTypeLabels[item.type]} · {itemAvailability.bookable ? offerMeta(item) : "Unavailable"}
                </span>
              </span>
              <span className={cn("text-right text-sm font-semibold", !itemAvailability.bookable && "text-muted-foreground")}>
                {formatPrice(item.price)}
                {itemUnit && <span className="block text-xs font-normal text-muted-foreground">{itemUnit}</span>}
              </span>
            </label>
          )
        })}
      </div>

      <div className="mt-5 border-t pt-4" aria-live="polite">
        <p className="text-sm">{offer.description}</p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground" aria-label="Details">
          {offerFacts(mentor, offer).map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-2">
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
        <ul className="mt-3 space-y-1.5 text-sm" aria-label="What's included">
          {offer.includes.map((item) => (
            <li key={item} className="flex gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {availability.bookable ? (
        <Link href={offerHref(mentor, offer)} className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}>
          {offerActionLabels[offer.type]} · {formatPrice(offer.price)}
          {unit && <span className="font-normal opacity-80"> {unit}</span>}
        </Link>
      ) : (
        <>
          <Button size="lg" disabled className="mt-5 w-full">
            Not available
          </Button>
          <p className="mt-2 text-center text-sm text-muted-foreground">{availability.reason}</p>
        </>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{cancellationTerms[offer.cancellation]}</p>
    </section>
  )
}
