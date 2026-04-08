"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import RevenueChart from "@/components/charts/RevenueChart";
import MetricCard from "@/components/ui/MetricCard";
import { ORG_UID, supabase } from "@/lib/supabase";
import { useAnalyticsData, type DayMetric, type MonthMetric } from "@/lib/hooks/useAnalyticsData";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
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

const CHART_MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

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

// ── Period helpers ──────────────────────────────────────────────────────────

function getMonWeekStart(date: Date): Date {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterDailyByPeriod(daily: DayMetric[], period: AnalyticsPeriod): DayMetric[] {
  const now = new Date();
  if (period === "week") {
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 6); cutoff.setHours(0, 0, 0, 0);
    return daily.filter(d => d.date >= cutoff.toISOString().split("T")[0]);
  }
  if (period === "month") {
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return daily.filter(d => d.date.startsWith(prefix));
  }
  if (period === "quarter") {
    const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return daily.filter(d => d.date >= qStart.toISOString().split("T")[0]);
  }
  if (period === "year") {
    return daily.filter(d => d.date.startsWith(String(now.getFullYear())));
  }
  return daily; // 'all'
}

function sumMetrics(items: DayMetric[]) {
  return items.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue,
    appointments: acc.appointments + d.appointments,
    unique_contacts: acc.unique_contacts + d.unique_contacts,
    incoming_messages: acc.incoming_messages + d.incoming_messages,
    outgoing_messages: acc.outgoing_messages + d.outgoing_messages,
    no_shows: acc.no_shows + d.no_shows,
    new_clients: acc.new_clients + d.new_clients,
  }), { revenue: 0, appointments: 0, unique_contacts: 0, incoming_messages: 0, outgoing_messages: 0, no_shows: 0, new_clients: 0 });
}

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  week: 7, month: 30, quarter: 90, year: 365, all: 30,
};

// ── Chart data builders ────────────────────────────────────────────────────

function buildContactsChart(period: AnalyticsPeriod, daily: DayMetric[], monthly: MonthMetric[]) {
  const now = new Date();
  if (period === "week") {
    const ws = getMonWeekStart(now);
    return WEEK_DAYS.map((date, i) => {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dm = daily.find(x => x.date === dateStr);
      return { date, contacts: dm?.unique_contacts ?? 0 };
    });
  }
  if (period === "month") {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return Array.from({ length: days }, (_, i) => {
      const dateStr = `${prefix}-${String(i + 1).padStart(2, "0")}`;
      const dm = daily.find(x => x.date === dateStr);
      return { date: String(i + 1), contacts: dm?.unique_contacts ?? 0 };
    });
  }
  if (period === "quarter") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return Array.from({ length: 3 }, (_, i) => {
      const mi = qStartMonth + i;
      const monthStr = `${now.getFullYear()}-${String(mi + 1).padStart(2, "0")}`;
      const mm = monthly.find(m => m.month.startsWith(monthStr));
      return { date: CHART_MONTHS[mi], contacts: mm?.unique_contacts ?? 0 };
    });
  }
  if (period === "year") {
    return CHART_MONTHS.map((date, i) => {
      const monthStr = `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
      const mm = monthly.find(m => m.month.startsWith(monthStr));
      return { date, contacts: mm?.unique_contacts ?? 0 };
    });
  }
  // 'all': all monthly data
  return monthly.map(m => ({
    date: new Date(m.month).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }),
    contacts: m.unique_contacts,
  }));
}

function buildNoShowChart(period: AnalyticsPeriod, daily: DayMetric[], monthly: MonthMetric[]) {
  const now = new Date();
  if (period === "week") {
    const ws = getMonWeekStart(now);
    return WEEK_DAYS.map((date, i) => {
      const d = new Date(ws); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dm = daily.find(x => x.date === dateStr);
      return { date, came: dm?.appointments ?? 0, noShow: dm?.no_shows ?? 0 };
    });
  }
  if (period === "month") {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return Array.from({ length: days }, (_, i) => {
      const dateStr = `${prefix}-${String(i + 1).padStart(2, "0")}`;
      const dm = daily.find(x => x.date === dateStr);
      return { date: String(i + 1), came: dm?.appointments ?? 0, noShow: dm?.no_shows ?? 0 };
    });
  }
  if (period === "quarter") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return Array.from({ length: 3 }, (_, i) => {
      const mi = qStartMonth + i;
      const monthStr = `${now.getFullYear()}-${String(mi + 1).padStart(2, "0")}`;
      const mm = monthly.find(m => m.month.startsWith(monthStr));
      return { date: CHART_MONTHS[mi], came: mm?.appointments ?? 0, noShow: mm?.no_shows ?? 0 };
    });
  }
  if (period === "year") {
    return CHART_MONTHS.map((date, i) => {
      const monthStr = `${now.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
      const mm = monthly.find(m => m.month.startsWith(monthStr));
      return { date, came: mm?.appointments ?? 0, noShow: mm?.no_shows ?? 0 };
    });
  }
  return monthly.map(m => ({
    date: new Date(m.month).toLocaleDateString("ru-RU", { month: "short", year: "2-digit" }),
    came: m.appointments,
    noShow: m.no_shows,
  }));
}

const EmptyChart = ({ height = 160 }: { height?: number }) => (
  <div className="flex items-center justify-center" style={{ height }}>
    <p className="text-[#5E7488] text-sm">Нет данных за период</p>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [periodOffset, setPeriodOffset] = useState(0);
  const [registrationDate, setRegistrationDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const { data: analyticsData, loading: analyticsLoading } = useAnalyticsData();

  // Fetch oldest client to determine registration date
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("created_at")
        .eq("org_uid", ORG_UID)
        .order("created_at", { ascending: true })
        .limit(1);
      if (cancelled || error || !data?.length) return;
      const parsed = new Date(data[0].created_at);
      if (!Number.isNaN(parsed.getTime())) setRegistrationDate(parsed);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Period-filtered metrics ───────────────────────────────────────────

  const periodSums = useMemo(() => {
    if (!analyticsData) return null;
    const filtered = filterDailyByPeriod(analyticsData.dailyMetrics, period);
    const sums = sumMetrics(filtered);
    if (period === "all") {
      // Use client-table totals for all-time revenue/visits (more accurate)
      return {
        ...sums,
        revenue: analyticsData.totalRevenue,
        appointments: analyticsData.totalVisits,
        avgCheck: analyticsData.avgCheck,
      };
    }
    return {
      ...sums,
      avgCheck: sums.appointments > 0 ? Math.round(sums.revenue / sums.appointments) : 0,
    };
  }, [analyticsData, period]);

  const k = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const revenue = periodSums?.revenue ?? 0;
    const appointments = periodSums?.appointments ?? 0;
    const noShowCount = periodSums?.no_shows ?? 0;
    const noShowPercent = appointments > 0 ? Math.round((noShowCount / appointments) * 100) : 0;
    const incomingMessages = periodSums?.incoming_messages ?? 0;
    const outgoingMessages = periodSums?.outgoing_messages ?? 0;
    const avgCheck = periodSums?.avgCheck ?? 0;
    const messagesPerContact = periodSums && periodSums.unique_contacts > 0
      ? Math.round((incomingMessages / periodSums.unique_contacts) * 10) / 10
      : 0;
    return {
      revenue,
      revenueAvgDay: Math.round(revenue / days),
      appointments,
      appointmentsAvgDay: Math.round(appointments / days),
      avgCheck,
      noShowCount,
      noShowPercent,
      incomingMessages,
      outgoingMessages,
      messagesPerContact,
      retention: analyticsData?.retention ?? 0,
      timeSaved: analyticsData?.timeSaved ?? 0,
      reactivated: analyticsData?.campaignRecipients ?? 0,
    };
  }, [periodSums, analyticsData, period]);

  // ── Date picker options ───────────────────────────────────────────────

  const dateOptions = useMemo(() => {
    const now = new Date();
    const fmtMY = (d: Date) =>
      d.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, s => s.toUpperCase());
    const fmtD = (d: Date) =>
      d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (period === "all") return [{ value: 0, label: `${fmtMY(registrationDate)} — ${fmtMY(now)}` }];
    if (period === "week") {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6);
      const s = weekStart < registrationDate ? registrationDate : weekStart;
      return s <= now ? [{ value: 0, label: `${fmtD(s)} — ${fmtD(now)}` }] : [];
    }
    if (period === "month") {
      const ms = new Date(now.getFullYear(), now.getMonth(), 1);
      const me = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return me >= registrationDate ? [{ value: 0, label: fmtMY(ms) }] : [];
    }
    if (period === "quarter") {
      const qm = Math.floor(now.getMonth() / 3) * 3;
      const qs = new Date(now.getFullYear(), qm, 1);
      const qe = new Date(now.getFullYear(), qm + 3, 0);
      const q = Math.floor(qs.getMonth() / 3) + 1;
      return qe >= registrationDate ? [{ value: 0, label: `${q}-й квартал ${qs.getFullYear()}` }] : [];
    }
    return new Date(now.getFullYear(), 11, 31) >= registrationDate
      ? [{ value: 0, label: String(now.getFullYear()) }]
      : [];
  }, [period, registrationDate]);

  useEffect(() => {
    if (dateOptions.length && !dateOptions.some(o => o.value === periodOffset)) {
      setPeriodOffset(dateOptions[0].value);
    }
  }, [dateOptions, periodOffset]);

  const registrationMonthLabel = useMemo(
    () => registrationDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, s => s.toUpperCase()),
    [registrationDate],
  );

  const selectedDateLabel =
    period === "all"
      ? `от ${registrationMonthLabel}`
      : dateOptions.find(o => o.value === periodOffset)?.label ?? "Нет доступных дат";

  // ── Chart data ────────────────────────────────────────────────────────

  const contactsChartData = useMemo(() =>
    analyticsData ? buildContactsChart(period, analyticsData.dailyMetrics, analyticsData.monthlyMetrics) : [],
    [analyticsData, period]);

  const noShowChartData = useMemo(() =>
    analyticsData ? buildNoShowChart(period, analyticsData.dailyMetrics, analyticsData.monthlyMetrics) : [],
    [analyticsData, period]);

  const contactsChartTitle =
    period === "year" || period === "all" ? "Уникальные обращения по месяцам"
      : period === "quarter" ? "Уникальные обращения по кварталу"
        : period === "week" ? "Уникальные обращения по дням недели"
          : "Уникальные обращения по дням";

  const contactsXInterval = period === "month"
    ? Math.max(0, Math.floor(contactsChartData.length / 8) - 1)
    : 0;
  const noShowXInterval = period === "month"
    ? Math.max(0, Math.floor(noShowChartData.length / 8) - 1)
    : 0;

  const contactsHasData = contactsChartData.some(d => d.contacts > 0);
  const noShowHasData = noShowChartData.some(d => d.came > 0 || d.noShow > 0);

  // ── Daily KPI table (last 7 days from metrics_day) ─────────────────────

  const dailyKPITable = useMemo(() => {
    if (!analyticsData?.dailyMetrics.length) return [];
    return [...analyticsData.dailyMetrics]
      .slice(-7)
      .reverse()
      .map(d => ({
        date: new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
        contacts: d.unique_contacts,
        messages: d.incoming_messages + d.outgoing_messages,
        appointments: d.appointments,
        revenue: d.revenue,
        noShow: d.no_shows,
      }));
  }, [analyticsData]);

  // ── Top days ──────────────────────────────────────────────────────────

  const topDaysByRevenue = useMemo(() => {
    if (!analyticsData?.dailyMetrics.length) return [];
    return [...analyticsData.dailyMetrics]
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(d => ({
        date: new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
        revenue: d.revenue,
        appointments: d.appointments,
        contacts: d.unique_contacts,
      }));
  }, [analyticsData]);

  const topDaysByAppointments = useMemo(() => {
    if (!analyticsData?.dailyMetrics.length) return [];
    return [...analyticsData.dailyMetrics]
      .filter(d => d.appointments > 0)
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 5)
      .map(d => ({
        date: new Date(d.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }),
        appointments: d.appointments,
        revenue: d.revenue,
        noShow: d.no_shows,
      }));
  }, [analyticsData]);

  // ── Trends: current vs previous month ─────────────────────────────────

  const analyticsTrends = useMemo(() => {
    const months = analyticsData?.monthlyMetrics ?? [];
    if (months.length < 2) return [];
    const curr = months[months.length - 1];
    const prev = months[months.length - 2];
    return [
      { metric: "Выручка", previous: prev.revenue, current: curr.revenue, unit: "currency" },
      { metric: "Записей", previous: prev.appointments, current: curr.appointments, unit: "count" },
      { metric: "Не явки", previous: prev.no_shows, current: curr.no_shows, unit: "count" },
      { metric: "Новых клиентов", previous: prev.new_clients, current: curr.new_clients, unit: "count" },
      { metric: "Обращений", previous: prev.unique_contacts, current: curr.unique_contacts, unit: "count" },
      { metric: "Средний чек", previous: prev.avg_check, current: curr.avg_check, unit: "currency" },
      { metric: "Входящих сообщений", previous: prev.incoming_messages, current: curr.incoming_messages, unit: "count" },
    ];
  }, [analyticsData]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div>
      <Header title="Аналитика" subtitle="Полная аналитика бизнеса и агента" />
      <div className={"p-6 space-y-6 transition-opacity" + (analyticsLoading ? " opacity-50" : "")}>

        {/* Period selector + messages banner */}
        <div className="grid grid-cols-1 xl:grid-cols-[auto,1fr] gap-4 items-stretch">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-14 flex items-center gap-0.5 bg-[#0F1622] border border-[#223444] rounded-lg p-1">
              {PERIOD_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => { setPeriod(option.value); setPeriodOffset(0); setDateMenuOpen(false); }}
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
                onClick={() => { if (period !== "all") setDateMenuOpen(p => !p); }}
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
                  {dateOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setPeriodOffset(option.value); setDateMenuOpen(false); }}
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

          <div className="h-14 bg-[#0F1622] border border-[#223444] rounded-lg px-3 flex items-center justify-between gap-4">
            <p className="text-[#8299B4] text-sm font-medium">Объём коммуникаций</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <ArrowDownLeft size={16} className="text-[#00FF00]" />
                <p className="text-[#5E7488] text-sm">
                  <span className="text-[#EDF2FA] font-bold">{k.incomingMessages.toLocaleString("ru")}</span> Входящих
                </p>
              </div>
              <div className="w-px h-6 bg-[#223444]" />
              <div className="flex items-center gap-2 whitespace-nowrap">
                <ArrowUpRight size={16} className="text-[#8299B4]" />
                <p className="text-[#5E7488] text-sm">
                  <span className="text-[#EDF2FA] font-bold">{k.outgoingMessages.toLocaleString("ru")}</span> Исходящих
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Выручка за период" value={formatCurrency(k.revenue)} changeLabel={`~${formatCurrency(k.revenueAvgDay)} в день`} icon={<TrendingUp size={16} />} accent compact />
          <MetricCard title="Записей за период" value={String(k.appointments)} changeLabel={`~${k.appointmentsAvgDay} в день`} icon={<CalendarCheck size={16} />} compact />
          <MetricCard title="Возвращаемость" value={`${k.retention}%`} changeLabel="клиентов с повторным визитом" icon={<RotateCcw size={16} />} compact />
          <MetricCard title="Средний чек" value={formatCurrency(k.avgCheck)} icon={<Receipt size={16} />} compact />
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Не явки" value={`${k.noShowCount} (${k.noShowPercent}%)`} icon={<AlertTriangle size={16} />} compact />
          <MetricCard title="Сообщений на обращение" value={String(k.messagesPerContact)} changeLabel="средняя длина диалога" icon={<MessageSquare size={16} />} compact />
          <MetricCard title="Ср. скорость ответа" value="~5 сек" changeLabel="время реакции агента" icon={<Clock size={16} />} compact />
          <MetricCard title="Новых клиентов в месяц" value={String(analyticsData?.newClientsThisMonth ?? 0)} changeLabel="за текущий месяц" icon={<TrendingUp size={16} />} compact />
        </div>

        {/* Operational metrics */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Агент работает 24/7" value="∞" changeLabel="без выходных и перерывов" icon={<MoonStar size={16} />} compact />
          <MetricCard title="Сэкономлено времени" value={`${k.timeSaved} ч`} changeLabel="оценка за все время" icon={<Zap size={16} />} compact />
          <MetricCard title="Отправлено рассылок" value={String(analyticsData?.campaignsSent ?? 0)} changeLabel={`${k.reactivated} получателей`} icon={<RotateCcw size={16} />} compact />
          <MetricCard title="Обращений всего" value={String(k.incomingMessages)} changeLabel="уникальных контактов" icon={<MessageSquare size={16} />} compact />
        </div>

        {/* Revenue chart */}
        <RevenueChart
          dailyMetrics={analyticsData?.dailyMetrics}
          monthlyMetrics={analyticsData?.monthlyMetrics}
        />

        {/* Trends table */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Тренды: текущий / прошлый месяц</h3>
            <p className="text-[#5E7488] text-sm">Сравнительный анализ ключевых метрик</p>
          </div>
          {analyticsTrends.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[#5E7488] text-sm">Нет данных для сравнения — нужны минимум 2 месяца в метриках</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    {["Метрика", "Прошлый месяц", "Текущий месяц", "Изменение"].map(h => (
                      <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyticsTrends.map(row => {
                    const diff = row.current - row.previous;
                    const pct = row.previous > 0 ? Math.round((diff / row.previous) * 100) : diff > 0 ? 100 : 0;
                    const isPositive = row.metric === "Не явки" ? diff <= 0 : diff >= 0;
                    const formatVal = (v: number) =>
                      row.unit === "currency" ? formatCurrency(v)
                        : row.unit === "percent" ? `${v}%`
                          : String(v);
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
          )}
        </div>

        {/* Chart: Contacts */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">{contactsChartTitle}</h3>
          <p className="text-[#5E7488] text-sm mb-5">Динамика входящих контактов</p>
          {!contactsHasData ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={contactsChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="contactsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF00" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#5E7488", fontSize: 11 }} axisLine={false} tickLine={false} interval={contactsXInterval} />
                <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<AreaTooltip />} />
                <Area type="monotone" dataKey="contacts" stroke="#00FF00" strokeWidth={2}
                  fill="url(#contactsGrad)" dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Charts row: Cancellations placeholder + No-show */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">Клиентская база</h3>
            <p className="text-[#5E7488] text-sm mb-4">Ключевые показатели по базе</p>
            <div className="space-y-3">
              {[
                { label: "Всего клиентов", value: analyticsData?.totalClients ?? 0, fmt: String },
                { label: "Новых в этом месяце", value: analyticsData?.newClientsThisMonth ?? 0, fmt: String },
                { label: "С повторными визитами", value: analyticsData?.retention ?? 0, fmt: (v: number) => `${v}%` },
                { label: "Отправлено рассылок", value: analyticsData?.campaignsSent ?? 0, fmt: String },
                { label: "Охват рассылками", value: analyticsData?.campaignRecipients ?? 0, fmt: (v: number) => `${v} чел.` },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[#1A2535] last:border-0">
                  <span className="text-[#8299B4] text-sm">{item.label}</span>
                  <span className="text-[#EDF2FA] text-sm font-semibold">{item.fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">Записи: пришли и не пришли</h3>
            <p className="text-[#5E7488] text-sm mb-4">Посещаемость по дням</p>
            <div className="flex items-center gap-4 mb-3 text-xs">
              {[{ color: "#00FF00", label: "Пришли" }, { color: "#f87171", label: "Не пришли" }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
                  <span className="text-[#8299B4]">{l.label}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-h-0" style={{ minHeight: 140 }}>
              {!noShowHasData ? <EmptyChart height={140} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={noShowChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#5E7488", fontSize: 11 }} axisLine={false} tickLine={false} interval={noShowXInterval} />
                    <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={25} />
                    <Tooltip content={<StackTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
                    <Bar dataKey="came" name="Пришли" stackId="a" fill="#00FF00" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="noShow" name="Не пришли" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Daily KPI Table */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Ежедневная статистика</h3>
            <p className="text-[#5E7488] text-sm">
              {dailyKPITable.length > 0 ? `Последние ${dailyKPITable.length} дней` : "Нет данных"}
            </p>
          </div>
          {dailyKPITable.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[#5E7488] text-sm">Данные появятся после начала работы агента</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    {["День", "Обращения", "Сообщения", "Записи", "Выручка", "Не пришли"].map(h => (
                      <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyKPITable.map(row => (
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
          )}
        </div>

        {/* Top tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#223444]">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Топ дней по выручке</h3>
            </div>
            {topDaysByRevenue.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[#5E7488] text-sm">Нет данных о выручке</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    {["#", "День", "Выручка", "Записи", "Обращения"].map(h => (
                      <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topDaysByRevenue.map((row, i) => (
                    <tr key={row.date + i} className="border-b border-[#1A2535] last:border-0 hover:bg-[#141E2B] transition-colors">
                      <td className="px-5 py-3 text-[#5E7488] text-sm">{i + 1}</td>
                      <td className="px-5 py-3 text-[#EDF2FA] text-sm">{row.date}</td>
                      <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{formatCurrency(row.revenue)}</td>
                      <td className="px-5 py-3 text-[#8299B4] text-sm">{row.appointments}</td>
                      <td className="px-5 py-3 text-[#8299B4] text-sm">{row.contacts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#223444]">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Топ дней по записям</h3>
            </div>
            {topDaysByAppointments.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[#5E7488] text-sm">Нет данных о записях</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    {["#", "День", "Записи", "Выручка", "Не пришли"].map(h => (
                      <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topDaysByAppointments.map((row, i) => (
                    <tr key={row.date + i} className="border-b border-[#1A2535] last:border-0 hover:bg-[#141E2B] transition-colors">
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
            )}
          </div>
        </div>

        {/* Clients summary */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Итоговые показатели</h3>
            <p className="text-[#5E7488] text-sm">Накопленная статистика за всё время</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["Показатель", "Значение", "Описание"].map(h => (
                    <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Клиентов в базе", value: String(analyticsData?.totalClients ?? 0), desc: "Уникальных клиентов" },
                  { name: "Всего визитов", value: String(analyticsData?.totalVisits ?? 0), desc: "Сумма визитов по всем клиентам" },
                  { name: "Общая выручка", value: formatCurrency(analyticsData?.totalRevenue ?? 0), desc: "Из профилей клиентов YClients" },
                  { name: "Средний чек", value: formatCurrency(analyticsData?.avgCheck ?? 0), desc: "Выручка / визиты" },
                  { name: "Возвращаемость", value: `${analyticsData?.retention ?? 0}%`, desc: "Клиентов с повторным визитом" },
                  { name: "Сэкономлено времени", value: `${analyticsData?.timeSaved ?? 0} ч`, desc: "Оценка: 4 мин на обращение" },
                ].map(row => (
                  <tr key={row.name} className="border-b border-[#1A2535] last:border-0 hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3 text-[#EDF2FA] text-sm font-medium">{row.name}</td>
                    <td className="px-5 py-3 text-[#00FF00] text-sm font-semibold">{row.value}</td>
                    <td className="px-5 py-3 text-[#8299B4] text-sm">{row.desc}</td>
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
