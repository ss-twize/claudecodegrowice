"use client";

import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import { Lock, Plus, X, ChevronDown, CheckCircle2 } from "lucide-react";
import MetricCard from "@/components/ui/MetricCard";
import { revenueData, financesKPIs, serviceRevenueData, plRevenue, plExpenses, cashFlowData } from "@/lib/mockData";
import type { MetricTooltipDef } from "@/components/ui/MetricCard";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, DollarSign, BarChart2, Receipt } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ── Period types ─────────────────────────────────────────────────────────────

type FinancePeriod = "month" | "quarter" | "year";

const PERIODS: Array<{ value: FinancePeriod; label: string }> = [
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "year", label: "Год" },
];

const RU_MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const RU_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function sr(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 10000;
  return x - Math.floor(x);
}

function periodRevenueData(period: FinancePeriod) {
  const now = new Date();
  if (period === "year") return revenueData;
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return [0, 1, 2].map((i) => ({
      month: RU_MONTHS[q + i],
      revenue: Math.round(350000 * (0.85 + sr(q + i) * 0.3)),
      expenses: Math.round(150000 * (0.85 + sr(q + i + 50) * 0.3)),
      profit: Math.round(200000 * (0.85 + sr(q + i + 100) * 0.25)),
    }));
  }
  // month — daily
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => ({
    month: String(i + 1),
    revenue: Math.round(14000 * (0.55 + sr(now.getMonth() * 40 + i) * 0.8)),
    expenses: Math.round(6000 * (0.55 + sr(now.getMonth() * 40 + i + 200) * 0.8)),
    profit: Math.round(8000 * (0.5 + sr(now.getMonth() * 40 + i + 400) * 0.7)),
  }));
}

function periodCashFlow(period: FinancePeriod) {
  const now = new Date();
  if (period === "year") return cashFlowData;
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return [0, 1, 2].map((i) => ({
      month: RU_MONTHS[q + i],
      actual: Math.round(180000 * (0.85 + sr(q + i + 300) * 0.3)),
    }));
  }
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => ({
    month: String(i + 1),
    actual: Math.round(8000 * (0.5 + sr(now.getMonth() * 40 + i + 600) * 0.8)),
  }));
}

function periodServiceData(period: FinancePeriod) {
  if (period === "year") {
    return serviceRevenueData.map((s) => ({ ...s, revenue: Math.round(s.revenue * 12 * (0.9 + sr(s.revenue) * 0.2)), count: s.count * 12 }));
  }
  if (period === "quarter") {
    return serviceRevenueData.map((s) => ({ ...s, revenue: Math.round(s.revenue * 3 * (0.9 + sr(s.revenue) * 0.15)), count: s.count * 3 }));
  }
  return serviceRevenueData;
}

function periodLabel(period: FinancePeriod) {
  const now = new Date();
  const months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  if (period === "year") return `${now.getFullYear()} год, январь — декабрь`;
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return `Q${q + 1} ${now.getFullYear()}`;
  }
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ── P&L types ─────────────────────────────────────────────────────────────────

type PlEntry = { id: string; type: "income" | "expense"; category: string; amount: number; note: string };

// ── Tooltips ─────────────────────────────────────────────────────────────────

const TOOLTIPS: Record<string, MetricTooltipDef> = {
  mrr: {
    formula: "Сумма всех оплат за текущий месяц",
    description: "Ежемесячная выручка — ключевой индикатор текущей прибыльности.",
  },
  arr: {
    formula: "Ежемес. выручка × 12",
    description: "Годовая выручка — проекция дохода на год на основе текущего месяца.",
  },
  mom: {
    formula: "(Текущий − Прошлый) ÷ Прошлый × 100%",
    description: "Показывает, ускоряется или замедляется рост бизнеса.",
  },
  avgCheck: {
    formula: "Выручка ÷ Количество визитов",
    description: "Средняя сумма одного визита.",
  },
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#8299B4] mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => p.value != null && (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}:{" "}
          {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(p.value)}
        </p>
      ))}
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#8299B4] mb-1">{label}</p>
      <p className="text-[#00FF00] font-semibold">
        {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(payload[0].value)}
      </p>
      {payload[1]?.value != null && <p className="text-[#8299B4]">{payload[1].value} визитов</p>}
    </div>
  );
};

const serviceColors = ["#00FF00", "#88CC00", "#66AA00", "#448800", "#2a5c1a"];

const totalRevPL = plRevenue.reduce((s, r) => s + r.current, 0);
const totalExpPL = plExpenses.reduce((s, r) => s + r.current, 0);
const profitPL = totalRevPL - totalExpPL;

// ── Period Selector ───────────────────────────────────────────────────────────

function PeriodSelector({ period, onChange }: { period: FinancePeriod; onChange: (p: FinancePeriod) => void }) {
  const [open, setOpen] = useState(false);
  const label = PERIODS.find((p) => p.value === period)?.label ?? "";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
      >
        {label}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[120px] rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => { onChange(p.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${period === p.value ? "text-[#00FF00] bg-[#00FF00]/10" : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const { isOwner } = useAuth();

  const [period, setPeriod] = useState<FinancePeriod>("year");
  const [plEntries, setPlEntries] = useState<PlEntry[]>([]);
  const [plModal, setPlModal] = useState(false);
  const [plModalType, setPlModalType] = useState<"income" | "expense">("income");
  const [plForm, setPlForm] = useState({ category: "", amount: "", note: "" });

  const chartData = useMemo(() => periodRevenueData(period), [period]);
  const cfData = useMemo(() => periodCashFlow(period), [period]);
  const svcData = useMemo(() => periodServiceData(period), [period]);
  const xInterval = period === "month" ? 4 : 0;
  const pLabel = periodLabel(period);

  const openModal = (type: "income" | "expense") => {
    setPlModalType(type);
    setPlForm({ category: "", amount: "", note: "" });
    setPlModal(true);
  };

  const addPlEntry = () => {
    if (!plForm.category || !plForm.amount) return;
    const entry: PlEntry = {
      id: Date.now().toString(),
      type: plModalType,
      category: plForm.category,
      amount: Number(plForm.amount),
      note: plForm.note,
    };
    setPlEntries((prev) => [entry, ...prev]);
    setPlModal(false);
  };

  const addedIncome = plEntries.filter((e) => e.type === "income");
  const addedExpenses = plEntries.filter((e) => e.type === "expense");
  const addedTotalIncome = addedIncome.reduce((s, e) => s + e.amount, 0);
  const addedTotalExpenses = addedExpenses.reduce((s, e) => s + e.amount, 0);

  if (!isOwner) {
    return (
      <div>
        <Header title="Финансы" subtitle="Финансовые показатели салона" />
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 rounded-2xl bg-[#0F1622] border border-[#223444] flex items-center justify-center mb-5">
            <Lock size={28} className="text-[#223444]" />
          </div>
          <h2 className="text-[#EDF2FA] text-xl font-semibold mb-2">Нет доступа</h2>
          <p className="text-[#5E7488] text-sm">Этот раздел доступен только владельцу</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Финансы" subtitle="Финансовые показатели салона" />
      <div className="p-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Ежемес. выручка" value={formatCurrency(financesKPIs.mrr)} change={financesKPIs.momGrowth}
            changeLabel="рост за месяц" icon={<TrendingUp size={18} />} accent tooltip={TOOLTIPS.mrr} />
          <MetricCard title="Годовая выручка" value={formatCurrency(financesKPIs.arr)} change={12.8}
            changeLabel="к прошлому году" icon={<DollarSign size={18} />} tooltip={TOOLTIPS.arr} />
          <MetricCard title="Рост за месяц" value={formatPercent(financesKPIs.momGrowth, true)} change={3.2}
            changeLabel="к прошлому периоду" icon={<BarChart2 size={18} />} tooltip={TOOLTIPS.mom} />
          <MetricCard title="Средний чек" value={formatCurrency(financesKPIs.avgCheck)} change={2.8}
            changeLabel="к прошлому месяцу" icon={<Receipt size={18} />} tooltip={TOOLTIPS.avgCheck} />
        </div>

        {/* Profit summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Выручка (год)", value: financesKPIs.totalRevenue, color: "#00FF00" },
            { label: "Расходы (год)", value: financesKPIs.totalExpenses, color: "#f87171" },
            { label: "Прибыль (год)", value: financesKPIs.totalProfit, color: "#00FF00", highlight: true },
          ].map((item) => (
            <div key={item.label}
              className={`rounded-xl border p-5 ${item.highlight ? "bg-[#162110] border-[#00FF00]/20" : "bg-[#0F1622] border-[#223444]"}`}>
              <p className="text-[#8299B4] text-sm mb-1">{item.label}</p>
              <p className="text-2xl font-bold" style={{ color: item.color }}>{formatCurrency(item.value)}</p>
              {item.highlight && (
                <p className="text-[#00FF00]/60 text-xs mt-1">
                  Маржа: {Math.round((item.value / financesKPIs.totalRevenue) * 100)}%
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Revenue dynamics */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Динамика выручки и расходов</h3>
              <p className="text-[#5E7488] text-sm">{pLabel}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <PeriodSelector period={period} onChange={setPeriod} />
              <div className="flex items-center gap-4 text-xs">
                {[{ color: "#00FF00", label: "Выручка" }, { color: "#4a5568", label: "Расходы" }, { color: "#88CC00", label: "Прибыль" }].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} />
                    <span className="text-[#8299B4]">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} interval={xInterval} />
              <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="revenue" name="Выручка" stroke="#00FF00" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} />
              <Line type="monotone" dataKey="expenses" name="Расходы" stroke="#4a5568" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: "#4a5568", strokeWidth: 0 }} />
              <Line type="monotone" dataKey="profit" name="Прибыль" stroke="#88CC00" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: "#88CC00", strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* P&L Table */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Доходы и расходы</h3>
              <p className="text-[#5E7488] text-sm">Текущий месяц к предыдущему</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal("income")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20 text-xs font-semibold hover:bg-[#00FF00]/20 transition-colors"
              >
                <Plus size={13} />Доход
              </button>
              <button
                onClick={() => openModal("expense")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/15 transition-colors"
              >
                <Plus size={13} />Расход
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Revenue P&L */}
            <div>
              <p className="text-[#5E7488] text-xs font-medium uppercase tracking-wider mb-3">Выручка</p>
              <div className="space-y-2">
                {plRevenue.map((row) => {
                  const diff = row.current - row.prev;
                  const pct = Math.round((diff / row.prev) * 100);
                  return (
                    <div key={row.category} className="flex items-center justify-between py-2 border-b border-[#1A2535] last:border-0">
                      <span className="text-[#8299B4] text-sm">{row.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[#5E7488] text-xs">{formatCurrency(row.prev)}</span>
                        <span className="text-[#EDF2FA] font-semibold text-sm">{formatCurrency(row.current)}</span>
                        <span className={`text-xs font-medium w-12 text-right ${diff >= 0 ? "text-[#00FF00]" : "text-red-400"}`}>
                          {diff >= 0 ? "+" : ""}{pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {addedIncome.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-[#1A2535]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF00] flex-shrink-0" />
                      <span className="text-[#8299B4] text-sm truncate">{entry.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#00FF00] font-semibold text-sm">{formatCurrency(entry.amount)}</span>
                      <button onClick={() => setPlEntries((prev) => prev.filter((e) => e.id !== entry.id))}
                        className="text-[#5E7488] hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-t border-[#223444] mt-1">
                  <span className="text-[#EDF2FA] font-semibold text-sm">Итого доходы</span>
                  <span className="text-[#00FF00] font-bold">{formatCurrency(totalRevPL + addedTotalIncome)}</span>
                </div>
              </div>
            </div>
            {/* Expenses P&L */}
            <div>
              <p className="text-[#5E7488] text-xs font-medium uppercase tracking-wider mb-3">Расходы</p>
              <div className="space-y-2">
                {plExpenses.map((row) => {
                  const diff = row.current - row.prev;
                  const pct = Math.round((diff / row.prev) * 100);
                  return (
                    <div key={row.category} className="flex items-center justify-between py-2 border-b border-[#1A2535] last:border-0">
                      <span className="text-[#8299B4] text-sm">{row.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[#5E7488] text-xs">{formatCurrency(row.prev)}</span>
                        <span className="text-[#EDF2FA] font-semibold text-sm">{formatCurrency(row.current)}</span>
                        <span className={`text-xs font-medium w-12 text-right ${diff <= 0 ? "text-[#00FF00]" : "text-red-400"}`}>
                          {diff >= 0 ? "+" : ""}{pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                {addedExpenses.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-[#1A2535]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span className="text-[#8299B4] text-sm truncate">{entry.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red-400 font-semibold text-sm">{formatCurrency(entry.amount)}</span>
                      <button onClick={() => setPlEntries((prev) => prev.filter((e) => e.id !== entry.id))}
                        className="text-[#5E7488] hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 border-t border-[#223444] mt-1">
                  <span className="text-[#EDF2FA] font-semibold text-sm">Итого расходы</span>
                  <span className="text-red-400 font-bold">{formatCurrency(totalExpPL + addedTotalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-[#223444] flex items-center justify-between">
            <span className="text-[#EDF2FA] font-semibold">Чистая прибыль</span>
            <div className="text-right">
              <span className="text-[#00FF00] font-bold text-xl">
                {formatCurrency(profitPL + addedTotalIncome - addedTotalExpenses)}
              </span>
              <p className="text-[#5E7488] text-xs mt-0.5">
                Маржа: {Math.round(((profitPL + addedTotalIncome - addedTotalExpenses) / (totalRevPL + addedTotalIncome)) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Движение средств</h3>
              <p className="text-[#5E7488] text-sm">Чистая прибыль по периоду — {pLabel}</p>
            </div>
            <PeriodSelector period={period} onChange={setPeriod} />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cfData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} interval={xInterval} />
              <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="actual" name="Прибыль" stroke="#00FF00" strokeWidth={2}
                fill="url(#actualGrad)" dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart: Revenue by service */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Выручка по услугам</h3>
              <p className="text-[#5E7488] text-sm">{pLabel}</p>
            </div>
            <PeriodSelector period={period} onChange={setPeriod} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={svcData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
              <XAxis dataKey="service" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {svcData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={serviceColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-5 space-y-2">
            {svcData.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1A2535] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: serviceColors[i] }} />
                  <span className="text-[#8299B4] text-sm">{item.service}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[#5E7488] text-sm">{item.count} визитов</span>
                  <span className="text-[#EDF2FA] font-semibold text-sm">{formatCurrency(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Add P&L Modal */}
      {plModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0F1622] border border-[#223444] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">
                {plModalType === "income" ? "Добавить доход" : "Добавить расход"}
              </h3>
              <button onClick={() => setPlModal(false)} className="text-[#5E7488] hover:text-[#EDF2FA] transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Категория</label>
                <input
                  value={plForm.category}
                  onChange={(e) => setPlForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder={plModalType === "income" ? "Напр.: Стрижки, Окрашивание..." : "Напр.: Аренда, Материалы..."}
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                />
              </div>
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Сумма, ₽</label>
                <input
                  type="number"
                  min="0"
                  value={plForm.amount}
                  onChange={(e) => setPlForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                />
              </div>
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Комментарий <span className="text-[#5E7488]">(необязательно)</span></label>
                <input
                  value={plForm.note}
                  onChange={(e) => setPlForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Дополнительная информация..."
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPlModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#223444] text-[#8299B4] text-sm font-medium hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={addPlEntry}
                disabled={!plForm.category || !plForm.amount}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  plModalType === "income"
                    ? "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                    : "bg-red-500 text-white hover:bg-red-400"
                }`}
              >
                {plModalType === "income" ? "Добавить доход" : "Добавить расход"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
