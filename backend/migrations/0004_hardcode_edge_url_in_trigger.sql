-- =====================================================================
-- TideAlert -- 0004: hardcode edge URL in the trigger function.
--
-- Supabase doesn't permit ALTER DATABASE SET on custom GUCs (permission
-- denied to non-superuser roles), so the URL goes into the function body
-- directly. The edge function is deployed with verify_jwt=false so the
-- trigger doesn't need to attach a service-role bearer token.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.notify_insurer_on_trigger_fired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    edge_url CONSTANT TEXT := 'https://qpdujjmerofutwcexmmp.supabase.co/functions/v1/insurer_webhook';
    payload  JSONB;
BEGIN
    IF NEW.trigger_fired IS NOT TRUE THEN
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
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body    := payload,
        timeout_milliseconds := 10000
    );
    RETURN NEW;
END;
$$;
