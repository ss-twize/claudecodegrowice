-- Добавляет в clients поля для прямой связи с user_id из мессенджеров.
-- Это нужно для автоматического переноса users -> clients при появлении yc_id.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS whatsapp_user_id TEXT,
  ADD COLUMN IF NOT EXISTS max_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_org_tg_user ON public.clients (org_uid, telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_wa_user ON public.clients (org_uid, whatsapp_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_org_max_user ON public.clients (org_uid, max_user_id);
