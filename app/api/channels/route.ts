import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── Server-only env vars (no NEXT_PUBLIC_ prefix) ──
const PARTNER_TOKEN = process.env.GREENAPI_PARTNER_TOKEN ?? "";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const DEFAULT_WEBHOOK = process.env.GREENAPI_WEBHOOK_URL ?? "";
const PARTNER_BASE = "https://api.green-api.com/partner";

function sb() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getConn(id: string) {
  const { data } = await sb()
    .from("channel_connections")
    .select("*")
    .eq("id", id)
    .single();
  return data as Record<string, string> | null;
}

async function logEvent(
  connection_id: string,
  event_code: string,
  payload: Record<string, unknown> = {}
) {
  await sb()
    .from("channel_connection_events")
    .insert({ connection_id, event_code, payload });
}

async function greenApi(
  method: "GET" | "POST",
  url: string,
  body?: unknown
): Promise<{ ok: boolean; data: unknown }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: null };
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, org_uid, channel_code, connection_id, settings } = body;

  // ── create ──────────────────────────────────────────────────────────────
  if (action === "create") {
    if (!PARTNER_TOKEN) {
      return NextResponse.json(
        { error: "Интеграция с GREEN-API не настроена" },
        { status: 503 }
      );
    }

    const typeInstance = channel_code === "max" ? "max" : "whatsapp";

    // Delete existing connection for this org+channel if any
    await sb()
      .from("channel_connections")
      .delete()
      .eq("org_uid", org_uid)
      .eq("channel_code", channel_code);

    // Create GREEN-API instance (server-side only)
    const { ok, data } = await greenApi(
      "POST",
      `${PARTNER_BASE}/createInstance/${PARTNER_TOKEN}`,
      { typeInstance, webhookUrl: DEFAULT_WEBHOOK }
    );

    if (!ok || !data) {
      return NextResponse.json(
        { error: "Не удалось создать подключение" },
        { status: 502 }
      );
    }

    const {
      idInstance,
      apiTokenInstance,
      apiUrl,
      mediaUrl,
    } = data as Record<string, string>;

    const { data: conn, error } = await sb()
      .from("channel_connections")
      .insert({
        org_uid,
        channel_code,
        provider: "green_api",
        status: "creating",
        instance_id: String(idInstance),
        api_url: apiUrl,
        media_url: mediaUrl,
        api_token: apiTokenInstance,
        webhook_url: DEFAULT_WEBHOOK,
      })
      .select("id")
      .single();

    if (error || !conn) {
      return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
    }

    await logEvent(conn.id, "created", { idInstance, typeInstance });

    return NextResponse.json({ ok: true, connection_id: conn.id });
  }

  // ── disconnect ──────────────────────────────────────────────────────────
  if (action === "disconnect") {
    const conn = await getConn(connection_id);
    if (!conn) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    // Call GREEN-API partner delete (fire-and-forget, don't block on error)
    if (conn.instance_id && PARTNER_TOKEN) {
      await greenApi(
        "POST",
        `${PARTNER_BASE}/deleteInstanceAccount/${PARTNER_TOKEN}`,
        { idInstance: Number(conn.instance_id) }
      );
    }

    await sb()
      .from("channel_connections")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        instance_id: null,
        api_token: null,
        api_url: null,
        media_url: null,
        display_name: null,
      })
      .eq("id", connection_id);

    await logEvent(connection_id, "disconnected", {});

    return NextResponse.json({ ok: true });
  }

  // ── settings ────────────────────────────────────────────────────────────
  if (action === "settings") {
    const conn = await getConn(connection_id);
    if (!conn) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    if (conn.instance_id && conn.api_url && conn.api_token) {
      await greenApi(
        "POST",
        `${conn.api_url}/waInstance${conn.instance_id}/setSettings/${conn.api_token}`,
        settings
      );
    }

    await sb()
      .from("channel_connections")
      .update({ meta: { ...((conn.meta as unknown as Record<string, unknown>) || {}), settings } })
      .eq("id", connection_id);

    await logEvent(connection_id, "settings_applied", { settings });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id обязателен" }, { status: 400 });
  }

  const conn = await getConn(id);
  if (!conn) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  // ── status ──────────────────────────────────────────────────────────────
  if (action === "status") {
    if (!conn.instance_id || !conn.api_url || !conn.api_token) {
      return NextResponse.json({ status: "creating" });
    }

    const { ok, data } = await greenApi(
      "GET",
      `${conn.api_url}/waInstance${conn.instance_id}/getStateInstance/${conn.api_token}`
    );

    if (!ok || !data) {
      return NextResponse.json({ status: conn.status });
    }

    const state = (data as Record<string, string>).stateInstance;

    const statusMap: Record<string, string> = {
      authorized: "connected",
      notAuthorized: "pending_auth",
      starting: "creating",
      yellowCard: "connected",
    };

    const newStatus = statusMap[state] ?? conn.status;

    if (newStatus !== conn.status) {
      await sb()
        .from("channel_connections")
        .update({
          status: newStatus,
          last_checked_at: new Date().toISOString(),
          ...(newStatus === "connected"
            ? { connected_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", id);

      if (newStatus === "connected") {
        await logEvent(id, "authorized", { stateInstance: state });
      }
    }

    return NextResponse.json({ status: newStatus, stateInstance: state });
  }

  // ── qr ──────────────────────────────────────────────────────────────────
  if (action === "qr") {
    if (!conn.instance_id || !conn.api_url || !conn.api_token) {
      return NextResponse.json({ error: "Инстанс не готов" }, { status: 400 });
    }

    const { ok, data } = await greenApi(
      "GET",
      `${conn.api_url}/waInstance${conn.instance_id}/qr/${conn.api_token}`
    );

    if (!ok || !data) {
      return NextResponse.json({ error: "Ошибка получения QR" }, { status: 502 });
    }

    const d = data as Record<string, string>;

    if (d.type === "alreadyLogged") {
      return NextResponse.json({ alreadyLogged: true });
    }

    if (d.type === "qrCode") {
      await logEvent(id, "qr_requested", {});
      return NextResponse.json({ qr: d.message });
    }

    return NextResponse.json({ error: "QR временно недоступен" }, { status: 400 });
  }

  // ── account ─────────────────────────────────────────────────────────────
  if (action === "account") {
    if (!conn.instance_id || !conn.api_url || !conn.api_token) {
      return NextResponse.json({});
    }

    const { data } = await greenApi(
      "GET",
      `${conn.api_url}/waInstance${conn.instance_id}/getWaSettings/${conn.api_token}`
    );

    if (data) {
      const d = data as Record<string, string>;
      const displayName = d.nameDevice || d.wid?.replace("@c.us", "") || "";
      if (displayName) {
        await sb()
          .from("channel_connections")
          .update({ display_name: displayName })
          .eq("id", id);
      }
      return NextResponse.json({ display_name: displayName });
    }

    return NextResponse.json({});
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
