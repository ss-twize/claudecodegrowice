"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import type { MetricTooltipDef } from "@/components/ui/MetricCard";
import RevenueChart from "@/components/charts/RevenueChart";
import ServicesChart from "@/components/charts/ServicesChart";
import AppointmentsChart from "@/components/charts/AppointmentsChart";
import { recentActivity } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useDashboardStats } from "@/lib/hooks/useDashboardStats";
import {
  TrendingUp,
  Users,
  CalendarCheck,
  Receipt,
  UserPlus,
  CreditCard,
  XCircle,
} from "lucide-react";

const TOOLTIPS: Record<string, MetricTooltipDef> = {
  revenue: {
    formula: "Сумма всех оплат за текущий месяц",
    description: "Ключевой показатель дохода. Растёт при увеличении числа записей или среднего чека.",
  },
  newClients: {
    description: "Клиенты, впервые обратившиеся в этом месяце. Отражает эффективность маркетинга и сарафанного радио.",
  },
  appointments: {
    description: "Количество созданных записей за месяц. Прямо влияет на выручку и загрузку мастеров.",
  },
  avgCheck: {
    formula: "Выручка ÷ Количество визитов",
    description: "Средняя сумма одного визита. Растёт при допродажах и переходе клиентов к более дорогим услугам.",
  },
};

const activityIcons: Record<string, React.ReactNode> = {
  appointment: <CalendarCheck size={14} className="text-[#00FF00]" />,
  client: <UserPlus size={14} className="text-blue-400" />,
  payment: <CreditCard size={14} className="text-[#00FF00]" />,
  cancel: <XCircle size={14} className="text-red-400" />,
};

export default function DashboardPage() {
  const { isOwner } = useAuth();
  const { stats, loading } = useDashboardStats();

  return (
    <div>
      <Header title="Главная" subtitle="Обзор ключевых показателей" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className={`grid gap-4 ${isOwner ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2"}`}>
          {isOwner && (
            <MetricCard
              title="Выручка за месяц"
              value={loading ? "—" : formatCurrency(stats.monthlyRevenue)}
              change={stats.monthlyRevenueGrowth}
              changeLabel="vs прошлый месяц"
              icon={<TrendingUp size={18} />}
              accent
              tooltip={TOOLTIPS.revenue}
            />
          )}
          <MetricCard
            title="Новые клиенты"
            value={loading ? "—" : String(stats.newClients)}
            change={stats.newClientsGrowth}
            changeLabel="vs прошлый месяц"
            icon={<Users size={18} />}
            tooltip={TOOLTIPS.newClients}
          />
          <MetricCard
            title="Всего записей"
            value={loading ? "—" : String(stats.totalAppointments)}
            change={stats.appointmentsGrowth}
            changeLabel="vs прошлый месяц"
            icon={<CalendarCheck size={18} />}
            tooltip={TOOLTIPS.appointments}
          />
          {isOwner && (
            <MetricCard
              title="Средний чек"
              value={loading ? "—" : formatCurrency(stats.avgCheck)}
              icon={<Receipt size={18} />}
              tooltip={TOOLTIPS.avgCheck}
            />
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 flex flex-col">
            <RevenueChart />
          </div>
          <ServicesChart />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:items-stretch">
          <div className="xl:col-span-2 flex flex-col">
            <AppointmentsChart />
          </div>

          {/* Recent Activity */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col">
            <h3 className="text-[#e6edf3] font-semibold mb-4 font-unbounded">Последние события</h3>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b border-[#21262d] last:border-0 last:pb-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {activityIcons[activity.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e6edf3] text-xs leading-relaxed">{activity.text}</p>
                    <p className="text-[#7d8590] text-xs mt-0.5">{activity.time}</p>
                  </div>
                  {isOwner && activity.amount !== null && (
                    <span
                      className={`text-xs font-bold flex-shrink-0 ${
                        activity.amount > 0 ? "text-[#00FF00]" : "text-red-400"
                      }`}
                    >
                      {activity.amount > 0 ? "+" : ""}
                      {formatCurrency(activity.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
