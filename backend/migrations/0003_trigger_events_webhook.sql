-- =====================================================================
-- TideAlert -- 0003: invoke insurer_webhook edge function on fired triggers
-- Requires the `pg_net` extension (Supabase async HTTP) and the edge
-- function `insurer_webhook` to be deployed before this migration runs.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Settings the trigger function reads. Set them once via Supabase SQL editor:
--   ALTER DATABASE postgres SET tidealert.edge_url = 'https://<ref>.functions.supabase.co/insurer_webhook';
--   ALTER DATABASE postgres SET tidealert.service_key = '<service-role JWT>';
-- The trigger function looks them up at runtime; missing settings are a no-op
-- so applying this migration before configuring the URL doesn't error.

CREATE OR REPLACE FUNCTION public.notify_insurer_on_trigger_fired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    edge_url   TEXT;
    service_key TEXT;
    payload    JSONB;
BEGIN
    IF NEW.trigger_fired IS NOT TRUE THEN
        RETURN NEW;
    END IF;

    edge_url    := current_setting('tidealert.edge_url',    true);
    service_key := current_setting('tidealert.service_key', true);

    IF edge_url IS NULL OR edge_url = '' THEN
        RAISE NOTICE 'tidealert.edge_url not configured; skipping insurer webhook for %',
            NEW.event_certificate_id;
        RETURN NEW;
    END IF;

    payload := jsonb_build_object(
        'type',   'INSERT',
        'table',  'trigger_events',
        'schema', 'public',
        'record', to_jsonb(NEW)
    );

    PERFORM net.http_post(
        url     := edge_url,
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || COALESCE(service_key, '')
        ),
        body    := payload,
        timeout_milliseconds := 10000
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_insurer ON trigger_events;

CREATE TRIGGER trg_notify_insurer
    AFTER INSERT ON trigger_events
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_insurer_on_trigger_fired();
