-- =============================================================================
-- SMS/Phone канал — только fallback после явной проверки WA
-- Принцип: phone channel can_notify=true ТОЛЬКО когда wa_check_status='not_found'
-- =============================================================================

-- 1. Принудительно выставляем can_notify для уже существующих phone-каналов
UPDATE public.client_channels cc
SET can_notify = (c.wa_check_status = 'not_found')
FROM public.clients c
WHERE cc.client_id = c.id
  AND cc.channel = 'phone';

-- 2. Триггер: при добавлении/обновлении phone-канала — контролируем can_notify
CREATE OR REPLACE FUNCTION public.enforce_phone_channel_can_notify()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_wa_status TEXT;
BEGIN
  IF NEW.channel <> 'phone' THEN
    RETURN NEW;
  END IF;

  SELECT wa_check_status INTO v_wa_status
  FROM public.clients
  WHERE id = NEW.client_id;

  -- SMS разрешён только если WA явно не найден
  NEW.can_notify := (v_wa_status = 'not_found');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_phone_channel_can_notify ON public.client_channels;
CREATE TRIGGER trg_phone_channel_can_notify
  BEFORE INSERT OR UPDATE OF channel, can_notify ON public.client_channels
  FOR EACH ROW EXECUTE FUNCTION public.enforce_phone_channel_can_notify();

-- 3. Триггер: когда wa_check_status меняется на clients —
--    автоматически обновляем phone-канал в client_channels
CREATE OR REPLACE FUNCTION public.sync_phone_channel_on_wa_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.wa_check_status IS NOT DISTINCT FROM NEW.wa_check_status THEN
    RETURN NEW;
  END IF;

  UPDATE public.client_channels
  SET can_notify = (NEW.wa_check_status = 'not_found')
  WHERE client_id = NEW.id
    AND channel = 'phone';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_phone_channel_on_wa_check ON public.clients;
CREATE TRIGGER trg_sync_phone_channel_on_wa_check
  AFTER UPDATE OF wa_check_status ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.sync_phone_channel_on_wa_check();

COMMENT ON FUNCTION public.enforce_phone_channel_can_notify() IS
  'SMS (phone канал) разрешён только если wa_check_status=not_found на клиенте.';
COMMENT ON FUNCTION public.sync_phone_channel_on_wa_check() IS
  'При изменении wa_check_status автоматически обновляет can_notify в client_channels.';
