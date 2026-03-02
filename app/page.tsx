import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import RevenueChart from "@/components/charts/RevenueChart";
import ServicesChart from "@/components/charts/ServicesChart";
import AppointmentsChart from "@/components/charts/AppointmentsChart";
import { dashboardKPIs, recentActivity } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Users,
  CalendarCheck,
  Receipt,
  UserPlus,
  CreditCard,
  XCircle,
} from "lucide-react";

const activityIcons: Record<string, React.ReactNode> = {
  appointment: <CalendarCheck size={14} className="text-[#00FF00]" />,
  client: <UserPlus size={14} className="text-blue-400" />,
  payment: <CreditCard size={14} className="text-[#00FF00]" />,
  cancel: <XCircle size={14} className="text-red-400" />,
};

export default function DashboardPage() {
  return (
    <div>
      <Header title="Главная" subtitle="Обзор ключевых показателей" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Выручка за месяц"
            value={formatCurrency(dashboardKPIs.monthlyRevenue)}
            change={dashboardKPIs.monthlyRevenueGrowth}
            changeLabel="vs прошлый месяц"
            icon={<TrendingUp size={18} />}
            accent
          />
          <MetricCard
            title="Новые клиенты"
            value={String(dashboardKPIs.newClients)}
            change={dashboardKPIs.newClientsGrowth}
            changeLabel="vs прошлый месяц"
            icon={<Users size={18} />}
          />
          <MetricCard
            title="Всего записей"
            value={String(dashboardKPIs.totalAppointments)}
            change={dashboardKPIs.appointmentsGrowth}
            changeLabel="vs прошлый месяц"
            icon={<CalendarCheck size={18} />}
          />
          <MetricCard
            title="Средний чек"
            value={formatCurrency(dashboardKPIs.avgCheck)}
            change={dashboardKPIs.avgCheckGrowth}
            changeLabel="vs прошлый месяц"
            icon={<Receipt size={18} />}
          />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
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
                  {activity.amount !== null && (
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
