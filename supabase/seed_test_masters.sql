-- Seed test masters for the "Карточки мастеров" block.
-- Safe to run multiple times: inserts only if pair (name, specialization) is missing.

DO $$
DECLARE
  has_org_uid BOOLEAN;
  has_yc_id BOOLEAN;
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

  IF has_org_uid AND has_yc_id THEN
    INSERT INTO public.masters (org_uid, yc_id, name, specialization)
    SELECT '11111111-1111-1111-1111-111111111111'::uuid, v.yc_id, v.name, v.specialization
    FROM (
      VALUES
        ('yc_master_test_1', 'Ирина Волкова', 'Парикмахер-стилист'),
        ('yc_master_test_2', 'Мария Орлова', 'Мастер маникюра'),
        ('yc_master_test_3', 'Ольга Синицина', 'Бровист'),
        ('yc_master_test_4', 'Анна Корнеева', 'Косметолог')
    ) AS v(yc_id, name, specialization)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.masters m
      WHERE m.yc_id = v.yc_id
         OR (m.name = v.name AND m.specialization = v.specialization)
    );
  ELSIF has_org_uid THEN
    INSERT INTO public.masters (org_uid, name, specialization)
    SELECT '11111111-1111-1111-1111-111111111111'::uuid, v.name, v.specialization
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
    INSERT INTO public.masters (yc_id, name, specialization)
    SELECT v.yc_id, v.name, v.specialization
    FROM (
      VALUES
        ('yc_master_test_1', 'Ирина Волкова', 'Парикмахер-стилист'),
        ('yc_master_test_2', 'Мария Орлова', 'Мастер маникюра'),
        ('yc_master_test_3', 'Ольга Синицина', 'Бровист'),
        ('yc_master_test_4', 'Анна Корнеева', 'Косметолог')
    ) AS v(yc_id, name, specialization)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.masters m
      WHERE m.yc_id = v.yc_id
         OR (m.name = v.name AND m.specialization = v.specialization)
    );
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
