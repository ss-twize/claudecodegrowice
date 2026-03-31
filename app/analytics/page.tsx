"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import RevenueChart from "@/components/charts/RevenueChart";
import MetricCard from "@/components/ui/MetricCard";
import { ORG_UID, supabase } from "@/lib/supabase";
import {
  analyticsKPIs, cancellationsData,
  dailyKPITable, topDaysByRevenue,
  topDaysByAppointments, serviceAnalyticsData,
  analyticsTrends, revenueData,
} from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingUp, TrendingDown, CalendarCheck, MessageSquare, Receipt, AlertTriangle,
  RotateCcw, Clock, Zap, ArrowDownLeft, ArrowUpRight, MoonStar, Minus, ChevronDown,
} from "lucide-react";

type AnalyticsPeriod = "all" | "week" | "month" | "quarter" | "year";

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "all", label: "Все время" },
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "year", label: "Год" },
];

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#8299B4] mb-1">{label}</p>
      <p className="text-[#00FF00] font-semibold">{payload[0].value} обращений</p>
    </div>
  );
};

const StackTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#8299B4] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#EDF2FA] font-semibold">{payload[0].name}</p>
      <p className="text-[#00FF00]">{payload[0].value} отмен</p>
    </div>
  );
};

// ── Chart data helpers ────────────────────────────────────────────────────────

const CHART_MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const CHART_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function chartSeed(n: number) {
  const x = Math.sin(n * 9301 + 49297) * 10000;
  return x - Math.floor(x);
}

function makeContactsData(period: AnalyticsPeriod) {
  if (period === "year" || period === "all") {
    return CHART_MONTHS.map((date, i) => ({
      date,
      contacts: Math.round(450 + chartSeed(i * 73) * 350),
    }));
  }
  if (period === "quarter") {
    const now = new Date();
    const startMonth = Math.floor(now.getMonth() / 3) * 3;
    return Array.from({ length: 3 }, (_, i) => ({
      date: CHART_MONTHS[startMonth + i],
      contacts: Math.round(150 + chartSeed((startMonth + i) * 31) * 150),
    }));
  }
  if (period === "month") {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => ({
      date: String(i + 1),
      contacts: Math.round(15 + chartSeed((i + 1) * 17) * 30),
    }));
  }
  // week
  return CHART_DAYS.map((date, i) => ({
    date,
    contacts: Math.round(15 + chartSeed(i * 31) * 30),
  }));
}

function makeNoShowData(period: AnalyticsPeriod) {
  if (period === "year" || period === "all") {
    return CHART_MONTHS.map((date, i) => ({
      date,
      came: Math.round(180 + chartSeed(i * 61) * 150),
      noShow: Math.round(8 + chartSeed(i * 61 + 50) * 15),
    }));
  }
  if (period === "quarter") {
    const now = new Date();
    const startMonth = Math.floor(now.getMonth() / 3) * 3;
    return Array.from({ length: 3 }, (_, i) => ({
      date: CHART_MONTHS[startMonth + i],
      came: Math.round(65 + chartSeed((startMonth + i) * 43) * 55),
      noShow: Math.round(3 + chartSeed((startMonth + i) * 43 + 50) * 7),
    }));
  }
  if (period === "month") {
    const now = new Date();
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => ({
      date: String(i + 1),
      came: Math.round(6 + chartSeed((i + 1) * 23) * 10),
      noShow: chartSeed((i + 1) * 23 + 50) > 0.7 ? Math.round(1 + chartSeed((i + 1) * 23 + 100)) : 0,
    }));
  }
  // week
  return CHART_DAYS.map((date, i) => ({
    date,
    came: Math.round(6 + chartSeed(i * 19) * 10),
    noShow: chartSeed(i * 19 + 30) > 0.6 ? 1 : 0,
  }));
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [periodOffset, setPeriodOffset] = useState(0);
  const [registrationDate, setRegistrationDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const k = analyticsKPIs;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("clients_tg")
        .select("created_at")
        .eq("org_uid", ORG_UID)
        .order("created_at", { ascending: true })
        .limit(1);

      if (cancelled || error || !data?.length) return;
      const parsed = new Date(data[0].created_at);
      if (!Number.isNaN(parsed.getTime())) {
        setRegistrationDate(parsed);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dateOptions = useMemo(() => {
    const now = new Date();
    const formatMonthYear = (date: Date) =>
      date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, (s) => s.toUpperCase());
    const formatDay = (date: Date) =>
      date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (period === "all") {
      return [{ value: 0, label: `${formatMonthYear(registrationDate)} — ${formatMonthYear(now)}` }];
    }

    if (period === "week") {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 6);
      const normalizedStart = weekStart < registrationDate ? registrationDate : weekStart;
      return normalizedStart <= now
        ? [{ value: 0, label: `${formatDay(normalizedStart)} — ${formatDay(now)}` }]
        : [];
    }

    if (period === "month") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return monthEnd >= registrationDate ? [{ value: 0, label: formatMonthYear(monthStart) }] : [];
    }

    if (period === "quarter") {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
      const quarterEnd = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
      const q = Math.floor(quarterStart.getMonth() / 3) + 1;
      return quarterEnd >= registrationDate ? [{ value: 0, label: `${q}-й квартал ${quarterStart.getFullYear()}` }] : [];
    }

    return new Date(now.getFullYear(), 11, 31) >= registrationDate
      ? [{ value: 0, label: String(now.getFullYear()) }]
      : [];
  }, [period, registrationDate]);

  const registrationMonthLabel = useMemo(
    () => registrationDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, (s) => s.toUpperCase()),
    [registrationDate]
  );

  useEffect(() => {
    if (dateOptions.length === 0) return;
    if (!dateOptions.some((option) => option.value === periodOffset)) {
      setPeriodOffset(dateOptions[0].value);
    }
  }, [dateOptions, periodOffset]);

  const selectedDateLabel =
    period === "all"
      ? `от ${registrationMonthLabel}`
      : dateOptions.find((option) => option.value === periodOffset)?.label ?? "Нет доступных дат";

  const contactsChartData = useMemo(() => makeContactsData(period), [period]);
  const noShowChartData = useMemo(() => makeNoShowData(period), [period]);

  const contactsChartTitle =
    period === "year" || period === "all"
      ? "Уникальные обращения по месяцам"
      : period === "quarter"
      ? "Уникальные обращения по кварталу"
      : period === "week"
      ? "Уникальные обращения по дням недели"
      : "Уникальные обращения по дням";

  const contactsXInterval =
    period === "month" ? Math.max(0, Math.floor(contactsChartData.length / 8) - 1) : 0;
  const noShowXInterval =
    period === "month" ? Math.max(0, Math.floor(noShowChartData.length / 8) - 1) : 0;

  return (
    <div>
      <Header title="Аналитика" subtitle="Полная аналитика бизнеса и агента" />
      <div className="p-6 space-y-6">

        <div className="grid grid-cols-1 xl:grid-cols-[auto,1fr] gap-4 items-stretch">
          {/* Period selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-14 flex items-center gap-0.5 bg-[#0F1622] border border-[#223444] rounded-lg p-1">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPeriod(option.value);
                    setPeriodOffset(0);
                    setDateMenuOpen(false);
                  }}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    period === option.value ? "bg-[#00FF00] text-black" : "text-[#8299B4] hover:text-[#EDF2FA]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (period === "all") return;
                  setDateMenuOpen((prev) => !prev);
                }}
                className={`h-14 inline-flex items-center gap-2 bg-[#0F1622] border border-[#223444] rounded-lg px-3 text-[#EDF2FA] text-sm font-medium ${
                  period === "all" ? "cursor-default" : ""
                }`}
              >
                <CalendarCheck size={14} className="text-[#5E7488]" />
                <span>{selectedDateLabel}</span>
                {period !== "all" && (
                  <ChevronDown size={14} className={`text-[#5E7488] transition-transform ${dateMenuOpen ? "rotate-180" : ""}`} />
                )}
              </button>
              {period !== "all" && dateMenuOpen && (
                <div className="absolute z-20 top-full left-0 mt-1 min-w-[260px] max-h-72 overflow-y-auto rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl py-1">
                  {dateOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPeriodOffset(option.value);
                        setDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        option.value === periodOffset
                          ? "text-[#00FF00] bg-[#00FF00]/10"
                          : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages banner */}
          <div className="h-14 bg-[#0F1622] border border-[#223444] rounded-lg px-3 flex items-center justify-between gap-4">
            <p className="text-[#8299B4] text-sm font-medium">Объём коммуникаций</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <ArrowDownLeft size={16} className="text-[#00FF00]" />
                <p className="text-[#5E7488] text-sm"><span className="text-[#EDF2FA] font-bold">{k.incomingMessages.toLocaleString("ru")}</span> Входящих</p>
              </div>
              <div className="w-px h-6 bg-[#223444]" />
              <div className="flex items-center gap-2 whitespace-nowrap">
                <ArrowUpRight size={16} className="text-[#8299B4]" />
                <p className="text-[#5E7488] text-sm"><span className="text-[#EDF2FA] font-bold">{k.outgoingMessages.toLocaleString("ru")}</span> Исходящих</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Выручка за период" value={formatCurrency(k.revenue)} changeLabel={`~${formatCurrency(k.revenueAvgDay)} в день`} icon={<TrendingUp size={16} />} accent compact />
          <MetricCard title="Записей за период" value={String(k.appointments)} changeLabel={`~${k.appointmentsAvgDay} в день`} icon={<CalendarCheck size={16} />} compact />
          <MetricCard title="Конверсия в запись" value={`${k.conversionRate}%`} changeLabel="переписки → запись" icon={<MessageSquare size={16} />} compact />
          <MetricCard title="Средний чек" value={formatCurrency(k.avgCheck)} icon={<Receipt size={16} />} compact />
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Не явки" value={`${k.noShowCount} (${k.noShowPercent}%)`} icon={<AlertTriangle size={16} />} compact />
          <MetricCard title="Сообщений на обращение" value={String(k.messagesPerContact)} changeLabel="сред. длина диалога" icon={<MessageSquare size={16} />} compact />
          <MetricCard title="Возвращаемость" value={`${k.retention}%`} changeLabel="повторные визиты" icon={<RotateCcw size={16} />} compact />
          <MetricCard title="Ср. скорость ответа" value={k.avgResponseTime} changeLabel="время реакции агента" icon={<Clock size={16} />} compact />
        </div>

        {/* Operational metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Записи вне рабочего времени" value={String(k.offHoursAppointments)} changeLabel="агент работает пока все спят" icon={<MoonStar size={16} />} compact />
          <MetricCard title="Сэкономлено времени" value={`${k.timeSaved} ч`} changeLabel="администратора" icon={<Zap size={16} />} compact />
          <MetricCard title="Реанимированных клиентов" value={String(k.reactivated)} changeLabel="после рассылки по неактивным" icon={<RotateCcw size={16} />} compact />
          <MetricCard title="Обращений всего" value={String(k.incomingMessages)} changeLabel="уникальных контактов" icon={<MessageSquare size={16} />} compact />
        </div>

        {/* Revenue movement chart */}
        <RevenueChart data={revenueData} />

        {/* Trends table */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-2 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Тренды: текущий / прошлый месяц</h3>
            <p className="text-[#5E7488] text-sm">Сравнительный анализ ключевых метрик</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["Метрика", "Прошлый месяц", "Текущий месяц", "Изменение"].map((h) => (
                    <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
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
                    <tr key={row.metric} className="border-b border-[#1A2535] last:border-0 hover:bg-[#141E2B] transition-colors">
                      <td className="px-5 py-3 text-[#EDF2FA] text-sm font-medium">{row.metric}</td>
                      <td className="px-5 py-3 text-[#8299B4] text-sm">{formatVal(row.previous)}</td>
                      <td className="px-5 py-3 text-[#EDF2FA] text-sm font-semibold">{formatVal(row.current)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {diff === 0 ? (
                            <Minus size={14} className="text-[#8299B4]" />
                          ) : isPositive ? (
                            <TrendingUp size={14} className="text-[#00FF00]" />
                          ) : (
                            <TrendingDown size={14} className="text-red-400" />
                          )}
                          <span className={`text-sm font-semibold ${diff === 0 ? "text-[#8299B4]" : isPositive ? "text-[#00FF00]" : "text-red-400"}`}>
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

        {/* Chart: Contacts */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">{contactsChartTitle}</h3>
          <p className="text-[#5E7488] text-sm mb-5">Динамика входящих контактов</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={contactsChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="contactsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#5E7488", fontSize: 11 }} axisLine={false} tickLine={false}
                interval={contactsXInterval} />
              <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<AreaTooltip />} />
              <Area type="monotone" dataKey="contacts" stroke="#00FF00" strokeWidth={2}
                fill="url(#contactsGrad)" dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Charts row: Cancellations + No-show */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">Отмены записей</h3>
            <p className="text-[#5E7488] text-sm mb-4">По категориям за период</p>
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
                      <span className="text-[#8299B4] text-xs">{item.type}</span>
                    </div>
                    <span className="text-[#EDF2FA] text-xs font-semibold">{item.count}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#1A2535] flex justify-between">
                  <span className="text-[#5E7488] text-xs">Итого</span>
                  <span className="text-[#EDF2FA] text-xs font-bold">{cancellationsData.reduce((s, c) => s + c.count, 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">Записи: пришли и не пришли</h3>
            <p className="text-[#5E7488] text-sm mb-4">Посещаемость по дням</p>
            <div className="flex items-center gap-4 mb-3 text-xs">
              {[{ color: "#00FF00", label: "Пришли" }, { color: "#f87171", label: "Не пришли" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                  <span className="text-[#8299B4]">{l.label}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={noShowChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#5E7488", fontSize: 11 }} axisLine={false} tickLine={false}
                    interval={noShowXInterval} />
                  <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={25} />
                  <Tooltip content={<StackTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
                  <Bar dataKey="came" name="Пришли" stackId="a" fill="#00FF00" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="noShow" name="Не пришли" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Daily KPI Table */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Ежедневная статистика</h3>
            <p className="text-[#5E7488] text-sm">Последние {dailyKPITable.length} дней</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["День", "Обращения", "Сообщения", "Записи", "Выручка", "Не пришли"].map((h) => (
                    <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyKPITable.map((row) => (
                  <tr key={row.date} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm font-medium">{row.date}</td>
                    <td className="px-5 py-3 text-[#8299B4] text-sm">{row.contacts}</td>
                    <td className="px-5 py-3 text-[#8299B4] text-sm">{row.messages}</td>
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm font-semibold">{row.appointments}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-semibold ${row.noShow > 0 ? "text-red-400" : "text-[#8299B4]"}`}>
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
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#223444]">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Топ дней по выручке</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["#", "День", "Выручка", "Записи", "Обращения"].map((h) => (
                    <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topDaysByRevenue.map((row, i) => (
                  <tr key={row.date} className="border-b border-[#1A2535] last:border-0 hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3 text-[#5E7488] text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm">{row.date}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3 text-[#8299B4] text-sm">{row.appointments}</td>
                    <td className="px-5 py-3 text-[#8299B4] text-sm">{row.contacts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#223444]">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Топ дней по записям</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["#", "День", "Записи", "Выручка", "Не пришли"].map((h) => (
                    <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topDaysByAppointments.map((row, i) => (
                  <tr key={row.date} className="border-b border-[#1A2535] last:border-0 hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3 text-[#5E7488] text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm">{row.date}</td>
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm font-semibold">{row.appointments}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-semibold ${row.noShow > 0 ? "text-red-400" : "text-[#8299B4]"}`}>
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
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Аналитика услуг</h3>
            <p className="text-[#5E7488] text-sm">Топ услуг по выручке и количеству</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["#", "Услуга", "Выручка", "Количество", "Средний чек"].map((h) => (
                    <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {serviceAnalyticsData.map((row, i) => (
                  <tr key={row.name} className="border-b border-[#1A2535] last:border-0 hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3 text-[#5E7488] text-sm">{i + 1}</td>
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm font-medium">{row.name}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                    <td className="px-5 py-3 text-[#8299B4] text-sm">{row.count} визитов</td>
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm font-semibold">{formatCurrency(row.avgCheck)}</td>
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
