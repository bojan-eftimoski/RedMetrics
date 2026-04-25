-- =====================================================================
-- TideAlert -- 0002 follow-up: open coastal_zones for anon read.
-- Supabase auto-enables RLS on new tables in `public`; without a policy,
-- the frontends cannot read the zone geometry/metadata to draw the map.
-- =====================================================================

ALTER TABLE coastal_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read coastal_zones"   ON coastal_zones;
DROP POLICY IF EXISTS "service writes coastal_zones" ON coastal_zones;

CREATE POLICY "anon read coastal_zones"
    ON coastal_zones FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "service writes coastal_zones"
    ON coastal_zones FOR ALL
    TO service_role
    USING (true) WITH CHECK (true);
