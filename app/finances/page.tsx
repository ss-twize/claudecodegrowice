"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { revenueData, financesKPIs, serviceRevenueData, plRevenue, plExpenses, cashFlowData } from "@/lib/mockData";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, DollarSign, BarChart2, Receipt } from "lucide-react";
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

const LineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
        <p className="text-[#9198a1] mb-2 font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}:{" "}
            {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CashFlowTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
        <p className="text-[#9198a1] mb-2 font-medium">{label}</p>
        {payload.map((p: any, i: number) => p.value != null && (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}:{" "}
            {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
        <p className="text-[#9198a1] mb-1">{label}</p>
        <p className="text-[#00FF00] font-semibold">
          {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(payload[0].value)}
        </p>
        <p className="text-[#9198a1]">{payload[1]?.value} записей</p>
      </div>
    );
  }
  return null;
};

const serviceColors = ["#00FF00", "#88CC00", "#66AA00", "#448800", "#2a5c1a"];

const totalRevPL = plRevenue.reduce((s, r) => s + r.current, 0);
const totalExpPL = plExpenses.reduce((s, r) => s + r.current, 0);
const profitPL = totalRevPL - totalExpPL;

export default function FinancesPage() {
  return (
    <div>
      <Header title="Финансы" subtitle="Финансовые показатели салона" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="MRR"
            value={formatCurrency(financesKPIs.mrr)}
            change={financesKPIs.momGrowth}
            changeLabel="MoM рост"
            icon={<TrendingUp size={18} />}
            accent
          />
          <MetricCard
            title="ARR"
            value={formatCurrency(financesKPIs.arr)}
            change={12.8}
            changeLabel="vs прошлый год"
            icon={<DollarSign size={18} />}
          />
          <MetricCard
            title="MoM рост"
            value={formatPercent(financesKPIs.momGrowth, true)}
            change={3.2}
            changeLabel="vs прошлый период"
            icon={<BarChart2 size={18} />}
          />
          <MetricCard
            title="Средний чек"
            value={formatCurrency(financesKPIs.avgCheck)}
            change={2.8}
            changeLabel="vs прошлый месяц"
            icon={<Receipt size={18} />}
          />
        </div>

        {/* Profit summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Выручка (год)", value: financesKPIs.totalRevenue, color: "#00FF00" },
            { label: "Расходы (год)", value: financesKPIs.totalExpenses, color: "#f87171" },
            { label: "Прибыль (год)", value: financesKPIs.totalProfit, color: "#00FF00", highlight: true },
          ].map((item) => (
            <div key={item.label}
              className={`rounded-xl border p-5 ${item.highlight ? "bg-[#162110] border-[#00FF00]/20" : "bg-[#161b22] border-[#30363d]"}`}>
              <p className="text-[#9198a1] text-sm mb-1">{item.label}</p>
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Динамика выручки и расходов</h3>
              <p className="text-[#7d8590] text-sm">Март 2025 — Февраль 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {[{ color: "#00FF00", label: "Выручка" }, { color: "#4a5568", label: "Расходы" }, { color: "#88CC00", label: "Прибыль" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: l.color }} />
                  <span className="text-[#9198a1]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<LineTooltip />} />
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
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">P&L — Доходы и расходы</h3>
          <p className="text-[#7d8590] text-sm mb-5">Текущий месяц vs предыдущий</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Revenue P&L */}
            <div>
              <p className="text-[#7d8590] text-xs font-medium uppercase tracking-wider mb-3">Выручка</p>
              <div className="space-y-2">
                {plRevenue.map((row) => {
                  const diff = row.current - row.prev;
                  const pct = Math.round((diff / row.prev) * 100);
                  return (
                    <div key={row.category} className="flex items-center justify-between py-2 border-b border-[#21262d] last:border-0">
                      <span className="text-[#9198a1] text-sm">{row.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[#7d8590] text-xs">{formatCurrency(row.prev)}</span>
                        <span className="text-[#e6edf3] font-semibold text-sm">{formatCurrency(row.current)}</span>
                        <span className={`text-xs font-medium w-12 text-right ${diff >= 0 ? "text-[#00FF00]" : "text-red-400"}`}>
                          {diff >= 0 ? "+" : ""}{pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between py-2 border-t border-[#30363d] mt-1">
                  <span className="text-[#e6edf3] font-semibold text-sm">Итого доходы</span>
                  <span className="text-[#00FF00] font-bold">{formatCurrency(totalRevPL)}</span>
                </div>
              </div>
            </div>
            {/* Expenses P&L */}
            <div>
              <p className="text-[#7d8590] text-xs font-medium uppercase tracking-wider mb-3">Расходы</p>
              <div className="space-y-2">
                {plExpenses.map((row) => {
                  const diff = row.current - row.prev;
                  const pct = Math.round((diff / row.prev) * 100);
                  return (
                    <div key={row.category} className="flex items-center justify-between py-2 border-b border-[#21262d] last:border-0">
                      <span className="text-[#9198a1] text-sm">{row.category}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-[#7d8590] text-xs">{formatCurrency(row.prev)}</span>
                        <span className="text-[#e6edf3] font-semibold text-sm">{formatCurrency(row.current)}</span>
                        <span className={`text-xs font-medium w-12 text-right ${diff <= 0 ? "text-[#00FF00]" : "text-red-400"}`}>
                          {diff >= 0 ? "+" : ""}{pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between py-2 border-t border-[#30363d] mt-1">
                  <span className="text-[#e6edf3] font-semibold text-sm">Итого расходы</span>
                  <span className="text-red-400 font-bold">{formatCurrency(totalExpPL)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-[#30363d] flex items-center justify-between">
            <span className="text-[#e6edf3] font-semibold">Чистая прибыль</span>
            <div className="text-right">
              <span className="text-[#00FF00] font-bold text-xl">{formatCurrency(profitPL)}</span>
              <p className="text-[#7d8590] text-xs mt-0.5">Маржа: {Math.round((profitPL / totalRevPL) * 100)}%</p>
            </div>
          </div>
        </div>

        {/* Cash Flow Forecast */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Прогноз движения денег</h3>
              <p className="text-[#7d8590] text-sm">Факт + прогноз до июня 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {[{ color: "#00FF00", label: "Факт" }, { color: "#00FF00", label: "Прогноз", dashed: true }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 rounded" style={{ backgroundColor: l.color, opacity: l.dashed ? 0.5 : 1 }} />
                  <span className="text-[#9198a1]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={cashFlowData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.08} />
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<CashFlowTooltip />} />
              <Area type="monotone" dataKey="actual" name="Факт" stroke="#00FF00" strokeWidth={2}
                fill="url(#actualGrad)" dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} connectNulls={false} />
              <Area type="monotone" dataKey="forecast" name="Прогноз" stroke="#00FF00" strokeWidth={2}
                strokeDasharray="6 3" fill="url(#forecastGrad)" dot={false}
                activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart: Revenue by service */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Выручка по услугам</h3>
            <p className="text-[#7d8590] text-sm">Разбивка за текущий месяц</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serviceRevenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis dataKey="service" tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {serviceRevenueData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={serviceColors[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-5 space-y-2">
            {serviceRevenueData.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#21262d] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: serviceColors[i] }} />
                  <span className="text-[#9198a1] text-sm">{item.service}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[#7d8590] text-sm">{item.count} визитов</span>
                  <span className="text-[#e6edf3] font-semibold text-sm">{formatCurrency(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
