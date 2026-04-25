// =====================================================================
// TideAlert -- insurer_webhook (Phase 11, PRD §7.2)
// Forwards a fired trigger_events row to the simulated insurer endpoint.
// Invoked by a Postgres trigger via pg_net on INSERT WHERE trigger_fired.
// =====================================================================

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 500;
const REQUEST_TIMEOUT_MS = 10_000;

const SIMULATED_INSURER_URL = Deno.env.get("SIMULATED_INSURER_URL") ?? "";
const SIMULATED_INSURER_PATH = "/api/simulated-insurer-webhook";

interface TriggerEvent {
  id?: string;
  event_certificate_id: string;
  zone_id?: string;
  hospital_id: string;
  insurer_id: string;
  triggered_at?: string;
  trigger_fired?: boolean;
  rri_condition_met?: boolean;
  iot_condition_met?: boolean;
  rri_score?: number;
  rri_days_above_threshold?: number;
  iot_dissolved_oxygen?: number;
  iot_ph?: number;
  payout_tier?: string;
  payout_pct?: number;
  calculated_payout_eur?: number;
  bloom_duration_days?: number;
  status?: string;
}

// Postgres webhook payload shape: { type, table, record, schema, old_record? }
interface PgWebhookPayload {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  record?: TriggerEvent;
  schema?: string;
  old_record?: TriggerEvent | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(targetUrl: string, body: unknown): Promise<Response> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const resp = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TideAlert-Source": "insurer_webhook_edge_fn",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (resp.status < 500) return resp;
      lastErr = `HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err instanceof Error ? err.message : String(err);
    }
    if (attempt < MAX_RETRIES - 1) {
      await sleep(BACKOFF_BASE_MS * 2 ** attempt);
    }
  }
  throw new Error(`POST to insurer failed after ${MAX_RETRIES} retries: ${lastErr}`);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!SIMULATED_INSURER_URL) {
    return new Response(
      JSON.stringify({ error: "SIMULATED_INSURER_URL not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let payload: PgWebhookPayload | TriggerEvent;
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Accept either the Postgres webhook envelope or a bare trigger_events row.
  const isPgEnvelope = (p: unknown): p is PgWebhookPayload =>
    typeof p === "object" && p !== null && "record" in p;

  const event: TriggerEvent | undefined = isPgEnvelope(payload)
    ? payload.record
    : (payload as TriggerEvent);

  if (!event || !event.event_certificate_id) {
    return new Response(
      JSON.stringify({ error: "Missing event_certificate_id in payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Only forward fired triggers. Postgres-side trigger should already filter,
  // but guard defensively in case the function is invoked manually.
  if (event.trigger_fired === false) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "trigger_fired=false" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const target = SIMULATED_INSURER_URL.replace(/\/$/, "") + SIMULATED_INSURER_PATH;
  try {
    const insurerResp = await postWithRetry(target, event);
    const insurerBody = await insurerResp.text();
    return new Response(
      JSON.stringify({
        forwarded: true,
        event_certificate_id: event.event_certificate_id,
        insurer_status: insurerResp.status,
        insurer_response: insurerBody.slice(0, 500),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({
        forwarded: false,
        event_certificate_id: event.event_certificate_id,
        error: msg,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
});
