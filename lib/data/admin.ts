import type { Dispute, SupportTicket } from "@/lib/admin"

// Made-up refund disputes and support tickets so the admin workspace has something to show. They point at
// the sample orders and are flagged `sample`; they are not real complaints and control nothing.

export const demoDisputes: Dispute[] = [
  {
    id: "DSP-1041",
    orderId: "ORD-IB-1",
    mentorSlug: "tanvir-rahman",
    learnerEmail: "anika.sample@example.com",
    amount: 3150,
    currency: "BDT",
    reason: "Learner says the mock interview was cut short and wants a partial refund.",
    status: "open",
    openedAt: "2026-10-09T10:20:00Z",
    sample: true,
  },
  {
    id: "DSP-1042",
    orderId: "ORD-IB-2",
    mentorSlug: "tanvir-rahman",
    learnerEmail: "imtiaz.sample@example.com",
    amount: 2100,
    currency: "BDT",
    reason: "Charged twice for the same career strategy call.",
    status: "investigating",
    openedAt: "2026-10-06T14:05:00Z",
    sample: true,
  },
  {
    id: "DSP-1043",
    orderId: "ORD-IB-3",
    mentorSlug: "tanvir-rahman",
    learnerEmail: "nabila.sample@example.com",
    amount: 3150,
    currency: "BDT",
    reason: "Mentor cancelled within 24 hours; learner asking for the full refund to be confirmed.",
    status: "refunded",
    openedAt: "2026-10-02T09:00:00Z",
    resolvedAt: "2026-10-03T11:30:00Z",
    note: "Mentor cancellation confirmed in the order history; refunded in full.",
    sample: true,
  },
]

export const demoTickets: SupportTicket[] = [
  { id: "TKT-2201", email: "rafi@example.com", subject: "Can't reschedule a confirmed session", status: "open", priority: "normal", updatedAt: "2026-10-17T08:12:00Z", sample: true },
  { id: "TKT-2202", email: "mim.sample@example.com", subject: "Application stuck in 'more information needed'", status: "pending", priority: "high", updatedAt: "2026-10-16T13:40:00Z", sample: true },
  { id: "TKT-2203", email: "rashed.sample@example.com", subject: "Update the email on my account", status: "closed", priority: "low", updatedAt: "2026-10-11T09:05:00Z", sample: true },
]
