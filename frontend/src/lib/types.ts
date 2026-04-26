export type Severity = 'GREEN' | 'AMBER' | 'RED' | 'CRITICAL'
export type SurgeTier = 'LOW SURGE' | 'MODERATE SURGE' | 'HIGH SURGE'
export type TriggerStatus = 'PENDING' | 'PAID' | 'DISPUTED'

export interface RriScore {
  id: string
  zone_id: string
  date: string
  rri_score: number
  severity: Severity
  bloom_probability: number
  wind_speed: number | null
  wave_height: number | null
  chl_a_mean: number | null
  rri_consecutive_days: number | null
  created_at: string
}

export interface HospitalSurgeForecast {
  id: string
  hospital_id: string
  zone_id: string
  forecast_date: string
  generated_at: string
  expected_admissions: number
  additional_vs_baseline: number
  severity_tier: SurgeTier
  extra_nursing_shifts: number
  medication_stock_eur: number
  ci_low: number
  ci_high: number
}

export interface SensorReading {
  id: string
  sensor_id: string
  zone_id: string | null
  timestamp: string
  temperature_c: number | null
  ph: number | null
  humidity_pct: number | null
  conductivity_ms_cm: number | null
  dissolved_oxygen_mg_l: number | null
  nitrate_umol_l: number | null
  phosphate_umol_l: number | null
}

export interface TriggerEvent {
  id: string
  event_certificate_id: string
  zone_id: string | null
  hospital_id: string
  insurer_id: string
  triggered_at: string
  trigger_fired: boolean
  rri_condition_met: boolean
  iot_condition_met: boolean
  rri_score: number
  rri_days_above_threshold: number
  iot_dissolved_oxygen: number | null
  iot_ph: number | null
  payout_tier: 'CRITICAL' | 'RED' | 'AMBER' | 'NONE'
  payout_pct: number
  calculated_payout_eur: number
  bloom_duration_days: number
  status: TriggerStatus
}