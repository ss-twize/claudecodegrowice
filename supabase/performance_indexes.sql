-- =============================================
-- GROWICE: Performance indexes
-- Run in Supabase SQL editor
-- =============================================

-- appointments: org_uid + date — основной паттерн всех запросов по записям
CREATE INDEX IF NOT EXISTS idx_appointments_org_date
  ON appointments(org_uid, date DESC);

-- appointments: частичный индекс для будущих записей (useClients upcoming check)
CREATE INDEX IF NOT EXISTS idx_appointments_upcoming
  ON appointments(org_uid, date)
  WHERE deleted = false;

-- appointments: org_uid + status для фильтрации по статусу
CREATE INDEX IF NOT EXISTS idx_appointments_org_status
  ON appointments(org_uid, status);

-- clients: org_uid + created_at — для подсчёта новых клиентов по периодам
-- (заменяет аналогичные запросы к legacy-таблице clients_tg)
CREATE INDEX IF NOT EXISTS idx_clients_org_created_at
  ON clients(org_uid, created_at DESC);

-- =============================================
-- Verify indexes were created:
-- SELECT indexname, tablename, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename IN ('appointments', 'clients')
-- ORDER BY tablename, indexname;
-- =============================================
