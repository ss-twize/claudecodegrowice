"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { revenueData } from "@/lib/mockData";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
        <p className="text-[#8299B4] mb-2 font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}:{" "}
            {new Intl.NumberFormat("ru-RU", {
              style: "currency",
              currency: "RUB",
              maximumFractionDigits: 0,
            }).format(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart() {
  return (
    <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Выручка за год</h3>
          <p className="text-[#5E7488] text-sm">Март 2025 — Февраль 2026</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#00FF00]" />
            <span className="text-[#8299B4]">Выручка</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#4a5568]" />
            <span className="text-[#8299B4]">Расходы</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0" style={{ minHeight: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00FF00" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4a5568" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4a5568" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#5E7488", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#5E7488", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v / 1000}к`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            name="Выручка"
            stroke="#00FF00"
            strokeWidth={2}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Расходы"
            stroke="#4a5568"
            strokeWidth={2}
            fill="url(#expensesGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#4a5568", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
