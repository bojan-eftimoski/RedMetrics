/** Mirrors models/stage4_insurance_loss/payout.py for client-side simulation. */

export type PayoutTier = 'CRITICAL' | 'RED' | 'AMBER' | 'NONE'

const TIER_PCT: Record<PayoutTier, number> = {
  CRITICAL: 1.0,
  RED: 0.75,
  AMBER: 0.25,
  NONE: 0,
}

const SURGE_RATIO_PER_RRI = 0.0064 // ≈ 54% surge at RRI 85
const SURGE_COST_PER_ADMISSION_EUR = 850
const PAYOUT_CAP_MULTIPLIER = 1.2
const BASELINE_ADMISSIONS_PER_DAY = 14

function tier(rri: number, days: number): PayoutTier {
  if (rri > 85 && days >= 7) return 'CRITICAL'
  if (rri > 70 && days >= 5) return 'RED'
  if (rri > 60 && days >= 3) return 'AMBER'
  return 'NONE'
}

export interface PayoutResult {
  tier: PayoutTier
  payout_eur: number
  expected_surge_admissions: number
  expected_surge_cost_eur: number
  cap_eur: number
  insured_daily_cost_eur: number
  bloom_duration_days: number
  rri_score: number
}

export function calculatePayout(args: {
  rri: number
  bloomDays: number
  insuredDailyCostEur: number
}): PayoutResult {
  const t = tier(args.rri, args.bloomDays)
  const surgeFraction = Math.min(args.rri, 100) * SURGE_RATIO_PER_RRI
  const expectedSurgeAdmissions = surgeFraction * BASELINE_ADMISSIONS_PER_DAY * Math.max(args.bloomDays, 1)
  const expectedSurgeCost = expectedSurgeAdmissions * SURGE_COST_PER_ADMISSION_EUR
  const cap = expectedSurgeCost * PAYOUT_CAP_MULTIPLIER
  const rawPayout = TIER_PCT[t] * args.insuredDailyCostEur * Math.max(args.bloomDays, 1)
  const payout = Math.min(rawPayout, cap)
  return {
    tier: t,
    payout_eur: Math.round(payout),
    expected_surge_admissions: Math.round(expectedSurgeAdmissions * 10) / 10,
    expected_surge_cost_eur: Math.round(expectedSurgeCost),
    cap_eur: Math.round(cap),
    insured_daily_cost_eur: args.insuredDailyCostEur,
    bloom_duration_days: args.bloomDays,
    rri_score: args.rri,
  }
}

const TIER_COLOR: Record<PayoutTier, string> = {
  CRITICAL: '#7f1d1d',
  RED: '#dc2626',
  AMBER: '#d97706',
  NONE: '#16a34a',
}

export function tierColor(t: PayoutTier): string { return TIER_COLOR[t] }