"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import ClientsTable from "@/components/clients/ClientsTable";
import { clientsKPIs, clientSourcesData } from "@/lib/mockData";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { Users, UserPlus, Heart, TrendingUp } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-sm">
        <p className="text-white font-semibold">{payload[0].name}</p>
        <p className="text-[#AAFF00]">{payload[0].value}% клиентов</p>
      </div>
    );
  }
  return null;
};

export default function ClientsPage() {
  return (
    <div>
      <Header title="Клиенты" subtitle="Управление клиентской базой" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Всего клиентов"
            value={String(clientsKPIs.total)}
            icon={<Users size={18} />}
            accent
          />
          <MetricCard
            title="Новых за месяц"
            value={String(clientsKPIs.newThisMonth)}
            change={8.2}
            changeLabel="vs прошлый месяц"
            icon={<UserPlus size={18} />}
          />
          <MetricCard
            title="Retention Rate"
            value={formatPercent(clientsKPIs.retentionRate)}
            change={2.1}
            changeLabel="vs прошлый месяц"
            icon={<Heart size={18} />}
          />
          <MetricCard
            title="Средний LTV"
            value={formatCurrency(clientsKPIs.avgLTV)}
            change={5.4}
            changeLabel="vs прошлый квартал"
            icon={<TrendingUp size={18} />}
          />
        </div>

        {/* Table + Sources */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <ClientsTable />
          </div>

          {/* Sources */}
          <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5">
            <div className="mb-5">
              <h3 className="text-white font-semibold">Источники привлечения</h3>
              <p className="text-[#555555] text-sm">Откуда приходят клиенты</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={clientSourcesData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {clientSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {clientSourcesData.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[#888888] text-xs">{item.name}</span>
                  </div>
                  <span className="text-white text-xs font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
