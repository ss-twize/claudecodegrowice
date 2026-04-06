-- Добавляет в org_settings выбор источника импорта контактов при онбординге.
-- По умолчанию используется YClients.

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS contacts_import_source TEXT
    DEFAULT 'yclients'
    CHECK (contacts_import_source IN ('yclients', 'google_sheets')),
  ADD COLUMN IF NOT EXISTS contacts_source_meta JSONB DEFAULT '{}'::jsonb;
