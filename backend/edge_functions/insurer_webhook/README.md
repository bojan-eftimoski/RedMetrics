# `insurer_webhook` edge function

Forwards every fired `trigger_events` row to the simulated insurer endpoint. Implements PRD §7.2 webhook delivery.

## Behavior

- **Method:** `POST` only.
- **Body:** accepts either the Postgres webhook envelope (`{ type, table, record, ... }`) or a bare `trigger_events` row.
- **Filter:** only forwards rows with `trigger_fired = true` (defensive guard; the DB-side trigger should also filter).
- **Target:** `${SIMULATED_INSURER_URL}/api/simulated-insurer-webhook`.
- **Retries:** up to 3 attempts, exponential backoff (500 ms, 1 s, 2 s), per-request timeout 10 s. Retries on 5xx and network errors only.
- **Response:** `{ forwarded, event_certificate_id, insurer_status, insurer_response }` on success; `{ forwarded: false, error }` with HTTP 502 on terminal failure.

## Deploy

Via Supabase MCP:
```
mcp.deploy_edge_function(
  project_id="qpdujjmerofutwcexmmp",
  slug="insurer_webhook",
  files=[{ "name": "index.ts", "content": <file contents> }],
)
```

Or via CLI from the repo root:
```bash
supabase functions deploy insurer_webhook --no-verify-jwt
```

## Required environment variable

Set on the function (Supabase dashboard > Edge Functions > insurer_webhook > Secrets):

| Name | Value |
|---|---|
| `SIMULATED_INSURER_URL` | Base URL of the demo insurer (e.g. `https://demo-insurer.tidealert.dev`) |

## Wiring the DB trigger

Migration `0003_trigger_events_webhook.sql` enables `pg_net` and adds an `AFTER INSERT` trigger on `trigger_events` that calls this edge function via `net.http_post` whenever `NEW.trigger_fired = true`.
