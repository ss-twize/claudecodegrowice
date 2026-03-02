"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import StaffTable from "@/components/staff/StaffTable";
import { staffData, staffRevenueData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { UserCog, TrendingUp, Star, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
        <p className="text-[#9198a1] mb-1">{label}</p>
        <p className="text-[#00FF00] font-semibold">
          {new Intl.NumberFormat("ru-RU", {
            style: "currency",
            currency: "RUB",
            maximumFractionDigits: 0,
          }).format(payload[0].value)}
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

export default function StaffPage() {
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
          <MetricCard
            title="Мастеров"
            value={String(staffData.length)}
            icon={<UserCog size={18} />}
          />
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

        {/* Revenue by master */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-[#e6edf3] font-semibold">Выручка по мастерам</h3>
            <p className="text-[#7d8590] text-sm">Февраль 2026</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={staffRevenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#7d8590", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#7d8590", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v / 1000}к`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {staffRevenueData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staff cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#e6edf3] font-semibold">Карточки мастеров</h3>
            <div className="flex items-center gap-2 text-sm text-[#9198a1]">
              Средняя загрузка:{" "}
              <span className="text-[#00FF00] font-semibold">{avgWorkload}%</span>
            </div>
          </div>
          <StaffTable />
        </div>
      </div>
    </div>
  );
}
