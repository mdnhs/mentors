export const CURRENCY = "BDT"
export const PLATFORM_FEE_RATE = 0.05
// Placeholder rate until the business confirms the mentor commission.
export const MENTOR_COMMISSION_RATE = 0.1
const MAX_BASE = 1_000_000

export type Quote = {
  currency: string
  base: number
  platformFee: number
  // What the learner pays: base price plus the platform fee.
  total: number
  mentorCommission: number
  mentorEarnings: number
  // Platform fee plus mentor commission; mentorEarnings + platformRevenue always equals total.
  platformRevenue: number
}

export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= MAX_BASE
}

// Amounts are whole units of the currency, so rounding happens once per component and never accumulates.
export function quote(base: number, currency = CURRENCY): Quote {
  if (!isValidAmount(base)) throw new RangeError(`Invalid price: ${String(base)}`)
  const platformFee = Math.round(base * PLATFORM_FEE_RATE)
  const mentorCommission = Math.round(base * MENTOR_COMMISSION_RATE)
  return {
    currency,
    base,
    platformFee,
    total: base + platformFee,
    mentorCommission,
    mentorEarnings: base - mentorCommission,
    platformRevenue: platformFee + mentorCommission,
  }
}

export function refundAmount(total: number, percent: number) {
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw new RangeError(`Invalid refund percent: ${percent}`)
  return Math.round((total * percent) / 100)
}
