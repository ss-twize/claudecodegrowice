"use client";

import { useState } from "react";
import {
  Settings2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  PlugZap,
  Unplug,
} from "lucide-react";
import { ChannelConnectDrawer } from "./ChannelConnectDrawer";
import type { ChannelConnection } from "@/lib/hooks/useChannelConnections";
import { ORG_UID } from "@/lib/supabase";

interface Props {
  channelCode: "whatsapp" | "max";
  channelName: string;
  icon: string;
  connection: ChannelConnection | null;
  role?: string;
  onRefetch: () => void;
}

const STATUS_META: Record<
  string,
  { label: string; textClass: string; borderClass: string; headerBg: string; iconBg: string; iconText: string }
> = {
  disconnected: {
    label: "Не подключён",
    textClass: "text-[#5E7488]",
    borderClass: "border-[#223444]",
    headerBg: "bg-[#0A0D14]",
    iconBg: "bg-[#1A2535]",
    iconText: "text-[#8299B4]",
  },
  creating: {
    label: "Подключается...",
    textClass: "text-blue-400",
    borderClass: "border-blue-500/30",
    headerBg: "bg-blue-500/5",
    iconBg: "bg-blue-500/20",
    iconText: "text-blue-400",
  },
  pending_auth: {
    label: "Ожидает авторизацию",
    textClass: "text-yellow-400",
    borderClass: "border-yellow-500/30",
    headerBg: "bg-yellow-500/5",
    iconBg: "bg-yellow-500/20",
    iconText: "text-yellow-400",
  },
  connected: {
    label: "Подключён и активен",
    textClass: "text-[#00FF00]",
    borderClass: "border-[#00FF00]/30",
    headerBg: "bg-[#00FF00]/5",
    iconBg: "bg-[#00FF00]/20",
    iconText: "text-[#00FF00]",
  },
  error: {
    label: "Ошибка подключения",
    textClass: "text-red-400",
    borderClass: "border-red-500/30",
    headerBg: "bg-red-500/5",
    iconBg: "bg-red-500/20",
    iconText: "text-red-400",
  },
};

export function GreenApiChannelCard({
  channelCode,
  channelName,
  icon,
  connection,
  role,
  onRefetch,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [checking, setChecking] = useState(false);
  const [workFrom, setWorkFrom] = useState("09:00");
  const [workTo, setWorkTo] = useState("21:00");

  const status = connection?.status ?? "disconnected";
  const meta = STATUS_META[status] ?? STATUS_META.disconnected;

  // ── Check connection ───────────────────────────────────────────────────
  const handleCheck = async () => {
    if (!connection) return;
    setChecking(true);
    try {
      await fetch(`/api/channels?action=status&id=${connection.id}`);
      onRefetch();
    } finally {
      setChecking(false);
    }
  };

  // ── Disconnect ─────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!connection) return;
    setDisconnecting(true);
    try {
      await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          connection_id: connection.id,
          org_uid: ORG_UID,
        }),
      });
      onRefetch();
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  };

  // ── Save settings ──────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    if (!connection) return;
    await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "settings",
        connection_id: connection.id,
        settings: { workFrom, workTo },
      }),
    });
  };

  return (
    <>
      <div className={`border rounded-xl overflow-hidden transition-colors ${meta.borderClass}`}>
        {/* ── Card header ── */}
        <div className={`flex items-center justify-between p-4 ${meta.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${meta.iconBg} ${meta.iconText}`}>
              {icon}
            </div>
            <div>
              <p className="text-[#EDF2FA] font-semibold">{channelName}</p>
              <div className="flex items-center gap-1.5">
                {(status === "creating" || checking) && (
                  <RefreshCw size={10} className={`${meta.textClass} animate-spin`} />
                )}
                <p className={`text-xs ${meta.textClass}`}>
                  {checking ? "Проверяем..." : meta.label}
                </p>
              </div>
              {connection?.display_name && status === "connected" && (
                <p className="text-[#5E7488] text-xs">{connection.display_name}</p>
              )}
            </div>
          </div>

          {/* ── Header actions ── */}
          <div className="flex items-center gap-2">
            {status === "disconnected" && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 text-[#00FF00] text-xs font-semibold hover:bg-[#00FF00]/20 transition-colors"
              >
                <PlugZap size={13} />
                Подключить
              </button>
            )}

            {(status === "creating" || status === "pending_auth") && (
              <button
                onClick={() => setDrawerOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${meta.borderClass} ${meta.textClass} hover:opacity-80`}
              >
                {status === "pending_auth" ? "Авторизация" : "Детали"}
              </button>
            )}

            {status === "connected" && (
              <>
                <button
                  onClick={handleCheck}
                  className="p-1.5 rounded-lg text-[#5E7488] hover:text-[#EDF2FA] hover:bg-[#1A2535] transition-colors"
                  title="Проверить"
                >
                  {checking ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <RefreshCw size={15} />
                  )}
                </button>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 rounded-lg text-[#5E7488] hover:text-[#EDF2FA] hover:bg-[#1A2535] transition-colors"
                  title="Настройки"
                >
                  <Settings2 size={16} />
                </button>
              </>
            )}

            {status === "error" && (
              <a
                href="https://t.me/ss_bizness"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 text-[#00FF00] text-xs font-semibold hover:bg-[#00FF00]/20 transition-colors"
              >
                Поддержка
              </a>
            )}
          </div>
        </div>

        {/* ── Error detail ── */}
        {status === "error" && (
          <div className="px-4 py-3 bg-[#0A0D14] border-t border-[#223444] flex items-start gap-2">
            <AlertTriangle size={14} className="text-[#8299B4] flex-shrink-0 mt-0.5" />
            <p className="text-[#8299B4] text-xs">
              Подключить {channelName} можно через поддержку.{" "}
              <a
                href="https://t.me/ss_bizness"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00FF00] hover:text-[#ccff33] transition-colors"
              >
                Написать в Telegram
              </a>
            </p>
          </div>
        )}

        {/* ── Expanded settings (connected only) ── */}
        {expanded && status === "connected" && (
          <div className="border-t border-[#223444] p-4 space-y-4 bg-[#0A0D14]">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Подключён", value: formatDate(connection?.connected_at), icon: <CheckCircle2 size={13} /> },
                { label: "Проверка", value: formatDate(connection?.last_checked_at), icon: <Clock size={13} /> },
              ].map((s) => (
                <div key={s.label} className="bg-[#0F1622] border border-[#223444] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1 text-[#5E7488]">
                    {s.icon}
                    <span className="text-xs">{s.label}</span>
                  </div>
                  <p className="text-[#EDF2FA] font-semibold text-sm">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Work hours */}
            <div>
              <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Часы работы</label>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={workFrom}
                  onChange={(e) => setWorkFrom(e.target.value)}
                  className="bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
                />
                <span className="text-[#5E7488] text-sm">—</span>
                <input
                  type="time"
                  value={workTo}
                  onChange={(e) => setWorkTo(e.target.value)}
                  className="bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
                />
                <span className="text-[#5E7488] text-xs">Вне времени бот молчит</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Disconnect */}
              {confirmDisconnect ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#8299B4]">Отключить канал?</span>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors flex items-center gap-1"
                  >
                    {disconnecting ? <RefreshCw size={11} className="animate-spin" /> : <Unplug size={11} />}
                    Отключить
                  </button>
                  <button
                    onClick={() => setConfirmDisconnect(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#223444] text-[#8299B4] text-xs hover:border-[#2C4460] transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDisconnect(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#223444] text-[#5E7488] text-xs font-medium hover:border-red-500/30 hover:text-red-400 transition-colors"
                >
                  <Unplug size={13} />
                  Отключить
                </button>
              )}

              {/* Save + reconnect */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-[#223444] text-[#8299B4] text-xs font-medium hover:border-[#2C4460] hover:text-[#EDF2FA] transition-colors"
                >
                  Переподключить
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-1.5 rounded-lg bg-[#00FF00] text-black text-xs font-semibold hover:bg-[#ccff33] transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>

            <div className="bg-[#0F1622] border border-[#223444] rounded-lg p-3 flex items-start gap-2">
              <MessageSquare size={13} className="text-[#5E7488] flex-shrink-0 mt-0.5" />
              <p className="text-[#5E7488] text-xs">
                При отключении аккаунт перестанет принимать и отправлять сообщения через систему.
                Исходящие кампании также будут остановлены.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {drawerOpen && (
        <ChannelConnectDrawer
          channelCode={channelCode}
          channelName={channelName}
          existingConnectionId={
            status === "creating" || status === "pending_auth"
              ? connection?.id
              : null
          }
          resumeAtQr={status === "pending_auth"}
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => {
            setDrawerOpen(false);
            onRefetch();
          }}
        />
      )}
    </>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
