-- Обратная автосвязь clients -> user tables.
-- Если в clients проставлены *_user_id, автоматически обновляем client_id
-- в telegram_users / whatsapp_users / max_users в рамках той же org_uid.

CREATE OR REPLACE FUNCTION public.sync_client_links_to_user_tables()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.telegram_user_id IS NOT NULL THEN
    UPDATE public.telegram_users
    SET client_id = NEW.id
    WHERE org_uid = NEW.org_uid
      AND user_id = NEW.telegram_user_id
      AND (client_id IS DISTINCT FROM NEW.id);
  END IF;

  IF NEW.whatsapp_user_id IS NOT NULL THEN
    UPDATE public.whatsapp_users
    SET client_id = NEW.id
    WHERE org_uid = NEW.org_uid
      AND user_id = NEW.whatsapp_user_id
      AND (client_id IS DISTINCT FROM NEW.id);
  END IF;

  IF NEW.max_user_id IS NOT NULL THEN
    UPDATE public.max_users
    SET client_id = NEW.id
    WHERE org_uid = NEW.org_uid
      AND user_id = NEW.max_user_id
      AND (client_id IS DISTINCT FROM NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_sync_links_to_users ON public.clients;
CREATE TRIGGER clients_sync_links_to_users
AFTER INSERT OR UPDATE OF telegram_user_id, whatsapp_user_id, max_user_id, org_uid
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_links_to_user_tables();
