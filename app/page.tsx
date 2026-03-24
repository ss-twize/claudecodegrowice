"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import type { MetricTooltipDef } from "@/components/ui/MetricCard";
import RevenueChart from "@/components/charts/RevenueChart";
import ServicesChart from "@/components/charts/ServicesChart";
import AppointmentsChart from "@/components/charts/AppointmentsChart";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useDashboardStats } from "@/lib/hooks/useDashboardStats";
import { useRealtimePlatform } from "@/lib/hooks/useRealtimePlatform";
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
  const { revenueSeries, servicesSeries, appointmentsByDay, activity } = useRealtimePlatform();

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
              compact
            />
          )}
          <MetricCard
            title="Новые клиенты"
            value={loading ? "—" : String(stats.newClients)}
            change={stats.newClientsGrowth}
            changeLabel="vs прошлый месяц"
            icon={<Users size={18} />}
            tooltip={TOOLTIPS.newClients}
            compact
          />
          <MetricCard
            title="Всего записей"
            value={loading ? "—" : String(stats.totalAppointments)}
            change={stats.appointmentsGrowth}
            changeLabel="vs прошлый месяц"
            icon={<CalendarCheck size={18} />}
            tooltip={TOOLTIPS.appointments}
            compact
          />
          {isOwner && (
            <MetricCard
              title="Средний чек"
              value={loading ? "—" : formatCurrency(stats.avgCheck)}
              icon={<Receipt size={18} />}
              tooltip={TOOLTIPS.avgCheck}
              compact
            />
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 flex flex-col">
            <RevenueChart data={revenueSeries} />
          </div>
          <div className="self-start">
            <ServicesChart data={servicesSeries} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:items-end">
          <div className="xl:col-span-2 flex flex-col xl:mt-16">
            <AppointmentsChart data={appointmentsByDay} />
          </div>

          {/* Recent Activity */}
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col">
            <h3 className="text-[#EDF2FA] font-semibold mb-4 font-unbounded">Последние события</h3>
            <div className="space-y-3">
              {activity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 pb-3 border-b border-[#1A2535] last:border-0 last:pb-0"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center flex-shrink-0 mt-0.5">
                    {activityIcons[activity.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#EDF2FA] text-xs leading-relaxed">{activity.text}</p>
                    <p className="text-[#5E7488] text-xs mt-0.5">{activity.time}</p>
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
