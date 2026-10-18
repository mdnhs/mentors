import type { Order } from "@/lib/orders"
import type { PaymentEvent } from "@/lib/payment-service"

// No payment provider is integrated, so checkout runs against this stand-in. It plays the provider's
// part by emitting events; real money never moves. Replace it with a verified provider webhook.
export const paymentMode = "demo" as const

export function demoGatewayEvent(order: Order, type: PaymentEvent["type"]): PaymentEvent {
  const amount = type === "refund.succeeded" ? (order.refundAmount ?? 0) : order.quote.total
  return { id: `demo_evt_${Math.random().toString(36).slice(2, 12)}`, type, orderId: order.id, amount, currency: order.quote.currency }
}
