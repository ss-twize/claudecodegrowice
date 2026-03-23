"use client";

import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useClients } from "@/lib/hooks/useClients";
import { formatCurrency } from "@/lib/utils";
import { UserPlus, TrendingUp, MoonStar, RotateCcw, PieChart, Filter, Search, Bot } from "lucide-react";

const CLIENT_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  regular: "Активный",
  sleeping: "Спящий",
  lost: "Потерянный",
  vip: "VIP",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ru-RU");
}

export default function ClientsPage() {
  const { clients, loading } = useClients();
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [absenceFilter, setAbsenceFilter] = useState("all");
  const [automationFilter, setAutomationFilter] = useState("all");
  const [futureBookingFilter, setFutureBookingFilter] = useState("all");
  const [query, setQuery] = useState("");

  const channels = useMemo(() => Array.from(new Set(clients.map((client) => client.communicationChannel))).sort(), [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (statusFilter !== "all" && client.clientStatus !== statusFilter) return false;
      if (channelFilter !== "all" && client.communicationChannel !== channelFilter) return false;
      if (absenceFilter === "50+" && client.daysAbsent < 50) return false;
      if (absenceFilter === "lt50" && client.daysAbsent >= 50) return false;
      if (automationFilter === "yes" && !(client.daysAbsent >= 28 || client.visits > 0)) return false;
      if (automationFilter === "no" && (client.daysAbsent >= 28 || client.visits > 0)) return false;
      if (futureBookingFilter === "yes" && !client.upcomingAppointment) return false;
      if (futureBookingFilter === "no" && client.upcomingAppointment) return false;
      if (query.trim()) {
        const hay = `${client.name} ${client.phone}`.toLowerCase();
        if (!hay.includes(query.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [clients, statusFilter, channelFilter, absenceFilter, automationFilter, futureBookingFilter, query]);

  const summary = {
    newClients: clients.filter((client) => client.clientStatus === "new").length,
    active: clients.filter((client) => client.clientStatus === "regular" || client.clientStatus === "vip").length,
    sleeping: clients.filter((client) => client.clientStatus === "sleeping").length,
    returned: clients.filter((client) => client.daysAbsent >= 28 && client.daysAbsent <= 60).length,
    repeatShare: clients.length ? Math.round((clients.filter((client) => client.visits > 1).length / clients.length) * 100) : 0,
  };

  const tableRows = filteredClients.slice(0, 22).map((client) => ({
    ...client,
    scenarioTags: [client.daysAbsent >= 28 ? "повтор" : null, client.daysAbsent >= 50 ? "возврат" : null, client.visits > 0 ? "отзыв" : null].filter(Boolean),
    nextAppointment: client.upcomingAppointment ? "Есть запись" : "—",
  }));

  return (
    <div>
      <Header title="Клиенты" subtitle="Чистая база клиентов: статусы, возврат, каналы связи и участие в сценариях" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Новые" value={loading ? "—" : String(summary.newClients)} icon={<UserPlus size={18} />} accent />
          <MetricCard title="Активные" value={String(summary.active)} icon={<TrendingUp size={18} />} />
          <MetricCard title="Спящие" value={String(summary.sleeping)} icon={<MoonStar size={18} />} />
          <MetricCard title="Возвращённые" value={String(summary.returned)} icon={<RotateCcw size={18} />} />
          <MetricCard title="Доля повторных" value={`${summary.repeatShare}%`} icon={<PieChart size={18} />} />
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Фильтры базы</h3>
              <p className="text-[#5E7488] text-sm">Только те фильтры, по которым можно принять действие.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8299B4] px-3 py-2 rounded-lg border border-[#223444] bg-[#0A0D14]"><Filter size={13} />Статус · канал · 50 дней · автоматизации · будущая запись</div>
          </div>
          <div className="px-5 py-4 border-b border-[#1A2535] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
              <div className="xl:col-span-2 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5E7488]" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Имя или телефон" className="w-full bg-[#0A0D14] border border-[#223444] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#EDF2FA] placeholder-[#5E7488] outline-none focus:border-[#00FF00]/40" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#0A0D14] border border-[#223444] rounded-lg px-3 py-2.5 text-sm text-[#EDF2FA]"><option value="all">Статус: все</option>{Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="bg-[#0A0D14] border border-[#223444] rounded-lg px-3 py-2.5 text-sm text-[#EDF2FA]"><option value="all">Канал: любой</option>{channels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}</select>
              <select value={absenceFilter} onChange={(e) => setAbsenceFilter(e.target.value)} className="bg-[#0A0D14] border border-[#223444] rounded-lg px-3 py-2.5 text-sm text-[#EDF2FA]"><option value="all">Последний визит</option><option value="50+">Не был 50+ дней</option><option value="lt50">Был менее 50 дней назад</option></select>
              <select value={automationFilter} onChange={(e) => setAutomationFilter(e.target.value)} className="bg-[#0A0D14] border border-[#223444] rounded-lg px-3 py-2.5 text-sm text-[#EDF2FA]"><option value="all">Автоматизации</option><option value="yes">Участвовал</option><option value="no">Не участвовал</option></select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select value={futureBookingFilter} onChange={(e) => setFutureBookingFilter(e.target.value)} className="bg-[#0A0D14] border border-[#223444] rounded-lg px-3 py-2.5 text-sm text-[#EDF2FA]"><option value="all">Будущая запись</option><option value="yes">Есть запись</option><option value="no">Нет записи</option></select>
              <div className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-2.5 text-sm text-[#8299B4]">Показано: <span className="text-[#EDF2FA] font-semibold">{tableRows.length}</span> из {clients.length}</div>
              <div className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-2.5 text-sm text-[#8299B4] flex items-center gap-2"><Bot size={14} className="text-[#00FF00]" />Сценарии: повтор / возврат / отзыв</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["Имя", "Телефон", "Канал", "Статус", "Последний визит", "Визитов", "Сумма покупок", "Следующая запись", "Сценарии"].map((h) => <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((client) => (
                  <tr key={client.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{client.name}</td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.phone}</td>
                    <td className="px-5 py-3.5"><span className="text-xs px-2 py-1 rounded-md bg-[#1A2535] text-[#8299B4] border border-[#223444] whitespace-nowrap">{client.communicationChannel}</span></td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2 py-1 rounded-md border ${client.clientStatus === "vip" ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20" : client.clientStatus === "sleeping" || client.clientStatus === "lost" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-[#1A2535] text-[#EDF2FA] border-[#223444]"}`}>{CLIENT_STATUS_LABELS[client.clientStatus]}</span></td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{formatDate(client.lastVisitAt)}</td>
                    <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-semibold whitespace-nowrap">{client.visits}</td>
                    <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-semibold whitespace-nowrap">{formatCurrency(client.revenue)}</td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.nextAppointment}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {client.scenarioTags.length > 0 ? client.scenarioTags.map((tag) => <span key={tag} className="text-xs px-2 py-1 rounded-md bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20">{tag}</span>) : <span className="text-[#5E7488] text-sm">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
