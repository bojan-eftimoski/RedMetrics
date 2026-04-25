# Backend migrations

SQL migrations applied to the TideAlert Supabase project (`qpdujjmerofutwcexmmp`).

## Apply via Supabase CLI

```bash
supabase db push --include-all
```

## Apply via Supabase MCP (preferred for this repo)

The Supabase MCP server exposes `apply_migration`. Pass the file contents and a name:

```
mcp.apply_migration(
  name="0001_initial_schema",
  query=<contents of 0001_initial_schema.sql>
)
```

## What 0001 does

| | |
|---|---|
| Extensions | `postgis`, `pgcrypto` |
| Tables | `coastal_zones`, `rri_scores`, `sensor_readings`, `hospital_surge_forecasts`, `trigger_events` |
| Indexes | `(zone_id, date DESC)`, `(sensor_id, timestamp DESC)`, `(hospital_id, forecast_date DESC)`, `(hospital_id, triggered_at DESC)` |
| RLS | enabled on 4 fact tables; permissive `SELECT` for `anon`+`authenticated`; `ALL` for `service_role` |
| Realtime | publication `supabase_realtime` extended with `rri_scores`, `trigger_events`, `hospital_surge_forecasts` |
| Seed | one `coastal_zones` row covering BBOX 7.5°E–9.8°E × 43.7°N–44.6°N |

## Idempotency

Every statement uses `IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, and `WHERE NOT EXISTS` for the seed insert. Re-applying is safe.

## After applying

Confirm with:
```sql
SELECT name, ST_AsText(ST_Centroid(geom)), coastal_population
FROM coastal_zones;
```
