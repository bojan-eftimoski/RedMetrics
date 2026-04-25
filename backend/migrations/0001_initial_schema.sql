-- =====================================================================
-- TideAlert -- initial schema (Phase 9, PRD §5)
-- Apply via Supabase MCP `apply_migration` or `supabase db push`.
-- =====================================================================

-- Required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()


-- ─── Coastal zones (geometry source of truth) ────────────────────────
CREATE TABLE IF NOT EXISTS coastal_zones (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    geom                  GEOMETRY(POLYGON, 4326),
    shore_normal_degrees  FLOAT,
    coastal_population    INT,
    asthma_prevalence_pct FLOAT
);


-- ─── Daily RRI scores per zone ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS rri_scores (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id              UUID REFERENCES coastal_zones(id),
    date                 DATE NOT NULL,
    rri_score            FLOAT,
    severity             TEXT CHECK (severity IN ('GREEN','AMBER','RED','CRITICAL')),
    bloom_probability    FLOAT,
    wind_speed           FLOAT,
    wave_height          FLOAT,
    chl_a_mean           FLOAT,
    rri_consecutive_days INT,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);


-- ─── IoT sensor readings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_readings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id             TEXT NOT NULL,
    zone_id               UUID REFERENCES coastal_zones(id),
    timestamp             TIMESTAMPTZ NOT NULL,
    temperature_c         FLOAT,
    ph                    FLOAT,
    humidity_pct          FLOAT,
    conductivity_ms_cm    FLOAT,
    dissolved_oxygen_mg_l FLOAT,
    nitrate_umol_l        FLOAT,
    phosphate_umol_l      FLOAT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);


-- ─── Hospital surge forecasts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_surge_forecasts (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id            TEXT NOT NULL,
    zone_id                UUID REFERENCES coastal_zones(id),
    forecast_date          DATE NOT NULL,
    generated_at           TIMESTAMPTZ DEFAULT NOW(),
    expected_admissions    INT,
    additional_vs_baseline INT,
    severity_tier          TEXT CHECK (severity_tier IN ('LOW SURGE','MODERATE SURGE','HIGH SURGE')),
    extra_nursing_shifts   INT,
    medication_stock_eur   INT,
    ci_low                 INT,
    ci_high                INT
);


-- ─── Insurance parametric trigger events ─────────────────────────────
CREATE TABLE IF NOT EXISTS trigger_events (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_certificate_id     TEXT UNIQUE NOT NULL,
    zone_id                  UUID REFERENCES coastal_zones(id),
    hospital_id              TEXT NOT NULL,
    insurer_id               TEXT NOT NULL,
    triggered_at             TIMESTAMPTZ DEFAULT NOW(),
    trigger_fired            BOOLEAN,
    rri_condition_met        BOOLEAN,
    iot_condition_met        BOOLEAN,
    rri_score                FLOAT,
    rri_days_above_threshold INT,
    iot_dissolved_oxygen     FLOAT,
    iot_ph                   FLOAT,
    payout_tier              TEXT,
    payout_pct               FLOAT,
    calculated_payout_eur    FLOAT,
    bloom_duration_days      INT,
    status                   TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','DISPUTED'))
);


-- ─── Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rri_scores_zone_date         ON rri_scores              (zone_id,     date         DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_time  ON sensor_readings         (sensor_id,   timestamp    DESC);
CREATE INDEX IF NOT EXISTS idx_surge_hospital_date          ON hospital_surge_forecasts(hospital_id, forecast_date DESC);
CREATE INDEX IF NOT EXISTS idx_trigger_events_hosp_time     ON trigger_events          (hospital_id, triggered_at DESC);


-- ─── Row-Level Security (PRD §5; demo posture: anon read, service write) ─
ALTER TABLE rri_scores               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_surge_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_events           ENABLE ROW LEVEL SECURITY;

-- Anonymous (and authenticated) reads -- demo dashboards use the anon key.
DROP POLICY IF EXISTS "anon read rri_scores"               ON rri_scores;
DROP POLICY IF EXISTS "anon read sensor_readings"          ON sensor_readings;
DROP POLICY IF EXISTS "anon read hospital_surge_forecasts" ON hospital_surge_forecasts;
DROP POLICY IF EXISTS "anon read trigger_events"           ON trigger_events;

CREATE POLICY "anon read rri_scores"               ON rri_scores               FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon read sensor_readings"          ON sensor_readings          FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon read hospital_surge_forecasts" ON hospital_surge_forecasts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon read trigger_events"           ON trigger_events           FOR SELECT TO anon, authenticated USING (true);

-- Writes are restricted to the service role (which bypasses RLS by design,
-- but the explicit policies make intent clear and prevent accidental
-- ad-hoc grants from opening up writes to anon).
DROP POLICY IF EXISTS "service writes rri_scores"               ON rri_scores;
DROP POLICY IF EXISTS "service writes sensor_readings"          ON sensor_readings;
DROP POLICY IF EXISTS "service writes hospital_surge_forecasts" ON hospital_surge_forecasts;
DROP POLICY IF EXISTS "service writes trigger_events"           ON trigger_events;

CREATE POLICY "service writes rri_scores"               ON rri_scores               FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service writes sensor_readings"          ON sensor_readings          FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service writes hospital_surge_forecasts" ON hospital_surge_forecasts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service writes trigger_events"           ON trigger_events           FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ─── Realtime publication (frontends subscribe to these) ─────────────
ALTER PUBLICATION supabase_realtime ADD TABLE rri_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE trigger_events;
ALTER PUBLICATION supabase_realtime ADD TABLE hospital_surge_forecasts;


-- ─── Seed: Genoa Ligurian Coast zone (BBOX 7.5,43.7 -> 9.8,44.6) ─────
-- Idempotent: only inserts if no row with this name yet.
INSERT INTO coastal_zones (name, geom, shore_normal_degrees, coastal_population, asthma_prevalence_pct)
SELECT
    'Genoa Ligurian Coast',
    ST_SetSRID(
        ST_MakePolygon(
            ST_GeomFromText('LINESTRING(7.5 43.7, 9.8 43.7, 9.8 44.6, 7.5 44.6, 7.5 43.7)')
        ),
        4326
    ),
    160,
    180000,
    6.5
WHERE NOT EXISTS (
    SELECT 1 FROM coastal_zones WHERE name = 'Genoa Ligurian Coast'
);
