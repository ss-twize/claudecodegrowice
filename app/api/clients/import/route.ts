import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeGoogleSheetsClientRow } from "@/lib/imports/normalizeGoogleSheetsClient";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DEFAULT_ORG_UID = "11111111-1111-1111-1111-111111111111";

function sb() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

type ImportSource = "yclients" | "google_sheets";
type GenericRow = Record<string, unknown>;

function normalizeYclientsRow(row: GenericRow, orgUid: string): Record<string, unknown> | null {
  const ycRaw = row.yc_id ?? row.yclients_id ?? row.id ?? null;
  const ycId = ycRaw === null || ycRaw === undefined ? null : String(ycRaw).trim() || null;
  const yclientsId = Number(row.yclients_id ?? row.id ?? 0);
  const fullNameRaw = row.fullname ?? row.display_name ?? row.name ?? null;
  const fullname = fullNameRaw ? String(fullNameRaw).trim() : "";

  if (!fullname) return null;

  return {
    ...row,
    org_uid: orgUid,
    yc_id: ycId,
    yclients_id: Number.isFinite(yclientsId) && yclientsId > 0 ? yclientsId : null,
    fullname,
    display_name: String(row.display_name ?? fullname),
  };
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: "Supabase env не настроен" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const source = (body?.source || "yclients") as ImportSource;
  const orgUid = String(body?.org_uid || DEFAULT_ORG_UID);
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  if (source !== "yclients" && source !== "google_sheets") {
    return NextResponse.json({ error: "source должен быть yclients или google_sheets" }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "rows пустой" }, { status: 400 });
  }

  const normalized = rows
    .map((row: GenericRow) => (source === "google_sheets"
      ? normalizeGoogleSheetsClientRow(row, orgUid)
      : normalizeYclientsRow(row, orgUid)))
    .filter(Boolean) as Record<string, unknown>[];

  if (normalized.length === 0) {
    return NextResponse.json({ error: "Нет валидных строк для импорта" }, { status: 400 });
  }

  const rowsWithYcId = normalized.filter((row) => row.yc_id);
  const rowsWithoutYcId = normalized.filter((row) => !row.yc_id);

  if (rowsWithYcId.length > 0) {
    const { error } = await sb()
      .from("clients")
      .upsert(rowsWithYcId, { onConflict: "org_uid,yc_id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (rowsWithoutYcId.length > 0) {
    const { error } = await sb()
      .from("clients")
      .insert(rowsWithoutYcId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sb()
    .from("org_settings")
    .upsert(
      {
        org_uid: orgUid,
        contacts_import_source: source,
        contacts_source_meta: { imported_at: new Date().toISOString(), imported_rows: normalized.length },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_uid" },
    );

  return NextResponse.json({
    ok: true,
    source,
    imported: normalized.length,
    imported_with_yc_id: rowsWithYcId.length,
    imported_without_yc_id: rowsWithoutYcId.length,
  });
}
