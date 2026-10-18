import { ADMIN_FORBIDDEN, isAdmin, type Principal } from "@/lib/permissions"
import { cancelWithRefund, type PaymentOutcome } from "@/lib/payment-service"
import { settleDemoRefund } from "@/lib/payment-client"
import { logAdmin, transact } from "@/lib/store"

// Administrative actions that change bookings, refunds or payouts. Each one re-checks the caller, performs
// the change through the same commerce path the rest of the app uses, then records an audit line. These are
// demo actions: no money moves and no provider is contacted.

export type AdminActionResult = { ok: true; message: string } | { ok: false; message: string }

const forbidden: AdminActionResult = { ok: false, message: ADMIN_FORBIDDEN }

export async function adminCancelBooking(principal: Principal | null, bookingId: string, scope: "learner" | "incoming" = "learner"): Promise<AdminActionResult> {
  if (!isAdmin(principal)) return forbidden
  const outcome = await transact((current) => cancelWithRefund(current, bookingId, new Date()), scope)
  if (!outcome.ok) return { ok: false, message: outcome.message }
  const refunding = outcome.order?.status === "refund-pending"
  if (refunding && outcome.order) await settleDemoRefund(outcome.order.id, scope)
  logAdmin(principal, "booking-cancelled", bookingId, outcome.booking.refundPercent !== undefined ? `refund ${outcome.booking.refundPercent}%` : "no charge to refund")
  return { ok: true, message: refunding ? "Booking cancelled and refund started." : "Booking cancelled." }
}

export async function adminCompleteRefund(principal: Principal | null, orderId: string, scope: "learner" | "incoming" = "learner"): Promise<AdminActionResult> {
  if (!isAdmin(principal)) return forbidden
  const outcome: PaymentOutcome = await settleDemoRefund(orderId, scope)
  if (!outcome.ok) return { ok: false, message: outcome.message }
  logAdmin(principal, "refund-completed", orderId)
  return { ok: true, message: "Refund completed." }
}
