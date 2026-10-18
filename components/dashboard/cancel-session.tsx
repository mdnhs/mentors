"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cancelSessionAndRefund } from "@/lib/payment-client"
import type { Actor } from "@/lib/permissions"
import type { GroupSession } from "@/lib/types"

export function CancelSession({ session, actor }: { session: GroupSession; actor: Actor | null }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    if (busy) return
    setBusy(true)
    const outcome = await cancelSessionAndRefund(actor, session.id)
    setBusy(false)
    if (outcome.ok) setOpen(false)
    else setError(outcome.message)
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => { setError(null); setOpen(true) }}>
        Cancel session
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {session.title}?</DialogTitle>
            <DialogDescription>Everyone enrolled is refunded in full and new sign-ups close. Demo only: no real payments are involved.</DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep session
            </Button>
            <Button variant="destructive" disabled={busy} onClick={confirm}>
              {busy ? "Cancelling…" : "Cancel for everyone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
