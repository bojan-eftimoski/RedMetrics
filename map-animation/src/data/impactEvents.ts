/**
 * Coastal impact events that fire as the bloom reaches the Genoa shore.
 *
 * Each event is anchored to a real lat/lon: a marker with a pulsing ring
 * drops on the map and a popup card slides in with the headline + stat. All
 * numbers are calibrated to the actual TideAlert pipeline (see
 * RedMetrics/models/) so the demo is defensible:
 *
 *   • Stage 3 (predict.py):
 *       BASELINE = 130 monthly admissions per hospital
 *       MODERATE_THRESHOLD = 60 additional → "HIGH SURGE" tier
 *       NURSING_PER_EXTRA_25 = 1 nursing shift per 25 extra patients
 *       EUR_PER_ADDITIONAL_PATIENT = €95 medication stock
 *
 *   • Stage 4 (payout.py + run_live_rri.py):
 *       Hospital daily operational costs:
 *         OSP_SAN_MARTINO  = €22,000 / day
 *         OSP_GALLIERA     = €16,000 / day
 *         OSP_VILLA_SCASSI = €12,000 / day
 *       RED tier (rri >70, days ≥5): 75% of daily cost × duration
 *       CRITICAL tier (rri >85, days ≥7): 100% of daily cost × duration
 *       Cap = surge_additional_admissions × €850 × 1.2
 *       Event certificate ID format: TA-{hospital_id}-{YYYYMMDDHHMM}
 *
 * Real-world consequence numbers (fish kills, tourism, fishery) are
 * order-of-magnitude estimates anchored to documented Ostreopsis ovata
 * outbreak literature (Mangialajo 2008, Brescianini 2006).
 */

export type ImpactKind =
  | 'rri_alert'
  | 'fish_kill'
  | 'hospital_surge'
  | 'trigger_fired'
  | 'beach_closed'
  | 'tourism'

export interface ImpactEvent {
  /** Seconds from sequence start when this event becomes active. */
  t: number
  /** [lon, lat] anchor on the map. */
  position: [number, number]
  kind: ImpactKind
  /** Short bold headline. */
  headline: string
  /** Big number / stat shown beneath. */
  stat: string
  /** Supporting line. */
  subline: string
}

export const DEFAULT_IMPACT_EVENTS: ImpactEvent[] = [
  // ─── Stage 1 + Stage 2 early warning ────────────────────────────────
  {
    t: 12,
    position: [8.99, 44.10], // offshore, where bloom is currently
    kind: 'rri_alert',
    headline: 'Stage 2 RRI threshold crossed',
    stat: 'RRI 74 · RED',
    subline: 'Bloom probability 0.91 · onshore wind 11.5 m/s · trigger countdown started',
  },
  // ─── Real-world marine impact ───────────────────────────────────────
  {
    t: 15,
    position: [8.85, 44.41], // Voltri / west Genoa
    kind: 'fish_kill',
    headline: 'Marine die-off · Voltri reserve',
    stat: '12,400+ fish',
    subline: 'Anchovy & bream stocks · matches 2005 Ostreopsis outbreak severity',
  },
  // ─── Stage 3 hospital surge forecast ────────────────────────────────
  {
    t: 18,
    position: [8.93, 44.41], // Genoa city / OSP_SAN_MARTINO area
    kind: 'hospital_surge',
    headline: 'Stage 3 surge · OSP_SAN_MARTINO',
    stat: '+87 vs baseline',
    subline: '217 admissions vs 130 baseline · HIGH SURGE · 4 extra nursing shifts',
  },
  // ─── Stage 4 parametric trigger fires ───────────────────────────────
  {
    t: 21,
    position: [8.93, 44.41], // San Martino
    kind: 'trigger_fired',
    headline: 'Stage 4 parametric trigger fired',
    stat: '€187,500 paid',
    subline: 'TA-OSP_SAN_MARTINO + GALLIERA + VILLA_SCASSI · RED tier (75%) × 5 days',
  },
  // ─── Public health response ────────────────────────────────────────
  {
    t: 24,
    position: [9.04, 44.40], // east Genoa / Nervi
    kind: 'beach_closed',
    headline: 'Beaches closed by ASL3',
    stat: '11 km coastline',
    subline: 'Nervi → Boccadasse · public health order #2024-71',
  },
  // ─── Economic impact ───────────────────────────────────────────────
  {
    t: 27,
    position: [9.20, 44.32], // Portofino / Cinque Terre direction
    kind: 'tourism',
    headline: 'Tourism cancellations · Cinque Terre',
    stat: '4,100 bookings',
    subline: '€2.3M direct loss · Portofino + Cinque Terre region · last 24h',
  },
]
