"use client";

import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useYclientsMasters, type YclientsMaster } from "@/lib/hooks/useYclientsMasters";
import { formatCurrency } from "@/lib/utils";
import { SortableHeader, useSortable } from "@/components/ui/SortableHeader";
import {
  UserCog, TrendingUp, Users, AlertTriangle, CheckCircle2,
  Star, ChevronDown, Wallet,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type StaffPeriod = "month" | "quarter" | "year";

const PERIOD_LABELS: Record<StaffPeriod, string> = {
  month: "Месяц",
  quarter: "Квартал",
  year: "Год",
};


// ── Period-based chart data ────────────────────────────────────────────────────

function initials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "—";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function periodRevenueData(masters: YclientsMaster[], period: StaffPeriod) {
  const multiplier = period === "year" ? 12 : period === "quarter" ? 3 : 1;
  return masters.map((m) => ({
    id: m.id,
    name: m.name.split(" ")[0] || m.name,
    revenue: Math.round(m.revenue * multiplier),
  }));
}

interface KpiRow {
  id: number | string;
  name: string;
  avatar: string;
  conversionRate: number;
  noShowPercent: number;
  noShowCount: number;
  avgSession: string;
}

function periodKpiData(masters: YclientsMaster[], period: StaffPeriod): KpiRow[] {
  const multiplier = period === "year" ? 12 : period === "quarter" ? 3 : 1;
  return masters.map((m) => ({
    id: m.id,
    name: m.name,
    avatar: initials(m.name),
    conversionRate: m.conversionRate,
    noShowPercent: m.noShowPercent,
    noShowCount: Math.round(m.noShowCount * multiplier),
    avgSession: m.avgSession || "—",
  }));
}

function periodLabel(period: StaffPeriod): string {
  const now = new Date();
  const RU_MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  if (period === "month") return `${RU_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  }
  return String(now.getFullYear());
}


// ── Tooltip ────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#8299B4] mb-1">{label}</p>
      <p className="text-[#00FF00] font-semibold">
        {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(payload[0].value)}
      </p>
    </div>
  );
};

// ── Period selector ────────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: StaffPeriod; onChange: (p: StaffPeriod) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
      >
        {PERIOD_LABELS[value]}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 min-w-[130px] rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
          {(Object.keys(PERIOD_LABELS) as StaffPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                value === p ? "text-[#00FF00] bg-[#00FF00]/10" : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const colors = ["#00FF00", "#88CC00", "#66AA00", "#448800"];

// ── Main component ─────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [period, setPeriod] = useState<StaffPeriod>("month");
  const { masters: yclientsMasters } = useYclientsMasters();

  // Chart & table data
  const revenueData = useMemo(() => periodRevenueData(yclientsMasters, period), [yclientsMasters, period]);
  const kpiRows = useMemo(() => periodKpiData(yclientsMasters, period), [yclientsMasters, period]);
  const { sorted: sortedKPI, sortCol: kpiSortCol, sortDir: kpiSortDir, onSort: kpiOnSort } = useSortable(kpiRows);

  const totalRevenue = yclientsMasters.reduce((s, m) => s + m.revenue, 0);
  const totalClients = yclientsMasters.reduce((s, m) => s + m.clients, 0);
  const avgWorkload = yclientsMasters.length > 0
    ? Math.round(yclientsMasters.reduce((s, m) => s + m.workload, 0) / yclientsMasters.length)
    : 0;
  const totalSalaries = yclientsMasters.reduce((s, m) => s + m.salary, 0);
  const cardMasters = yclientsMasters;

  return (
    <div>
      <Header title="Персонал" subtitle="Показатели работы мастеров" />
      <div className="p-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Общая выручка"
            value={formatCurrency(totalRevenue)}
            change={14.5}
            changeLabel="к прошлому месяцу"
            icon={<TrendingUp size={18} />}
            accent
          />
          <MetricCard title="Мастеров" value={String(yclientsMasters.length)} icon={<UserCog size={18} />} />
          <MetricCard
            title="Сумма зарплат"
            value={formatCurrency(totalSalaries)}
            change={-2.1}
            changeLabel="к прошлому месяцу"
            icon={<Wallet size={18} />}
          />
          <MetricCard
            title="Уникальных клиентов"
            value={String(totalClients)}
            change={7.3}
            changeLabel="к прошлому месяцу"
            icon={<Users size={18} />}
          />
        </div>

        {/* Revenue chart + KPI table */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Revenue chart */}
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col" style={{ minHeight: 320 }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Выручка по мастерам</h3>
                <p className="text-[#5E7488] text-sm">{periodLabel(period)}</p>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v / 1000}к`} width={45} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenueData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPI table */}
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Показатели по мастерам</h3>
                <p className="text-[#5E7488] text-sm">Конверсия, не явки, время сессии</p>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    <SortableHeader label="Мастер"       col="name"          sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Конверсия"    col="conversionRate" sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Не явки"      col="noShowPercent"  sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Время сессии" col="avgSession"     sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedKPI.map((master, i) => {
                    return (
                      <tr key={master.id} className="border-b border-[#1A2535] last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                              style={{ backgroundColor: colors[i % colors.length] }}>
                              {master.avatar}
                            </div>
                            <span className="text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{master.name.split(" ")[0]}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#1A2535] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#00FF00]" style={{ width: `${master.conversionRate}%` }} />
                            </div>
                            <span className="text-[#00FF00] text-sm font-semibold">{master.conversionRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div>
                            <span className={`text-sm font-medium ${master.noShowPercent > 8 ? "text-red-400" : master.noShowPercent > 5 ? "text-yellow-400" : "text-[#00FF00]"}`}>
                              {master.noShowPercent}%
                            </span>
                            <span className="text-[#5E7488] text-xs ml-1">({master.noShowCount} раз)</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-[#8299B4] text-sm">{master.avgSession || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Staff cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Карточки мастеров</h3>
            <div className="flex items-center gap-2 text-sm text-[#8299B4]">
              Средняя загрузка:{" "}
              <span className="text-[#00FF00] font-semibold">{avgWorkload}%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {cardMasters.map((master, index) => {
              const kpi = kpiRows.find((row) => String(row.id) === String(master.id));
              const accentColor = colors[index % colors.length];
              return (
                <div key={`${master.id}-${index}`} className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 card-hover">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0"
                      style={{ backgroundColor: accentColor }}>
                      {initials(master.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#EDF2FA] font-semibold truncate">{master.name}</p>
                      <p className="text-[#5E7488] text-xs">{master.specialization}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[#5E7488] text-xs">Загрузка</span>
                      <span className="text-[#EDF2FA] text-xs font-medium">{master.workload}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A2535] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${master.workload}%`, backgroundColor: accentColor }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Выручка</span>
                      <span className="text-[#00FF00] text-xs font-semibold">{formatCurrency(master.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Средний чек</span>
                      <span className="text-[#8299B4] text-xs">{formatCurrency(master.avgCheck)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Клиентов</span>
                      <span className="text-[#8299B4] text-xs">{master.clients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Рейтинг</span>
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-[#8299B4] text-xs">{master.rating}</span>
                      </div>
                    </div>
                  </div>
                  {kpi && (
                    <div className="mt-4 pt-3 border-t border-[#1A2535] grid grid-cols-2 gap-2">
                      <div className="bg-[#141E2B] rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <CheckCircle2 size={11} className="text-[#00FF00]" />
                          <span className="text-[#00FF00] text-xs font-bold">{kpi.conversionRate}%</span>
                        </div>
                        <p className="text-[#5E7488] text-xs">Конверсия</p>
                      </div>
                      <div className="bg-[#141E2B] rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <AlertTriangle size={11} className={kpi.noShowPercent > 8 ? "text-red-400" : "text-yellow-400"} />
                          <span className={`text-xs font-bold ${kpi.noShowPercent > 8 ? "text-red-400" : "text-yellow-400"}`}>{kpi.noShowPercent}%</span>
                        </div>
                        <p className="text-[#5E7488] text-xs">Не явки</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
