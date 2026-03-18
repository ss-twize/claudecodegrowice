"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Header from "@/components/layout/Header";
import { useClients } from "@/lib/hooks/useClients";
import { useCampaignLogs } from "@/lib/hooks/useCampaignLogs";
import { formatCurrency } from "@/lib/utils";
import { SortableHeader, useSortable } from "@/components/ui/SortableHeader";
import { useSystemStates } from "@/lib/hooks/useSystemStates";
import { useAuth } from "@/lib/auth";
import { callWebhook } from "@/lib/webhooks";
import { supabase, ORG_UID } from "@/lib/supabase";
import {
  Send, Bot, X, TrendingUp, AlertTriangle, UserPlus, UserX, Smile, Settings, Power, CheckCircle2, AlertCircle,
} from "lucide-react";

const EMOJIS = [
  "❤️","🔥","✅","⭐","🎁","💰","🎉","💎",
  "✨","👋","💅","🌸","💄","👑","🙌","🤩",
  "😍","🥰","💪","⚡","🎊","🏷️","📅","💌",
  "🌟","🎀","💆","🌺","😊","🙏","👍","🆕",
];

type TelegramFilter = "all" | "yes" | "no";

type ClientFilterOptions = {
  segment: string;
  gender: string;
  channel: string;
  churnRisk: string;
  telegram: TelegramFilter;
  query: string;
  minRevenue: number | null;
  maxRevenue: number | null;
  minScore: number | null;
  minLtv: number | null;
  minVisits: number | null;
};

function ServicesCell({ services }: { services: string[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const first = services[0];
  const rest = services.slice(1);

  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left });
    }
    setOpen(true);
  };

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {first && (
        <span className="text-xs px-2 py-0.5 rounded-md bg-[#1A2535] text-[#8299B4] border border-[#223444]">
          {first}
        </span>
      )}
      {rest.length > 0 && (
        <>
          <span
            ref={badgeRef}
            className="text-xs px-2 py-0.5 rounded-md bg-[#1A2535] text-[#00FF00] border border-[#00FF00]/20 cursor-default select-none"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setOpen(false)}
          >
            +{rest.length}
          </span>
          {mounted && open && createPortal(
            <div
              className="fixed z-[9999] bg-[#141E2B] border border-[#223444] rounded-lg p-2 shadow-xl flex flex-col gap-1 pointer-events-none"
              style={{
                top: pos.top,
                left: pos.left,
                transform: "translate(-100%, -100%) translateX(-8px) translateY(-4px)",
              }}
            >
              {services.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-[#1A2535] text-[#8299B4] border border-[#223444] whitespace-nowrap">
                  {s}
                </span>
              ))}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

const SEGMENTS = [
  { key: "all",      label: "Все клиенты" },
  { key: "new",      label: "Новые" },
  { key: "active",   label: "Активные" },
  { key: "atRisk",   label: "Под риском" },
  { key: "inactive", label: "Неактивные" },
];

const SEGMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new:      { bg: "bg-[#00FF00]/10",   text: "text-[#00FF00]",  border: "border-[#00FF00]/20" },
  active:   { bg: "bg-blue-500/10",    text: "text-blue-400",   border: "border-blue-500/20" },
  atRisk:   { bg: "bg-yellow-500/10",  text: "text-yellow-400", border: "border-yellow-500/20" },
  inactive: { bg: "bg-red-500/10",     text: "text-red-400",    border: "border-red-500/20" },
};

const SEGMENT_LABELS: Record<string, string> = {
  new: "Новый", active: "Активный", atRisk: "Под риском", inactive: "Неактивный",
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  low:    { bg: "bg-[#00FF00]/10",  text: "text-[#00FF00]" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  high:   { bg: "bg-red-500/10",    text: "text-red-400" },
};

const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий",
};

const CAMPAIGN_SEGMENT_TO_KEY: Record<string, string> = {
  "Все клиенты": "all",
  "Новые (этот месяц)": "new",
  "Активные": "active",
  "Под риском (30+ дней)": "atRisk",
  "Неактивные (3+ месяца)": "inactive",
};

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesClientFilter(client: {
  segment: string;
  gender: string;
  channel: string;
  churnRisk: string;
  telegram: string | null;
  name: string;
  phone: string;
  revenue: number;
  ltv: number;
  visits: number;
  score: number;
}, options: ClientFilterOptions): boolean {
  const normalizedQuery = options.query.trim().toLowerCase();

  if (options.segment !== "all" && client.segment !== options.segment) return false;
  if (options.gender !== "all" && client.gender !== options.gender) return false;
  if (options.channel !== "all" && client.channel !== options.channel) return false;
  if (options.churnRisk !== "all" && client.churnRisk !== options.churnRisk) return false;
  if (options.telegram === "yes" && !client.telegram) return false;
  if (options.telegram === "no" && client.telegram) return false;
  if (options.minRevenue !== null && client.revenue < options.minRevenue) return false;
  if (options.maxRevenue !== null && client.revenue > options.maxRevenue) return false;
  if (options.minScore !== null && client.score < options.minScore) return false;
  if (options.minLtv !== null && client.ltv < options.minLtv) return false;
  if (options.minVisits !== null && client.visits < options.minVisits) return false;
  if (normalizedQuery) {
    const searchable = [client.name, client.phone, client.telegram || ""].join(" ").toLowerCase();
    if (!searchable.includes(normalizedQuery)) return false;
  }

  return true;
}

export default function ClientsPage() {
  const { role, isOwner } = useAuth();
  const { clients, loading: clientsLoading } = useClients();
  const { logs: campaignLogs, loading: campaignLogsLoading } = useCampaignLogs();
  const { systems, setSystems } = useSystemStates();
  const autoSystems = systems.filter(s => s.system_code !== "main_agent");

  const [activeSegment, setActiveSegment] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [telegramFilter, setTelegramFilter] = useState<TelegramFilter>("all");
  const [query, setQuery] = useState("");
  const [revenueFromFilter, setRevenueFromFilter] = useState("");
  const [revenueToFilter, setRevenueToFilter] = useState("");
  const [scoreFromFilter, setScoreFromFilter] = useState("");
  const [ltvFromFilter, setLtvFromFilter] = useState("");
  const [visitsFromFilter, setVisitsFromFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [segment, setSegment] = useState("Все клиенты");
  const [campaignName, setCampaignName] = useState("");
  const [campaignQuery, setCampaignQuery] = useState("");
  const [genderModalFilter, setGenderModalFilter] = useState("all");
  const [campaignChannelFilter, setCampaignChannelFilter] = useState("Telegram");
  const [campaignRiskFilter, setCampaignRiskFilter] = useState("all");
  const [campaignTelegramFilter, setCampaignTelegramFilter] = useState<TelegramFilter>("yes");
  const [revenueFrom, setRevenueFrom] = useState("");
  const [revenueTo, setRevenueTo] = useState("");
  const [scoreFrom, setScoreFrom] = useState("");
  const [ltvFrom, setLtvFrom] = useState("");
  const [visitsFrom, setVisitsFrom] = useState("");

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [campaignToast, setCampaignToast] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);
  const [campaignSending, setCampaignSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!campaignToast) return;
    const timeoutId = window.setTimeout(() => setCampaignToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [campaignToast]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? msgText.length;
    const end = ta.selectionEnd ?? msgText.length;
    const next = msgText.slice(0, start) + emoji + msgText.slice(end);
    setMsgText(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleSystemToggle = async (systemCode: string, currentEnabled: boolean) => {
    if (!isOwner) return;
    const newEnabled = !currentEnabled;
    setSystems(prev => prev.map(s => s.system_code === systemCode ? { ...s, enabled: newEnabled } : s));
    await supabase.from("system_states").update({ enabled: newEnabled })
      .eq("org_uid", ORG_UID).eq("system_code", systemCode);
    await callWebhook("sistema_toggle", { system_code: systemCode, enabled: newEnabled }, role);
  };

  const handleSystemConfigure = async (systemCode: string) => {
    await callWebhook("sistema_nastroit", { system_code: systemCode }, role);
  };

  const channels = useMemo(() => Array.from(new Set(clients.map((c) => c.channel))).sort(), [clients]);

  const { sorted, sortCol, sortDir, onSort } = useSortable(clients);

  const filtered = useMemo(() => {
    const options: ClientFilterOptions = {
      segment: activeSegment,
      gender: genderFilter,
      channel: channelFilter,
      churnRisk: riskFilter,
      telegram: telegramFilter,
      query,
      minRevenue: toNumberOrNull(revenueFromFilter),
      maxRevenue: toNumberOrNull(revenueToFilter),
      minScore: toNumberOrNull(scoreFromFilter),
      minLtv: toNumberOrNull(ltvFromFilter),
      minVisits: toNumberOrNull(visitsFromFilter),
    };

    return sorted.filter((c) => matchesClientFilter(c, options));
  }, [
    sorted,
    activeSegment,
    genderFilter,
    channelFilter,
    riskFilter,
    telegramFilter,
    query,
    revenueFromFilter,
    revenueToFilter,
    scoreFromFilter,
    ltvFromFilter,
    visitsFromFilter,
  ]);

  const campaignRecipients = useMemo(() => {
    const options: ClientFilterOptions = {
      segment: CAMPAIGN_SEGMENT_TO_KEY[segment] || "all",
      gender: genderModalFilter,
      channel: "Telegram",
      churnRisk: campaignRiskFilter,
      telegram: "yes",
      query: campaignQuery,
      minRevenue: toNumberOrNull(revenueFrom),
      maxRevenue: toNumberOrNull(revenueTo),
      minScore: toNumberOrNull(scoreFrom),
      minLtv: toNumberOrNull(ltvFrom),
      minVisits: toNumberOrNull(visitsFrom),
    };

    return clients.filter((c) => matchesClientFilter(c, options));
  }, [
    clients,
    segment,
    genderModalFilter,
    campaignRiskFilter,
    campaignQuery,
    revenueFrom,
    revenueTo,
    scoreFrom,
    ltvFrom,
    visitsFrom,
  ]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clients.length };
    clients.forEach((c) => {
      if (c.segment) counts[c.segment] = (counts[c.segment] || 0) + 1;
    });
    return counts;
  }, [clients]);

  return (
    <div>
      <Header title="Клиенты и Рассылка" subtitle="База клиентов и маркетинговые кампании" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { key: "new",      label: "Новые клиенты",  icon: <UserPlus size={16} />,     color: "#00FF00" },
            { key: "active",   label: "Активные",       icon: <TrendingUp size={16} />,   color: "#60a5fa" },
            { key: "atRisk",   label: "Под риском",     icon: <AlertTriangle size={16} />, color: "#fbbf24" },
            { key: "inactive", label: "Неактивные",     icon: <UserX size={16} />,        color: "#f87171" },
          ].map((s) => (
            <button key={s.key} onClick={() => setActiveSegment(activeSegment === s.key ? "all" : s.key)}
              className={`text-left bg-[#0F1622] border rounded-xl p-4 transition-all ${activeSegment === s.key ? "border-[#00FF00]/40" : "border-[#223444] hover:border-[#2C4460]"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                  {s.icon}
                </div>
                <span className="text-2xl font-bold" style={{ color: s.color }}>{segmentCounts[s.key] || 0}</span>
              </div>
              <p className="text-[#8299B4] text-sm">{s.label}</p>
            </button>
          ))}
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Клиенты</h3>
              <p className="text-[#5E7488] text-sm">
                {clientsLoading ? "Загрузка..." : `${filtered.length} из ${clients.length} клиентов`}
              </p>
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-[#00FF00] text-black font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#ccff33] transition-colors">
              <Send size={14} />Новая рассылка
            </button>
          </div>

          <div className="px-5 py-4 border-b border-[#1A2535]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ФИО, телефон, @username"
                className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none placeholder-[#5E7488]"
              />
              <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-[#0A0D14] border border-[#223444] text-[#8299B4] text-xs rounded-lg px-3 py-2 outline-none">
                <option value="all">Канал: все</option>
                {channels.map((ch) => <option key={ch} value={ch}>{`Канал: ${ch}`}</option>)}
              </select>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-[#0A0D14] border border-[#223444] text-[#8299B4] text-xs rounded-lg px-3 py-2 outline-none">
                <option value="all">Риск: любой</option>
                <option value="low">Риск: низкий</option>
                <option value="medium">Риск: средний</option>
                <option value="high">Риск: высокий</option>
              </select>
              <select value={telegramFilter} onChange={(e) => setTelegramFilter(e.target.value as TelegramFilter)}
                className="bg-[#0A0D14] border border-[#223444] text-[#8299B4] text-xs rounded-lg px-3 py-2 outline-none">
                <option value="all">Telegram: любой</option>
                <option value="yes">Telegram: есть</option>
                <option value="no">Telegram: нет</option>
              </select>
              <input
                type="number"
                min="0"
                value={revenueFromFilter}
                onChange={(e) => setRevenueFromFilter(e.target.value)}
                placeholder="Выручка от"
                className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none placeholder-[#5E7488]"
              />
              <input
                type="number"
                min="0"
                value={revenueToFilter}
                onChange={(e) => setRevenueToFilter(e.target.value)}
                placeholder="Выручка до"
                className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none placeholder-[#5E7488]"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={scoreFromFilter}
                onChange={(e) => setScoreFromFilter(e.target.value)}
                placeholder="Скор от"
                className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none placeholder-[#5E7488]"
              />
              <input
                type="number"
                min="0"
                value={ltvFromFilter}
                onChange={(e) => setLtvFromFilter(e.target.value)}
                placeholder="LTV от"
                className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none placeholder-[#5E7488]"
              />
              <input
                type="number"
                min="0"
                value={visitsFromFilter}
                onChange={(e) => setVisitsFromFilter(e.target.value)}
                placeholder="Визитов от"
                className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none placeholder-[#5E7488]"
              />
              <div className="flex items-center gap-0.5 bg-[#0A0D14] border border-[#223444] rounded-lg p-1 overflow-x-auto">
                {[["all", "Пол: все"], ["Ж", "Ж"], ["М", "М"]].map(([val, label]) => (
                  <button key={val} onClick={() => setGenderFilter(val)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${genderFilter === val ? "bg-[#00FF00] text-black" : "text-[#8299B4] hover:text-[#EDF2FA]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-0.5 bg-[#0A0D14] border border-[#223444] rounded-lg p-1 mt-2 overflow-x-auto">
              {SEGMENTS.map(({ key, label }) => (
                <button key={key} onClick={() => setActiveSegment(key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${activeSegment === key ? "bg-[#00FF00] text-black" : "text-[#8299B4] hover:text-[#EDF2FA]"}`}>
                  {label}
                  {segmentCounts[key] !== undefined && (
                    <span className="ml-1 opacity-60">({segmentCounts[key]})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  <SortableHeader label="ФИО"         col="name"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Телефон"     col="phone"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Пол</th>
                  <SortableHeader label="Выручка"     col="revenue"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="LTV"         col="ltv"       sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Визиты"      col="visits"    sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Канал</th>
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Telegram</th>
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Источник</th>
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Город</th>
                  <SortableHeader label="Статус"      col="segment"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Риск оттока" col="churnRisk" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Скор"        col="score"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Услуги</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const segColor = client.segment ? SEGMENT_COLORS[client.segment] : null;
                  const riskColor = client.churnRisk ? RISK_COLORS[client.churnRisk] : null;
                  return (
                    <tr key={client.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                      <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{client.name}</td>
                      <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.phone}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${client.gender === "Ж" ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                          {client.gender}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#00FF00] text-sm font-semibold whitespace-nowrap">{formatCurrency(client.revenue)}</td>
                      <td className="px-5 py-3.5 text-[#00FF00] text-sm font-semibold whitespace-nowrap">{formatCurrency(client.ltv)}</td>
                      <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-semibold whitespace-nowrap">{client.visits}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-1 rounded-md bg-[#1A2535] text-[#8299B4] border border-[#223444] whitespace-nowrap">{client.channel}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        {client.telegram ? <span className="text-[#00FF00]">{client.telegram}</span> : <span className="text-[#5E7488]">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.source}</td>
                      <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.city}</td>
                      <td className="px-5 py-3.5">
                        {client.segment && segColor ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${segColor.bg} ${segColor.text} ${segColor.border}`}>
                            {SEGMENT_LABELS[client.segment]}
                          </span>
                        ) : <span className="text-[#5E7488]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {client.churnRisk && riskColor ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${riskColor.bg} ${riskColor.text}`}>
                            {RISK_LABELS[client.churnRisk]}
                          </span>
                        ) : <span className="text-[#5E7488]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {client.score > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#1A2535] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#00FF00]" style={{ width: `${client.score}%` }} />
                            </div>
                            <span className="text-[#8299B4] text-xs font-medium">{client.score}</span>
                          </div>
                        ) : <span className="text-[#5E7488]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <ServicesCell services={client.services} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">Результаты кампаний</h3>
          <p className="text-[#5E7488] text-sm mb-6">История отправленных рассылок и статусы выполнения</p>

          {campaignLogsLoading ? (
            <div className="flex items-center justify-center py-12 text-[#5E7488] text-sm">Загрузка логов рассылок...</div>
          ) : campaignLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-xl bg-[#1A2535] border border-[#223444] flex items-center justify-center mb-4">
                <Send size={22} className="text-[#5E7488]" />
              </div>
              <p className="text-[#EDF2FA] font-medium mb-1">Кампаний пока нет</p>
              <p className="text-[#5E7488] text-sm max-w-xs">Создайте первую рассылку, нажав кнопку «Новая рассылка»</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    <th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Дата</th>
                    <th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Кампания</th>
                    <th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Сегмент</th>
                    <th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Канал</th>
                    <th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Получатели</th>
                    <th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Статус</th>
                    <th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap min-w-[280px]">Результат</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignLogs.map((log) => {
                    const isSuccess = log.status === "успех";
                    const statusClasses = isSuccess
                      ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20"
                      : "bg-red-500/10 text-red-400 border-red-500/20";

                    return (
                      <tr key={log.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors align-top">
                        <td className="px-4 py-3 text-sm text-[#8299B4] whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-[#EDF2FA]">{log.campaignName}</div>
                          <div className="text-xs text-[#5E7488] line-clamp-2 max-w-md">{log.text || "Без текста сообщения"}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#8299B4] whitespace-nowrap">{log.segment}</td>
                        <td className="px-4 py-3 text-sm text-[#8299B4] whitespace-nowrap uppercase">{log.transport}</td>
                        <td className="px-4 py-3 text-sm text-[#EDF2FA] font-semibold whitespace-nowrap">{log.recipientsCount}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap ${statusClasses}`}>
                            {isSuccess ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#8299B4]">
                          {log.errorMessage ? (
                            <span className="text-red-400">{log.errorMessage}</span>
                          ) : (
                            <span>Отправка завершена{log.role ? ` · роль: ${log.role}` : ""}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Автосистемы</h3>
            <p className="text-[#5E7488] text-sm">Автоматические сценарии работы с клиентами</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {autoSystems.map((sys) => (
              <div key={sys.system_code} className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 card-hover flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-[#00FF00]" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md border ${
                    sys.enabled
                      ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20"
                      : "bg-[#1A2535] text-[#5E7488] border-[#223444]"
                  }`}>
                    {sys.enabled ? "Активно" : "Выключено"}
                  </span>
                </div>
                <p className="text-[#EDF2FA] font-semibold mb-1 text-sm">{sys.name}</p>
                <p className="text-[#5E7488] text-xs mb-4 leading-relaxed flex-1">{sys.description}</p>
                {isOwner && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSystemToggle(sys.system_code, sys.enabled)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        sys.enabled
                          ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                          : "border-[#00FF00]/30 text-[#00FF00] hover:bg-[#00FF00]/10"
                      }`}
                    >
                      <Power size={12} />
                      {sys.enabled ? "Выключить" : "Включить"}
                    </button>
                    <button
                      onClick={() => handleSystemConfigure(sys.system_code)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#223444] text-[#8299B4] hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
                      title="Настроить"
                    >
                      <Settings size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {campaignToast && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-sm w-[calc(100vw-2rem)] sm:w-full">
          <div className={`rounded-xl border shadow-2xl px-4 py-3 backdrop-blur-sm ${campaignToast.type === "success" ? "bg-[#0F1622]/95 border-[#00FF00]/30" : "bg-[#0F1622]/95 border-red-500/30"}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 ${campaignToast.type === "success" ? "text-[#00FF00]" : "text-red-400"}`}>
                {campaignToast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#EDF2FA]">{campaignToast.title}</div>
                <div className="text-sm text-[#8299B4] mt-1">{campaignToast.message}</div>
              </div>
              <button
                onClick={() => setCampaignToast(null)}
                className="text-[#5E7488] hover:text-[#EDF2FA] transition-colors"
                aria-label="Закрыть уведомление"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Новая рассылка</h3>
                <p className="text-[#5E7488] text-sm mt-0.5">Настройте подробную сегментацию и сообщение</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#5E7488] hover:text-[#EDF2FA] transition-colors ml-4 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">
                  Название кампании
                  <span className="ml-2 text-[#5E7488] font-normal">— только для администраторов</span>
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Например: Реактивация неактивных клиентов"
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none placeholder-[#5E7488]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Сегмент</label>
                  <select value={segment} onChange={(e) => setSegment(e.target.value)}
                    className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none">
                    {["Все клиенты", "Новые (этот месяц)", "Активные", "Под риском (30+ дней)", "Неактивные (3+ месяца)"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Поиск в аудитории</label>
                  <input
                    type="text"
                    value={campaignQuery}
                    onChange={(e) => setCampaignQuery(e.target.value)}
                    placeholder="ФИО, телефон, @username"
                    className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none placeholder-[#5E7488]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-2 block">Подробные фильтры аудитории</label>
                <p className="text-[#5E7488] text-xs mb-3">Рассылка отправляется только в Telegram клиентам с доступным Telegram-контактом.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <select value={genderModalFilter} onChange={(e) => setGenderModalFilter(e.target.value)}
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none">
                    <option value="all">Пол: все</option>
                    <option value="Ж">Пол: Ж</option>
                    <option value="М">Пол: М</option>
                  </select>
                  <select value={campaignChannelFilter} onChange={(e) => setCampaignChannelFilter(e.target.value)}
                    disabled
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none opacity-70 cursor-not-allowed">
                    <option value="Telegram">Канал: Telegram</option>
                  </select>
                  <select value={campaignRiskFilter} onChange={(e) => setCampaignRiskFilter(e.target.value)}
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none">
                    <option value="all">Риск: любой</option>
                    <option value="low">Риск: низкий</option>
                    <option value="medium">Риск: средний</option>
                    <option value="high">Риск: высокий</option>
                  </select>
                  <select value={campaignTelegramFilter} onChange={(e) => setCampaignTelegramFilter(e.target.value as TelegramFilter)}
                    disabled
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none opacity-70 cursor-not-allowed">
                    <option value="yes">Telegram: есть</option>
                  </select>

                  <input
                    type="number"
                    value={revenueFrom}
                    onChange={(e) => setRevenueFrom(e.target.value)}
                    placeholder="Выручка от, ₽"
                    min="0"
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none placeholder-[#5E7488]"
                  />
                  <input
                    type="number"
                    value={revenueTo}
                    onChange={(e) => setRevenueTo(e.target.value)}
                    placeholder="Выручка до, ₽"
                    min="0"
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none placeholder-[#5E7488]"
                  />
                  <input
                    type="number"
                    value={scoreFrom}
                    onChange={(e) => setScoreFrom(e.target.value)}
                    placeholder="Скор от"
                    min="0"
                    max="100"
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none placeholder-[#5E7488]"
                  />
                  <input
                    type="number"
                    value={ltvFrom}
                    onChange={(e) => setLtvFrom(e.target.value)}
                    placeholder="LTV от, ₽"
                    min="0"
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none placeholder-[#5E7488]"
                  />
                  <input
                    type="number"
                    value={visitsFrom}
                    onChange={(e) => setVisitsFrom(e.target.value)}
                    placeholder="Визитов от"
                    min="0"
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-xs rounded-md px-2.5 py-2 outline-none placeholder-[#5E7488]"
                  />
                  <div className="flex items-center text-xs text-[#8299B4] px-2.5 py-2 rounded-md border border-[#223444] bg-[#0A0D14]">
                    Получатели: <span className="ml-1 text-[#00FF00] font-semibold">{campaignRecipients.length}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#8299B4] text-xs font-medium">Текст сообщения</label>
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors ${showEmojiPicker ? "bg-[#00FF00]/10 border-[#00FF00]/30 text-[#00FF00]" : "bg-[#0A0D14] border-[#223444] text-[#8299B4] hover:text-[#EDF2FA]"}`}
                    >
                      <Smile size={13} />
                      <span>Эмоджи</span>
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-[#141E2B] border border-[#223444] rounded-xl p-2 shadow-2xl w-56">
                        <div className="grid grid-cols-8 gap-0.5">
                          {EMOJIS.map((em) => (
                            <button
                              key={em}
                              onClick={() => insertEmoji(em)}
                              className="text-base w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#223444] transition-colors"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  rows={4}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Введите текст рассылки..."
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none placeholder-[#5E7488] resize-none"
                />
                <p className="text-[#5E7488] text-xs mt-1">{msgText.length} символов</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#223444] text-[#8299B4] text-sm font-medium hover:border-[#2C4460] transition-colors">
                Отмена
              </button>
              <button
                onClick={async () => {
                  setCampaignSending(true);
                  const result = await callWebhook("rassylka_zapustit", {
                    campaign_name: campaignName || "Новая рассылка",
                    segment,
                    transport: "telegram",
                    text: msgText,
                    filters: {
                      query: campaignQuery,
                      gender: genderModalFilter,
                      channel: "Telegram",
                      churn_risk: campaignRiskFilter,
                      telegram: "yes",
                      revenue_from: revenueFrom,
                      revenue_to: revenueTo,
                      score_from: scoreFrom,
                      ltv_from: ltvFrom,
                      visits_from: visitsFrom,
                    },
                    recipients_count: campaignRecipients.length,
                    recipient_ids: campaignRecipients.map((c) => c.id),
                  }, role);

                  setCampaignSending(false);

                  if (result.ok) {
                    setCampaignToast({
                      type: "success",
                      title: "Рассылка отправлена",
                      message: `Кампания «${campaignName || "Новая рассылка"}» запущена на ${campaignRecipients.length} получателей.`,
                    });
                    setShowModal(false);
                  } else {
                    setCampaignToast({
                      type: "error",
                      title: result.configured ? "Ошибка отправки" : "Вебхук не настроен",
                      message: result.error || "Не удалось запустить рассылку. Проверьте настройки интеграции.",
                    });
                  }
                }}
                disabled={campaignSending || !msgText.trim() || campaignRecipients.length === 0}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                {campaignSending ? "Отправка..." : "Запустить рассылку"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
