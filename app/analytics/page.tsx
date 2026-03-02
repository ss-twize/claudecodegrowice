"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import { Lock } from "lucide-react";
import {
  analyticsKPIs, dailyContactsData, cancellationsData,
  noShowData, dailyKPITable, topDaysByRevenue,
  topDaysByAppointments, serviceAnalyticsData,
  analyticsTrends, revenueHistory,
} from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingUp, TrendingDown, CalendarCheck, MessageSquare, Receipt, AlertTriangle,
  RotateCcw, Clock, Zap, ArrowDownLeft, ArrowUpRight, MoonStar, Minus,
} from "lucide-react";

const PERIOD_LABELS: Record<string, string> = {
  month: "Февраль 2026 г.",
  quarter: "1-й квартал 2026",
  half: "Янв–Июн 2026",
};

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
      <p className="text-[#9198a1] mb-1">{label}</p>
      <p className="text-[#00FF00] font-semibold">{payload[0].value} обращений</p>
    </div>
  );
};

const ForecastTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
      <p className="text-[#9198a1] mb-1">{label}</p>
      {payload.map((p: any, i: number) => p.value != null && (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}:{" "}
          {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(p.value)}
        </p>
      ))}
    </div>
  );
};

const StackTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
      <p className="text-[#9198a1] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
      <p className="text-[#e6edf3] font-semibold">{payload[0].name}</p>
      <p className="text-[#00FF00]">{payload[0].value} отмен</p>
    </div>
  );
};

function KpiCard({ title, value, sub, icon, accent }: { title: string; value: string; sub?: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "bg-[#00FF00] border-[#00FF00]" : "bg-[#161b22] border-[#30363d]"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-black/20" : "bg-[#21262d] border border-[#30363d]"}`}>
          <span className={accent ? "text-black" : "text-[#00FF00]"}>{icon}</span>
        </div>
      </div>
      <p className={`text-xs font-medium mb-1 ${accent ? "text-black/70" : "text-[#9198a1]"}`}>{title}</p>
      <p className={`text-xl font-bold ${accent ? "text-black" : "text-[#e6edf3]"}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${accent ? "text-black/60" : "text-[#7d8590]"}`}>{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { isOwner } = useAuth();
  const [period, setPeriod] = useState<"month" | "quarter" | "half">("month");
  const k = analyticsKPIs;

  if (!isOwner) {
    return (
      <div>
        <Header title="Аналитика" subtitle="Полная аналитика бизнеса и агента" />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-5">
            <Lock size={28} className="text-[#30363d]" />
          </div>
          <h2 className="text-[#e6edf3] text-xl font-semibold mb-2">Нет доступа</h2>
          <p className="text-[#7d8590] text-sm">Этот раздел доступен только владельцу</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Аналитика" subtitle="Полная аналитика бизнеса и агента" />
      <div className="p-6 space-y-6">

        {/* Period selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-0.5 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
            {(["month", "quarter", "half"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? "bg-[#00FF00] text-black" : "text-[#9198a1] hover:text-[#e6edf3]"}`}>
                {p === "month" ? "Месяц" : p === "quarter" ? "Квартал" : "Полгода"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2">
            <CalendarCheck size={14} className="text-[#7d8590]" />
            <span className="text-[#e6edf3] text-sm font-medium">{PERIOD_LABELS[period]}</span>
          </div>
        </div>

        {/* Main KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Выручка за период" value={formatCurrency(k.revenue)} sub={`~${formatCurrency(k.revenueAvgDay)} в день`} icon={<TrendingUp size={16} />} accent />
          <KpiCard title="Записей за период" value={String(k.appointments)} sub={`~${k.appointmentsAvgDay} в день`} icon={<CalendarCheck size={16} />} />
          <KpiCard title="Конверсия в запись" value={`${k.conversionRate}%`} sub="переписки → запись" icon={<MessageSquare size={16} />} />
          <KpiCard title="Средний чек" value={formatCurrency(k.avgCheck)} icon={<Receipt size={16} />} />
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Не явки" value={`${k.noShowCount} (${k.noShowPercent}%)`} icon={<AlertTriangle size={16} />} />
          <KpiCard title="Сообщений на обращение" value={String(k.messagesPerContact)} sub="сред. длина диалога" icon={<MessageSquare size={16} />} />
          <KpiCard title="Возвращаемость" value={`${k.retention}%`} sub="повторные визиты" icon={<RotateCcw size={16} />} />
          <KpiCard title="Ср. скорость ответа" value={k.avgResponseTime} sub="время реакции агента" icon={<Clock size={16} />} />
        </div>

        {/* Messages banner */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-4">
          <p className="text-[#9198a1] text-sm font-medium">Объём коммуникаций за период</p>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <ArrowDownLeft size={16} className="text-[#00FF00]" />
              <div>
                <p className="text-[#e6edf3] font-bold text-lg">{k.incomingMessages.toLocaleString("ru")}</p>
                <p className="text-[#7d8590] text-xs">Входящих</p>
              </div>
            </div>
            <div className="w-px h-8 bg-[#30363d]" />
            <div className="flex items-center gap-2">
              <ArrowUpRight size={16} className="text-[#9198a1]" />
              <div>
                <p className="text-[#e6edf3] font-bold text-lg">{k.outgoingMessages.toLocaleString("ru")}</p>
                <p className="text-[#7d8590] text-xs">Исходящих</p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Записи вне рабочего времени" value={String(k.offHoursAppointments)} sub="агент работает пока все спят" icon={<MoonStar size={16} />} />
          <KpiCard title="Сэкономлено времени" value={`${k.timeSaved} ч`} sub="администратора" icon={<Zap size={16} />} />
          <KpiCard title="Реанимированных клиентов" value={String(k.reactivated)} sub="после рассылки по неактивным" icon={<RotateCcw size={16} />} />
          <KpiCard title="Обращений всего" value={String(k.incomingMessages)} sub="уникальных контактов" icon={<MessageSquare size={16} />} />
        </div>

        {/* Revenue History — full width */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Выручка по месяцам</h3>
            <p className="text-[#7d8590] text-sm">Октябрь 2025 — февраль 2026</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueHistory} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<ForecastTooltip />} />
              <Line type="monotone" dataKey="value" name="Выручка" stroke="#00FF00" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trends table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#30363d]">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Тренды: текущий vs прошлый месяц</h3>
            <p className="text-[#7d8590] text-sm">Сравнительный анализ ключевых метрик</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  {["Метрика", "Прошлый месяц", "Текущий месяц", "Изменение"].map((h) => (
                    <th key={h} className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyticsTrends.map((row) => {
                  const diff = row.current - row.previous;
                  const pct = Math.round((diff / row.previous) * 100);
                  const isPositive = row.metric === "Не явки" ? diff <= 0 : diff >= 0;
                  const formatVal = (v: number) => {
                    if (row.unit === "currency") return formatCurrency(v);
                    if (row.unit === "percent") return `${v}%`;
                    return String(v);
                  };
                  return (
                    <tr key={row.metric} className="border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors">
                      <td className="px-5 py-3 text-[#e6edf3] text-sm font-medium">{row.metric}</td>
                      <td className="px-5 py-3 text-[#9198a1] text-sm">{formatVal(row.previous)}</td>
                      <td className="px-5 py-3 text-[#e6edf3] text-sm font-semibold">{formatVal(row.current)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {diff === 0 ? (
                            <Minus size={14} className="text-[#9198a1]" />
                          ) : isPositive ? (
                            <TrendingUp size={14} className="text-[#00FF00]" />
                          ) : (
                            <TrendingDown size={14} className="text-red-400" />
                          )}
                          <span className={`text-sm font-semibold ${diff === 0 ? "text-[#9198a1]" : isPositive ? "text-[#00FF00]" : "text-red-400"}`}>
                            {diff >= 0 ? "+" : ""}{pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart: Daily contacts */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Уникальные обращения по дням</h3>
          <p className="text-[#7d8590] text-sm mb-5">Динамика входящих контактов</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyContactsData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="contactsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#7d8590", fontSize: 11 }} axisLine={false} tickLine={false}
                interval={Math.floor(dailyContactsData.length / 7)} />
              <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<AreaTooltip />} />
              <Area type="monotone" dataKey="contacts" stroke="#00FF00" strokeWidth={2}
                fill="url(#contactsGrad)" dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Charts row: Cancellations + No-show */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Отмены записей</h3>
            <p className="text-[#7d8590] text-sm mb-4">По категориям за период</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={cancellationsData} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                    dataKey="count" strokeWidth={0}>
                    {cancellationsData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {cancellationsData.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[#9198a1] text-xs">{item.type}</span>
                    </div>
                    <span className="text-[#e6edf3] text-xs font-semibold">{item.count}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#21262d] flex justify-between">
                  <span className="text-[#7d8590] text-xs">Итого</span>
                  <span className="text-[#e6edf3] text-xs font-bold">{cancellationsData.reduce((s, c) => s + c.count, 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Записи: пришли и не пришли</h3>
            <p className="text-[#7d8590] text-sm mb-4">Посещаемость по дням</p>
            <div className="flex items-center gap-4 mb-3 text-xs">
              {[{ color: "#00FF00", label: "Пришли" }, { color: "#f87171", label: "Не пришли" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                  <span className="text-[#9198a1]">{l.label}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={noShowData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#7d8590", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip content={<StackTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
                  <Bar dataKey="came" name="Пришли" stackId="a" fill="#00FF00" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="noShow" name="Не пришли" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Daily KPI Table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#30363d]">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Ежедневная статистика</h3>
            <p className="text-[#7d8590] text-sm">Последние {dailyKPITable.length} дней</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  {["День", "Обращения", "Сообщения", "Записи", "Выручка", "Не пришли"].map((h) => (
                    <th key={h} className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyKPITable.map((row) => (
                  <tr key={row.date} className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors">
                    <td className="px-5 py-3 text-[#e6edf3] text-sm font-medium">{row.date}</td>
                    <td className="px-5 py-3 text-[#9198a1] text-sm">{row.contacts}</td>
                    <td className="px-5 py-3 text-[#9198a1] text-sm">{row.messages}</td>
                    <td className="px-5 py-3 text-[#e6edf3] text-sm font-semibold">{row.appointments}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-semibold ${row.noShow > 0 ? "text-red-400" : "text-[#9198a1]"}`}>
                        {row.noShow > 0 ? row.noShow : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#30363d]">
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Топ дней по выручке</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  {["#", "День", "Выручка", "Записи", "Обращения"].map((h) => (
                    <th key={h} className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topDaysByRevenue.map((row, i) => (
                  <tr key={row.date} className="border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors">
                    <td className="px-5 py-3 text-[#7d8590] text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-[#e6edf3] text-sm">{row.date}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3 text-[#9198a1] text-sm">{row.appointments}</td>
                    <td className="px-5 py-3 text-[#9198a1] text-sm">{row.contacts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#30363d]">
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Топ дней по записям</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  {["#", "День", "Записи", "Выручка", "Не пришли"].map((h) => (
                    <th key={h} className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topDaysByAppointments.map((row, i) => (
                  <tr key={row.date} className="border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors">
                    <td className="px-5 py-3 text-[#7d8590] text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-[#e6edf3] text-sm">{row.date}</td>
                    <td className="px-5 py-3 text-[#e6edf3] text-sm font-semibold">{row.appointments}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-semibold ${row.noShow > 0 ? "text-red-400" : "text-[#9198a1]"}`}>
                        {row.noShow > 0 ? row.noShow : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service analytics */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#30363d]">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Аналитика услуг</h3>
            <p className="text-[#7d8590] text-sm">Топ услуг по выручке и количеству</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  {["#", "Услуга", "Выручка", "Количество", "Средний чек"].map((h) => (
                    <th key={h} className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serviceAnalyticsData.map((row, i) => (
                  <tr key={row.name} className="border-b border-[#21262d] last:border-0 hover:bg-[#1c2128] transition-colors">
                    <td className="px-5 py-3 text-[#7d8590] text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-[#e6edf3] text-sm font-medium">{row.name}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3 text-[#9198a1] text-sm">{row.count} визитов</td>
                    <td className="px-5 py-3 text-[#e6edf3] text-sm font-semibold">{formatCurrency(row.avgCheck)}</td>
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
