-- Add map URL columns to org_settings
ALTER TABLE org_settings
  ADD COLUMN IF NOT EXISTS yandex_maps_url text,
  ADD COLUMN IF NOT EXISTS two_gis_url text;

-- Atomic follow-up claim function
-- Returns the client UUID if claim succeeded (first time this record_id is claimed)
-- Returns NULL if this record_id was already claimed for this client
CREATE OR REPLACE FUNCTION claim_followup(p_client_id uuid, p_record_id bigint)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  UPDATE clients
  SET last_yclients_followup_record_id = p_record_id
  WHERE id = p_client_id
    AND (last_yclients_followup_record_id IS NULL
         OR last_yclients_followup_record_id != p_record_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
