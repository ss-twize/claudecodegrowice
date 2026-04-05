-- Seed test masters for "Карточки мастеров".
-- Script inspects actual table schema first and then inserts rows safely.

DO $$
DECLARE
  has_org_uid BOOLEAN;
  has_yc_id BOOLEAN;
  yc_id_type TEXT;
  org_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
  sql_query TEXT;
BEGIN
  IF to_regclass('public.masters') IS NULL THEN
    RAISE NOTICE 'Table public.masters does not exist. Skip seed.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'masters'
      AND column_name = 'org_uid'
  ) INTO has_org_uid;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'masters'
      AND column_name = 'yc_id'
  ) INTO has_yc_id;

  IF has_yc_id THEN
    SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
    INTO yc_id_type
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'masters'
      AND a.attname = 'yc_id'
      AND a.attnum > 0
      AND NOT a.attisdropped;
  END IF;

  IF has_org_uid AND has_yc_id THEN
    sql_query := format($f$
      INSERT INTO public.masters (org_uid, yc_id, name, specialization)
      SELECT %L::uuid, v.yc_id::%s, v.name, v.specialization
      FROM (
        VALUES
          ('900000001', 'Ирина Волкова', 'Парикмахер-стилист'),
          ('900000002', 'Мария Орлова', 'Мастер маникюра'),
          ('900000003', 'Ольга Синицина', 'Бровист'),
          ('900000004', 'Анна Корнеева', 'Косметолог')
      ) AS v(yc_id, name, specialization)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.masters m
        WHERE m.yc_id::text = v.yc_id
           OR (m.name = v.name AND m.specialization = v.specialization)
      )
    $f$, org_id, yc_id_type);

    EXECUTE sql_query;

  ELSIF has_org_uid THEN
    INSERT INTO public.masters (org_uid, name, specialization)
    SELECT org_id, v.name, v.specialization
    FROM (
      VALUES
        ('Ирина Волкова', 'Парикмахер-стилист'),
        ('Мария Орлова', 'Мастер маникюра'),
        ('Ольга Синицина', 'Бровист'),
        ('Анна Корнеева', 'Косметолог')
    ) AS v(name, specialization)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.masters m
      WHERE m.name = v.name
        AND m.specialization = v.specialization
    );

  ELSIF has_yc_id THEN
    sql_query := format($f$
      INSERT INTO public.masters (yc_id, name, specialization)
      SELECT v.yc_id::%s, v.name, v.specialization
      FROM (
        VALUES
          ('900000001', 'Ирина Волкова', 'Парикмахер-стилист'),
          ('900000002', 'Мария Орлова', 'Мастер маникюра'),
          ('900000003', 'Ольга Синицина', 'Бровист'),
          ('900000004', 'Анна Корнеева', 'Косметолог')
      ) AS v(yc_id, name, specialization)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.masters m
        WHERE m.yc_id::text = v.yc_id
           OR (m.name = v.name AND m.specialization = v.specialization)
      )
    $f$, yc_id_type);

    EXECUTE sql_query;

  ELSE
    INSERT INTO public.masters (name, specialization)
    SELECT v.name, v.specialization
    FROM (
      VALUES
        ('Ирина Волкова', 'Парикмахер-стилист'),
        ('Мария Орлова', 'Мастер маникюра'),
        ('Ольга Синицина', 'Бровист'),
        ('Анна Корнеева', 'Косметолог')
    ) AS v(name, specialization)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.masters m
      WHERE m.name = v.name
        AND m.specialization = v.specialization
    );
  END IF;
END $$;
