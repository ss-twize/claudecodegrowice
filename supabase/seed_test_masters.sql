-- Seed test masters for the "Карточки мастеров" block.
-- Safe to run multiple times: inserts only if pair (name, specialization) is missing.

DO $$
DECLARE
  has_org_uid BOOLEAN;
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

  IF has_org_uid THEN
    BEGIN
      INSERT INTO public.masters (org_uid, yc_id, name, specialization)
      SELECT '11111111-1111-1111-1111-111111111111'::uuid, v.yc_id, v.name, v.specialization
      FROM (
        VALUES
          (900000001, 'Ирина Волкова', 'Парикмахер-стилист'),
          (900000002, 'Мария Орлова', 'Мастер маникюра'),
          (900000003, 'Ольга Синицина', 'Бровист'),
          (900000004, 'Анна Корнеева', 'Косметолог')
      ) AS v(yc_id, name, specialization)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.masters m
        WHERE m.yc_id::text = v.yc_id::text
           OR (m.name = v.name AND m.specialization = v.specialization)
      );
    EXCEPTION
      WHEN undefined_column THEN
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
    END;
  ELSE
    BEGIN
      INSERT INTO public.masters (yc_id, name, specialization)
      SELECT v.yc_id, v.name, v.specialization
      FROM (
        VALUES
          (900000001, 'Ирина Волкова', 'Парикмахер-стилист'),
          (900000002, 'Мария Орлова', 'Мастер маникюра'),
          (900000003, 'Ольга Синицина', 'Бровист'),
          (900000004, 'Анна Корнеева', 'Косметолог')
      ) AS v(yc_id, name, specialization)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.masters m
        WHERE m.yc_id::text = v.yc_id::text
           OR (m.name = v.name AND m.specialization = v.specialization)
      );
    EXCEPTION
      WHEN undefined_column THEN
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
    END;
  END IF;
END $$;
