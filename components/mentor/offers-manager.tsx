"use client"

import Link from "next/link"
import { useState } from "react"
import { PlusIcon } from "lucide-react"

import { OfferPreviewCard } from "@/components/mentor/offer-preview"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { offerIcons, offerMeta } from "@/components/mentors/offer-meta"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { offerTypeLabels } from "@/lib/categories"
import { getSession } from "@/lib/data"
import { formatPrice } from "@/lib/format"
import { canMove, statusLabels } from "@/lib/offer-management"
import { saveOffer } from "@/lib/store"
import type { Offer, OfferStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusTone: Record<OfferStatus, string> = {
  published: "bg-success-soft text-success",
  paused: "bg-warning-soft text-warning",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-muted text-muted-foreground",
}

const order: OfferStatus[] = ["published", "paused", "draft", "archived"]

export function OffersManager() {
  const { actor, mentor, state } = useMentorWorkspace()
  const [error, setError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState<Offer | null>(null)
  const sorted = [...mentor.offers].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))

  const move = (offer: Offer, status: OfferStatus) => {
    const result = saveOffer(actor, { kind: "status", id: offer.id, status })
    setError(result.ok ? null : `${offer.title}: ${result.message}`)
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-subheading">Your offers</h2>
          <p className="text-sm text-muted-foreground">Only live offers appear on your public profile.</p>
        </div>
        <Link href="/dashboard/mentor/offers/new" className={buttonVariants()}>
          <PlusIcon aria-hidden="true" />
          New offer
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {sorted.map((offer) => {
          const Icon = offerIcons[offer.type]
          const session = offer.type === "group" ? getSession(offer.sessionId) : undefined
          const seats = session ? (state.sessionCapacity[session.id] ?? session.seats.total) : undefined
          return (
            <li key={offer.id} className={cn("surface p-4", (offer.status === "archived" || offer.status === "paused") && "opacity-80")}>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="leading-snug font-medium">{offer.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {offerTypeLabels[offer.type]} · {offerMeta(offer)}
                    {seats !== undefined && ` · ${seats} seats`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(offer.price)}</p>
                  <span className={cn("mt-1 inline-block rounded-md px-2 py-0.5 text-xs font-medium", statusTone[offer.status])}>{statusLabels[offer.status]}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 pl-12">
                {offer.status !== "archived" && (
                  <Link href={`/dashboard/mentor/offers/${offer.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Edit<span className="sr-only"> {offer.title}</span>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={() => setPreviewing(offer)}>
                  Preview<span className="sr-only"> {offer.title}</span>
                </Button>
                {canMove(offer.status, "published") && (
                  <Button size="sm" onClick={() => move(offer, "published")}>
                    {offer.status === "paused" ? "Resume" : "Publish"}
                    <span className="sr-only"> {offer.title}</span>
                  </Button>
                )}
                {canMove(offer.status, "paused") && (
                  <Button variant="outline" size="sm" onClick={() => move(offer, "paused")}>
                    Pause<span className="sr-only"> {offer.title}</span>
                  </Button>
                )}
                {canMove(offer.status, "archived") && (
                  <Button variant="ghost" size="sm" onClick={() => move(offer, "archived")}>
                    Archive<span className="sr-only"> {offer.title}</span>
                  </Button>
                )}
                {canMove(offer.status, "draft") && (
                  <Button variant="outline" size="sm" onClick={() => move(offer, "draft")}>
                    Restore<span className="sr-only"> {offer.title}</span>
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={Boolean(previewing)} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="max-h-dvh overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Public preview</DialogTitle>
            <DialogDescription>How learners see this offer on your profile. {previewing && previewing.status !== "published" && "It isn't live yet."}</DialogDescription>
          </DialogHeader>
          {previewing && <OfferPreviewCard mentor={mentor} offer={previewing} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
