import { demoGatewayEvent } from "@/lib/demo-gateway"
import type { PaymentMethod } from "@/lib/orders"
import { applyPaymentEvent, beginPayment, cancelSession, cancelWithRefund, type PaymentEvent, type PaymentOutcome } from "@/lib/payment-service"
import type { Actor } from "@/lib/permissions"
import { transact } from "@/lib/store"

export type DemoResult = "success" | "failure"

const GATEWAY_DELAY_MS = 1200

const missing: PaymentOutcome = { ok: false, code: "order-not-found", message: "We couldn't find that order." }

type Scope = "learner" | "incoming"

function deliver(orderId: string, type: PaymentEvent["type"], scope: Scope = "learner") {
  return transact((current) => {
    const order = current.orders.find((item) => item.id === orderId)
    if (!order) return { ...current, outcome: missing }
    return applyPaymentEvent(current, demoGatewayEvent(order, type), new Date())
  }, scope)
}

// The order only moves to paid when the gateway's event is applied; nothing here trusts the click.
export async function payForOrder(orderId: string, method: PaymentMethod, result: DemoResult): Promise<PaymentOutcome> {
  const begun = await transact((current) => beginPayment(current, orderId, method, new Date()))
  if (!begun.ok || begun.duplicate) return begun
  await new Promise((resolve) => setTimeout(resolve, GATEWAY_DELAY_MS))
  return deliver(orderId, result === "success" ? "payment.succeeded" : "payment.failed")
}

export const settleDemoRefund = (orderId: string, scope: Scope = "learner") => deliver(orderId, "refund.succeeded", scope)

// The demo gateway has no record of a payment the learner walked away from, so it reports it as failed.
export const resetStalledPayment = (orderId: string) => deliver(orderId, "payment.failed")

export const cancelBookingWithRefund = (bookingId: string) => transact((current) => cancelWithRefund(current, bookingId, new Date()))

export async function cancelSessionAndRefund(sessionId: string) {
  const outcome = await transact((current) => cancelSession(current, sessionId, new Date()))
  if (outcome.ok) for (const orderId of outcome.refundOrderIds) await settleDemoRefund(orderId)
  return outcome
}

// A mentor cancelling one booking: the learner is refunded in full and the demo refund settles straight away.
export async function cancelBookingAsMentor(actor: Actor | null, bookingId: string, scope: Scope) {
  const outcome = await transact((current) => cancelWithRefund(current, bookingId, new Date(), actor), scope)
  if (outcome.ok && outcome.order?.status === "refund-pending") await settleDemoRefund(outcome.order.id, scope)
  return outcome
}
