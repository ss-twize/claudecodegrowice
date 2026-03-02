"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { staffData, staffRevenueData, staffKPIData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { SortableHeader, useSortable } from "@/components/ui/SortableHeader";
import { UserCog, TrendingUp, Star, Users, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
        <p className="text-[#9198a1] mb-1">{label}</p>
        <p className="text-[#00FF00] font-semibold">
          {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const totalRevenue = staffData.reduce((s, m) => s + m.revenue, 0);
const totalClients = staffData.reduce((s, m) => s + m.clients, 0);
const avgRating = (staffData.reduce((s, m) => s + m.rating, 0) / staffData.length).toFixed(1);
const avgWorkload = Math.round(staffData.reduce((s, m) => s + m.workload, 0) / staffData.length);
const colors = ["#00FF00", "#88CC00", "#66AA00", "#448800"];

const mergedStaffData = staffData.map((m) => ({
  ...m,
  ...staffKPIData.find((k) => k.masterId === m.id),
}));

export default function StaffPage() {
  const { sorted: sortedKPI, sortCol: kpiSortCol, sortDir: kpiSortDir, onSort: kpiOnSort } = useSortable(mergedStaffData);

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
            changeLabel="vs прошлый месяц"
            icon={<TrendingUp size={18} />}
            accent
          />
          <MetricCard title="Мастеров" value={String(staffData.length)} icon={<UserCog size={18} />} />
          <MetricCard
            title="Средняя оценка"
            value={avgRating}
            change={0.2}
            changeLabel="vs прошлый месяц"
            icon={<Star size={18} />}
          />
          <MetricCard
            title="Уникальных клиентов"
            value={String(totalClients)}
            change={7.3}
            changeLabel="vs прошлый месяц"
            icon={<Users size={18} />}
          />
        </div>

        {/* Revenue + KPI table */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Revenue chart */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col">
            <div className="mb-5">
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Выручка по мастерам</h3>
              <p className="text-[#7d8590] text-sm">Февраль 2026</p>
            </div>
            <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={staffRevenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v / 1000}к`} width={45} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
                <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                  {staffRevenueData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* KPI table */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Показатели по мастерам</h3>
              <p className="text-[#7d8590] text-sm">Конверсия, не явки, время сессии</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#21262d]">
                    <SortableHeader label="Мастер"        col="name"           sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Конверсия"     col="conversionRate"  sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Не явки"       col="noShowPercent"   sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Время сессии"  col="avgSession"      sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedKPI.map((master, i) => {
                    const colorIdx = staffData.findIndex((s) => s.id === master.id);
                    return (
                      <tr key={master.id} className="border-b border-[#21262d] last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                              style={{ backgroundColor: colors[colorIdx >= 0 ? colorIdx : i] }}>
                              {master.avatar}
                            </div>
                            <span className="text-[#e6edf3] text-sm font-medium whitespace-nowrap">{master.name.split(" ")[0]}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {master.conversionRate != null && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#00FF00]" style={{ width: `${master.conversionRate}%` }} />
                              </div>
                              <span className="text-[#00FF00] text-sm font-semibold">{master.conversionRate}%</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {master.noShowPercent != null && (
                            <div>
                              <span className={`text-sm font-medium ${master.noShowPercent > 8 ? "text-red-400" : master.noShowPercent > 5 ? "text-yellow-400" : "text-[#00FF00]"}`}>
                                {master.noShowPercent}%
                              </span>
                              <span className="text-[#7d8590] text-xs ml-1">({master.noShowCount} раз)</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="text-[#9198a1] text-sm">{master.avgSession || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Staff cards with extended KPI */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Карточки мастеров</h3>
            <div className="flex items-center gap-2 text-sm text-[#9198a1]">
              Средняя загрузка:{" "}
              <span className="text-[#00FF00] font-semibold">{avgWorkload}%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {staffData.map((master, i) => {
              const kpi = staffKPIData.find((k) => k.masterId === master.id);
              return (
                <div key={master.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 card-hover">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0"
                      style={{ backgroundColor: master.color }}>
                      {master.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#e6edf3] font-semibold truncate">{master.name}</p>
                      <p className="text-[#7d8590] text-xs">{master.role}</p>
                    </div>
                  </div>

                  {/* Workload bar */}
                  <div className="mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[#7d8590] text-xs">Загрузка</span>
                      <span className="text-[#e6edf3] text-xs font-medium">{master.workload}%</span>
                    </div>
                    <div className="h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${master.workload}%`, backgroundColor: master.color }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#7d8590] text-xs">Выручка</span>
                      <span className="text-[#00FF00] text-xs font-semibold">{formatCurrency(master.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7d8590] text-xs">Средний чек</span>
                      <span className="text-[#9198a1] text-xs">{formatCurrency(master.avgCheck)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7d8590] text-xs">Клиентов</span>
                      <span className="text-[#9198a1] text-xs">{master.clients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#7d8590] text-xs">Рейтинг</span>
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[#9198a1] text-xs">{master.rating}</span>
                      </div>
                    </div>
                  </div>

                  {kpi && (
                    <div className="mt-4 pt-3 border-t border-[#21262d] grid grid-cols-2 gap-2">
                      <div className="bg-[#1c2128] rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <CheckCircle2 size={11} className="text-[#00FF00]" />
                          <span className="text-[#00FF00] text-xs font-bold">{kpi.conversionRate}%</span>
                        </div>
                        <p className="text-[#7d8590] text-xs">Конверсия</p>
                      </div>
                      <div className="bg-[#1c2128] rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <AlertTriangle size={11} className={kpi.noShowPercent > 8 ? "text-red-400" : "text-yellow-400"} />
                          <span className={`text-xs font-bold ${kpi.noShowPercent > 8 ? "text-red-400" : "text-yellow-400"}`}>{kpi.noShowPercent}%</span>
                        </div>
                        <p className="text-[#7d8590] text-xs">Не явки</p>
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
