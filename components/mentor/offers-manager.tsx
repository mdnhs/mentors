"use client"

import Link from "next/link"
import { useState } from "react"
import { EllipsisIcon, LayersIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { OfferPreviewCard } from "@/components/mentor/offer-preview"
import { useMentorWorkspace } from "@/components/mentor/use-mentor-workspace"
import { offerIcons, offerMeta, priceUnits } from "@/components/mentors/offer-meta"
import { PageHeader, Panel, PortalEmpty } from "@/components/portal/ui"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { offerTypeLabels } from "@/lib/categories"
import { getSession } from "@/lib/data"
import { formatPrice } from "@/lib/format"
import { bookingsPerOffer } from "@/lib/mentor-insights"
import { canMove, statusLabels } from "@/lib/offer-management"
import { saveOffer } from "@/lib/store"
import type { Offer, OfferStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusTone: Record<OfferStatus, "success" | "warning" | "neutral"> = {
  published: "success",
  paused: "warning",
  draft: "neutral",
  archived: "neutral",
}

const order: OfferStatus[] = ["published", "paused", "draft", "archived"]

const moveToast: Record<OfferStatus, string> = {
  published: "is live on your profile",
  paused: "is paused and hidden from learners",
  archived: "is archived",
  draft: "is back as a draft",
}

export function OffersManager() {
  const { actor, mentor, state, now, bookings } = useMentorWorkspace()
  const [previewing, setPreviewing] = useState<Offer | null>(null)
  const sorted = [...mentor.offers].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status))
  const counts = now ? bookingsPerOffer(bookings, now) : {}

  const move = (offer: Offer, status: OfferStatus) => {
    const result = saveOffer(actor, { kind: "status", id: offer.id, status })
    if (result.ok) toast.success(`${offer.title} ${moveToast[status]}`)
    else toast.error(`${offer.title}: ${result.message}`)
  }

  return (
    <div>
      <PageHeader
        title="Offers"
        description="Only live offers appear on your public profile."
        actions={
          <Link href="/dashboard/mentor/offers/new" className={buttonVariants()}>
            <PlusIcon aria-hidden="true" />
            New offer
          </Link>
        }
      />

      <Panel bodyClassName="py-1">
        {sorted.length > 0 ? (
          <ul aria-label="Your offers" className="divide-y">
            {sorted.map((offer) => {
              const Icon = offerIcons[offer.type]
              const session = offer.type === "group" ? getSession(offer.sessionId) : undefined
              const seats = session ? (state.sessionCapacity[session.id] ?? session.seats.total) : undefined
              const booked = counts[offer.id] ?? 0
              const muted = offer.status === "archived" || offer.status === "paused"
              const moves = (
                [
                  ["published", offer.status === "paused" ? "Resume" : "Publish"],
                  ["paused", "Pause"],
                  ["draft", "Restore"],
                  ["archived", "Archive"],
                ] as const
              ).filter(([status]) => canMove(offer.status, status))

              return (
                <li key={offer.id} className="flex items-center gap-3 py-4 sm:gap-4">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", muted ? "bg-muted text-muted-foreground" : "bg-accent text-primary")}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={cn("leading-snug font-medium", muted && "text-muted-foreground")}>{offer.title}</p>
                      <Badge tone={statusTone[offer.status]}>{statusLabels[offer.status]}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground tabular-nums">
                      {offerTypeLabels[offer.type]}, {seats !== undefined ? `${seats} seats` : offerMeta(offer)}
                      <span className="ml-3 font-medium text-foreground sm:hidden">{formatPrice(offer.price)}</span>
                      {booked > 0 && <span className="ml-3">{booked} booked</span>}
                    </p>
                  </div>
                  <p className="hidden shrink-0 text-right font-semibold tabular-nums sm:block">
                    {formatPrice(offer.price)}
                    {priceUnits[offer.type] && <span className="block text-xs font-normal text-muted-foreground">{priceUnits[offer.type]}</span>}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {offer.status !== "archived" && (
                      <Link href={`/dashboard/mentor/offers/${offer.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Edit<span className="sr-only"> {offer.title}</span>
                      </Link>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`More actions for ${offer.title}`} />}>
                        <EllipsisIcon aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setPreviewing(offer)}>Preview</DropdownMenuItem>
                        {moves.length > 0 && <DropdownMenuSeparator />}
                        {moves.map(([status, label]) => (
                          <DropdownMenuItem key={status} onClick={() => move(offer, status)}>
                            {label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <PortalEmpty icon={LayersIcon} title="No offers yet" description="Create one so learners can book you.">
            <Link href="/dashboard/mentor/offers/new" className={buttonVariants()}>
              New offer
            </Link>
          </PortalEmpty>
        )}
      </Panel>

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
