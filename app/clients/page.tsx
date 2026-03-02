"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Header from "@/components/layout/Header";
import { marketingClients, clientPredictive } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { SortableHeader, useSortable } from "@/components/ui/SortableHeader";
import { useSystemStates } from "@/lib/hooks/useSystemStates";
import { useAuth } from "@/lib/auth";
import { callWebhook } from "@/lib/webhooks";
import { supabase, ORG_UID } from "@/lib/supabase";
import {
  Send, Bot, X, TrendingUp, AlertTriangle, UserPlus, UserX, Smile, Settings, Power,
} from "lucide-react";

const EMOJIS = [
  "❤️","🔥","✅","⭐","🎁","💰","🎉","💎",
  "✨","👋","💅","🌸","💄","👑","🙌","🤩",
  "😍","🥰","💪","⚡","🎊","🏷️","📅","💌",
  "🌟","🎀","💆","🌺","😊","🙏","👍","🆕",
];

const channels = Array.from(new Set(marketingClients.map((c) => c.channel)));

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
        <span className="text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-[#9198a1] border border-[#30363d]">
          {first}
        </span>
      )}
      {rest.length > 0 && (
        <>
          <span
            ref={badgeRef}
            className="text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-[#00FF00] border border-[#00FF00]/20 cursor-default select-none"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setOpen(false)}
          >
            +{rest.length}
          </span>
          {mounted && open && createPortal(
            <div
              className="fixed z-[9999] bg-[#1c2128] border border-[#30363d] rounded-lg p-2 shadow-xl flex flex-col gap-1 pointer-events-none"
              style={{
                top: pos.top,
                left: pos.left,
                transform: "translate(-100%, -100%) translateX(-8px) translateY(-4px)",
              }}
            >
              {services.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-[#9198a1] border border-[#30363d] whitespace-nowrap">
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

export default function ClientsPage() {
  const { role, isOwner } = useAuth();
  const { systems, setSystems } = useSystemStates();
  const autoSystems = systems.filter(s => s.system_code !== "main_agent");

  const [activeSegment, setActiveSegment] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [segment, setSegment] = useState("Все клиенты");
  const [campaignName, setCampaignName] = useState("");
  const [genderModalFilter, setGenderModalFilter] = useState("all");
  const [revenueFrom, setRevenueFrom] = useState("");
  const [ltvFrom, setLtvFrom] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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

  // Merge client data for sorting
  const mergedClients = useMemo(() =>
    marketingClients.map(c => ({
      ...c,
      segment: clientPredictive[c.id]?.segment,
      churnRisk: clientPredictive[c.id]?.churnRisk,
      score: clientPredictive[c.id]?.score ?? 0,
    })), []);

  const { sorted, sortCol, sortDir, onSort } = useSortable(mergedClients);

  const filtered = useMemo(() => {
    return sorted.filter((c) => {
      if (activeSegment !== "all" && c.segment !== activeSegment) return false;
      if (genderFilter !== "all" && c.gender !== genderFilter) return false;
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      return true;
    });
  }, [sorted, activeSegment, genderFilter, channelFilter]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: marketingClients.length };
    marketingClients.forEach((c) => {
      const seg = clientPredictive[c.id]?.segment;
      if (seg) counts[seg] = (counts[seg] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div>
      <Header title="Клиенты и Рассылка" subtitle="База клиентов и маркетинговые кампании" />
      <div className="p-6 space-y-6">

        {/* Status summary cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { key: "new",      label: "Новые клиенты",  icon: <UserPlus size={16} />,     color: "#00FF00" },
            { key: "active",   label: "Активные",       icon: <TrendingUp size={16} />,   color: "#60a5fa" },
            { key: "atRisk",   label: "Под риском",     icon: <AlertTriangle size={16} />, color: "#fbbf24" },
            { key: "inactive", label: "Неактивные",     icon: <UserX size={16} />,        color: "#f87171" },
          ].map((s) => (
            <button key={s.key} onClick={() => setActiveSegment(activeSegment === s.key ? "all" : s.key)}
              className={`text-left bg-[#161b22] border rounded-xl p-4 transition-all ${activeSegment === s.key ? "border-[#00FF00]/40" : "border-[#30363d] hover:border-[#3d444d]"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
                  {s.icon}
                </div>
                <span className="text-2xl font-bold" style={{ color: s.color }}>{segmentCounts[s.key] || 0}</span>
              </div>
              <p className="text-[#9198a1] text-sm">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Client Table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Клиенты</h3>
              <p className="text-[#7d8590] text-sm">{filtered.length} из {marketingClients.length} клиентов</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status tabs */}
              <div className="flex items-center gap-0.5 bg-[#0d1117] border border-[#30363d] rounded-lg p-1">
                {SEGMENTS.map(({ key, label }) => (
                  <button key={key} onClick={() => setActiveSegment(key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${activeSegment === key ? "bg-[#00FF00] text-black" : "text-[#9198a1] hover:text-[#e6edf3]"}`}>
                    {label}
                    {segmentCounts[key] !== undefined && (
                      <span className="ml-1 opacity-60">({segmentCounts[key]})</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 bg-[#0d1117] border border-[#30363d] rounded-lg p-1">
                {[["all", "Все"], ["Ж", "Ж"], ["М", "М"]].map(([val, label]) => (
                  <button key={val} onClick={() => setGenderFilter(val)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${genderFilter === val ? "bg-[#00FF00] text-black" : "text-[#9198a1] hover:text-[#e6edf3]"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] text-[#9198a1] text-xs rounded-lg px-3 py-2 outline-none">
                <option value="all">Все каналы</option>
                {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
              </select>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-[#00FF00] text-black font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#ccff33] transition-colors">
                <Send size={14} />Новая рассылка
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  <SortableHeader label="ФИО"         col="name"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Телефон"     col="phone"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">Пол</th>
                  <SortableHeader label="Выручка"     col="revenue"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">Канал</th>
                  <th className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">Telegram</th>
                  <SortableHeader label="Статус"      col="segment"   sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Риск оттока" col="churnRisk" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Скор"        col="score"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">Услуги</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const segColor = client.segment ? SEGMENT_COLORS[client.segment] : null;
                  const riskColor = client.churnRisk ? RISK_COLORS[client.churnRisk] : null;
                  return (
                    <tr key={client.id} className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors">
                      <td className="px-5 py-3.5 text-[#e6edf3] text-sm font-medium whitespace-nowrap">{client.name}</td>
                      <td className="px-5 py-3.5 text-[#9198a1] text-sm whitespace-nowrap">{client.phone}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${client.gender === "Ж" ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                          {client.gender}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#00FF00] text-sm font-semibold whitespace-nowrap">{formatCurrency(client.revenue)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-1 rounded-md bg-[#21262d] text-[#9198a1] border border-[#30363d] whitespace-nowrap">{client.channel}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        {client.telegram ? <span className="text-[#00FF00]">{client.telegram}</span> : <span className="text-[#7d8590]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {client.segment && segColor ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${segColor.bg} ${segColor.text} ${segColor.border}`}>
                            {SEGMENT_LABELS[client.segment]}
                          </span>
                        ) : <span className="text-[#7d8590]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {client.churnRisk && riskColor ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${riskColor.bg} ${riskColor.text}`}>
                            {RISK_LABELS[client.churnRisk]}
                          </span>
                        ) : <span className="text-[#7d8590]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {client.score > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#00FF00]" style={{ width: `${client.score}%` }} />
                            </div>
                            <span className="text-[#9198a1] text-xs font-medium">{client.score}</span>
                          </div>
                        ) : <span className="text-[#7d8590]">—</span>}
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

        {/* Campaign Results */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Результаты кампаний</h3>
          <p className="text-[#7d8590] text-sm mb-6">История отправленных рассылок</p>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center justify-center mb-4">
              <Send size={22} className="text-[#7d8590]" />
            </div>
            <p className="text-[#e6edf3] font-medium mb-1">Кампаний пока нет</p>
            <p className="text-[#7d8590] text-sm max-w-xs">Создайте первую рассылку, нажав кнопку «Новая рассылка»</p>
          </div>
        </div>

        {/* Auto Systems */}
        <div>
          <div className="mb-4">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Автосистемы</h3>
            <p className="text-[#7d8590] text-sm">Автоматические сценарии работы с клиентами</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {autoSystems.map((sys) => (
              <div key={sys.system_code} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 card-hover flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center flex-shrink-0">
                    <Bot size={18} className="text-[#00FF00]" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md border ${
                    sys.enabled
                      ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20"
                      : "bg-[#21262d] text-[#7d8590] border-[#30363d]"
                  }`}>
                    {sys.enabled ? "Активно" : "Выключено"}
                  </span>
                </div>
                <p className="text-[#e6edf3] font-semibold mb-1 text-sm">{sys.name}</p>
                <p className="text-[#7d8590] text-xs mb-4 leading-relaxed flex-1">{sys.description}</p>
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
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#30363d] text-[#9198a1] hover:text-[#e6edf3] hover:border-[#3d444d] transition-colors"
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

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[#e6edf3] font-semibold font-unbounded">Новая рассылка</h3>
                <p className="text-[#7d8590] text-sm mt-0.5">Настройте маркетинговую кампанию</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#7d8590] hover:text-[#e6edf3] transition-colors ml-4 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Campaign name */}
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">
                  Название кампании
                  <span className="ml-2 text-[#7d8590] font-normal">— только для администраторов</span>
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Например: Февральская акция — неактивные клиенты"
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none placeholder-[#7d8590]"
                />
              </div>

              {/* Audience */}
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Целевая аудитория</label>
                <select value={segment} onChange={(e) => setSegment(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none">
                  {["Все клиенты", "Новые (этот месяц)", "Активные", "Под риском (30+ дней)", "Неактивные (3+ месяца)"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Filters */}
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-2 block">Дополнительные фильтры</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[#7d8590] text-xs mb-1.5">Пол</p>
                    <div className="flex gap-1">
                      {[["all","Все"],["Ж","Ж"],["М","М"]].map(([val, lbl]) => (
                        <button key={val} onClick={() => setGenderModalFilter(val)}
                          className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${genderModalFilter === val ? "bg-[#00FF00]/10 border-[#00FF00]/30 text-[#00FF00]" : "bg-[#0d1117] border-[#30363d] text-[#9198a1] hover:text-[#e6edf3]"}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[#7d8590] text-xs mb-1.5">Выручка от, ₽</p>
                    <input
                      type="number"
                      value={revenueFrom}
                      onChange={(e) => setRevenueFrom(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-xs rounded-md px-2.5 py-1.5 outline-none placeholder-[#7d8590]"
                    />
                  </div>
                  <div>
                    <p className="text-[#7d8590] text-xs mb-1.5">Ценность от, ₽</p>
                    <input
                      type="number"
                      value={ltvFrom}
                      onChange={(e) => setLtvFrom(e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-xs rounded-md px-2.5 py-1.5 outline-none placeholder-[#7d8590]"
                    />
                  </div>
                </div>
              </div>

              {/* Message text */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#9198a1] text-xs font-medium">Текст сообщения</label>
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker((v) => !v)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors ${showEmojiPicker ? "bg-[#00FF00]/10 border-[#00FF00]/30 text-[#00FF00]" : "bg-[#0d1117] border-[#30363d] text-[#9198a1] hover:text-[#e6edf3]"}`}
                    >
                      <Smile size={13} />
                      <span>Эмоджи</span>
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-[#1c2128] border border-[#30363d] rounded-xl p-2 shadow-2xl w-56">
                        <div className="grid grid-cols-8 gap-0.5">
                          {EMOJIS.map((em) => (
                            <button
                              key={em}
                              onClick={() => insertEmoji(em)}
                              className="text-base w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#30363d] transition-colors"
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
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none placeholder-[#7d8590] resize-none"
                />
                <p className="text-[#7d8590] text-xs mt-1">{msgText.length} символов</p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#30363d] text-[#9198a1] text-sm font-medium hover:border-[#3d444d] transition-colors">
                Отмена
              </button>
              <button
                onClick={async () => {
                  await callWebhook("rassylka_zapustit", {
                    campaign_name: campaignName,
                    segment,
                    text: msgText,
                    gender: genderModalFilter,
                    revenue_from: revenueFrom,
                    ltv_from: ltvFrom,
                  }, role);
                  setShowModal(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors">
                Запустить рассылку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
