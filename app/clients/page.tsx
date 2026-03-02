"use client";

import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import { marketingClients, autoSystems, clientPredictive } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { Send, Bot, X, TrendingUp, AlertTriangle, UserCheck, UserX } from "lucide-react";

const channels = Array.from(new Set(marketingClients.map((c) => c.channel)));

const SEGMENTS = [
  { key: "all", label: "Все клиенты" },
  { key: "VIP", label: "VIP" },
  { key: "active", label: "Активные" },
  { key: "atRisk", label: "Под риском" },
  { key: "inactive", label: "Неактивные" },
];

const SEGMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  VIP:      { bg: "bg-[#00FF00]/10",   text: "text-[#00FF00]",  border: "border-[#00FF00]/20" },
  active:   { bg: "bg-blue-500/10",    text: "text-blue-400",   border: "border-blue-500/20" },
  atRisk:   { bg: "bg-yellow-500/10",  text: "text-yellow-400", border: "border-yellow-500/20" },
  inactive: { bg: "bg-red-500/10",     text: "text-red-400",    border: "border-red-500/20" },
};

const SEGMENT_LABELS: Record<string, string> = {
  VIP: "VIP", active: "Активный", atRisk: "Под риском", inactive: "Неактивный",
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
  const [activeSegment, setActiveSegment] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [msgChannel, setMsgChannel] = useState("Telegram");
  const [msgText, setMsgText] = useState("");
  const [segment, setSegment] = useState("Все клиенты");

  const filtered = useMemo(() => {
    return marketingClients.filter((c) => {
      const pred = clientPredictive[c.id];
      if (activeSegment !== "all" && pred?.segment !== activeSegment) return false;
      if (genderFilter !== "all" && c.gender !== genderFilter) return false;
      if (channelFilter !== "all" && c.channel !== channelFilter) return false;
      return true;
    });
  }, [activeSegment, genderFilter, channelFilter]);

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
      <Header title="Клиенты и Рассылка" subtitle="CRM и маркетинговые кампании" />
      <div className="p-6 space-y-6">

        {/* Segment summary cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { key: "VIP",      label: "VIP клиенты",      icon: <UserCheck size={16} />, color: "#00FF00" },
            { key: "active",   label: "Активные",          icon: <TrendingUp size={16} />, color: "#60a5fa" },
            { key: "atRisk",   label: "Под риском",        icon: <AlertTriangle size={16} />, color: "#fbbf24" },
            { key: "inactive", label: "Неактивные",        icon: <UserX size={16} />, color: "#f87171" },
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

        {/* CRM Table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Клиенты</h3>
              <p className="text-[#7d8590] text-sm">{filtered.length} из {marketingClients.length} клиентов</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Segment tabs */}
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
                  {["ФИО", "Телефон", "Пол", "Выручка", "Канал", "Telegram", "AI Сегмент", "Риск оттока", "Скор", "Услуги"].map((h) => (
                    <th key={h} className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => {
                  const pred = clientPredictive[client.id];
                  const segColor = pred ? SEGMENT_COLORS[pred.segment] : null;
                  const riskColor = pred ? RISK_COLORS[pred.churnRisk] : null;
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
                        {pred && segColor ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${segColor.bg} ${segColor.text} ${segColor.border}`}>
                            {SEGMENT_LABELS[pred.segment]}
                          </span>
                        ) : <span className="text-[#7d8590]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {pred && riskColor ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${riskColor.bg} ${riskColor.text}`}>
                            {RISK_LABELS[pred.churnRisk]}
                          </span>
                        ) : <span className="text-[#7d8590]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {pred ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#00FF00]" style={{ width: `${pred.score}%` }} />
                            </div>
                            <span className="text-[#9198a1] text-xs font-medium">{pred.score}</span>
                          </div>
                        ) : <span className="text-[#7d8590]">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {client.services.map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-[#9198a1] border border-[#30363d] whitespace-nowrap">{s}</span>
                          ))}
                        </div>
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
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Автосистемы</h3>
          <p className="text-[#7d8590] text-sm mb-4">Результаты автоматических сценариев</p>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {autoSystems.map((sys) => (
              <div key={sys.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center">
                    <Bot size={18} className="text-[#00FF00]" />
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20">Активно</span>
                </div>
                <p className="text-[#e6edf3] font-semibold mb-1">{sys.name}</p>
                <p className="text-[#7d8590] text-xs mb-4">{sys.description}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Отправлено", value: sys.stats.sent, accent: false },
                    { label: "Ответили", value: sys.stats.responded, accent: false },
                    { label: "Записались", value: sys.stats.converted, accent: true },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#1c2128] rounded-lg p-2 text-center">
                      <p className={`font-bold text-sm ${s.accent ? "text-[#00FF00]" : "text-[#e6edf3]"}`}>{s.value}</p>
                      <p className="text-[#7d8590] text-xs">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[#7d8590] text-xs mt-3">Последний запуск: {sys.lastRun}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[#e6edf3] font-semibold font-unbounded">Новая рассылка</h3>
                <p className="text-[#7d8590] text-sm mt-0.5">Настройте маркетинговую кампанию</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#7d8590] hover:text-[#e6edf3] transition-colors ml-4">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Сегмент аудитории</label>
                <select value={segment} onChange={(e) => setSegment(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none">
                  {["Все клиенты", "VIP клиенты", "Активные", "Под риском оттока", "Неактивные 30+ дней", "Неактивные 50+ дней"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Канал отправки</label>
                <div className="flex gap-2">
                  {["Telegram", "WhatsApp", "SMS"].map((ch) => (
                    <button key={ch} onClick={() => setMsgChannel(ch)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${msgChannel === ch ? "bg-[#00FF00]/10 border-[#00FF00]/30 text-[#00FF00]" : "bg-[#0d1117] border-[#30363d] text-[#9198a1] hover:text-[#e6edf3]"}`}>
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Текст сообщения</label>
                <textarea rows={4} value={msgText} onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Введите текст рассылки..."
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none placeholder-[#7d8590] resize-none" />
                <p className="text-[#7d8590] text-xs mt-1">{msgText.length} символов</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#30363d] text-[#9198a1] text-sm font-medium hover:border-[#3d444d] transition-colors">
                Отмена
              </button>
              <button onClick={() => setShowModal(false)}
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
