export type Severity = 'GREEN' | 'AMBER' | 'RED' | 'CRITICAL'

export interface RriScore {
  id: string
  zone_id: string
  date: string
  bloom_probability: number
  rri_score: number
  severity_tier: Severity
  wind_speed: number | null
  wind_direction: number | null
  wave_height: number | null
  chl_a_mean: number | null
  rri_consecutive_days: number | null
  bloom_duration_days: number | null
  created_at: string
}

export interface HospitalSurgeForecast {
  id: string
  hospital_id: string
  forecast_date: string
  expected_total_admissions: number
  expected_additional_vs_baseline: number
  severity_tier: 'LOW' | 'MODERATE' | 'HIGH SURGE'
  recommended_extra_nursing_shifts: number
  recommended_medication_stock_eur: number
  confidence_interval_low: number
  confidence_interval_high: number
  created_at: string
}

export interface SensorReading {
  id: string
  sensor_id: string
  timestamp: string
  water_temperature: number | null
  ph: number | null
  humidity: number | null
  conductivity: number | null
  dissolved_oxygen: number | null
  nitrate: number | null
  phosphate: number | null
}

export interface TriggerEvent {
  id: string
  event_certificate_id: string
  hospital_id: string
  triggered_at: string
  trigger_fired: boolean
  rri_score: number
  rri_consecutive_days: number
  payout_tier: 'CRITICAL' | 'RED' | 'AMBER' | 'NONE'
  payout_eur: number
  status: 'PENDING' | 'PAID' | 'DISPUTED'
}
