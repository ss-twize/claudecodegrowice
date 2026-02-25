"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import { appointmentsByHour, appointmentsData } from "@/lib/mockData";
import { CalendarCheck, XCircle, Clock, AlertTriangle } from "lucide-react";
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
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 text-sm">
        <p className="text-[#888888] mb-1">{label}</p>
        <p className="text-[#AAFF00] font-semibold">{payload[0].value} записей</p>
      </div>
    );
  }
  return null;
};

const total = appointmentsData.length;
const confirmed = appointmentsData.filter((a) => a.status === "Подтверждено").length;
const cancelled = appointmentsData.filter((a) => a.status === "Отменено").length;
const pending = appointmentsData.filter((a) => a.status === "Ожидание").length;
const cancelRate = Math.round((cancelled / total) * 100);

const maxHour = Math.max(...appointmentsByHour.map((h) => h.count));

export default function AppointmentsPage() {
  return (
    <div>
      <Header title="Записи" subtitle="Управление визитами клиентов" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Всего записей"
            value={String(total)}
            change={11.3}
            changeLabel="vs прошлый месяц"
            icon={<CalendarCheck size={18} />}
            accent
          />
          <MetricCard
            title="Подтверждено"
            value={String(confirmed)}
            icon={<Clock size={18} />}
          />
          <MetricCard
            title="Процент отмен"
            value={`${cancelRate}%`}
            change={-2.5}
            changeLabel="улучшение"
            icon={<XCircle size={18} />}
          />
          <MetricCard
            title="Ожидают подтверждения"
            value={String(pending)}
            icon={<AlertTriangle size={18} />}
          />
        </div>

        {/* Heatmap bar by hour */}
        <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-white font-semibold">Загрузка по часам</h3>
            <p className="text-[#555555] text-sm">Среднее количество записей по времени суток</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={appointmentsByHour}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#555555", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#555555", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={25}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(170,255,0,0.05)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {appointmentsByHour.map((entry, index) => {
                  const intensity = entry.count / maxHour;
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        intensity > 0.8
                          ? "#AAFF00"
                          : intensity > 0.6
                          ? "#88CC00"
                          : intensity > 0.4
                          ? "#3a5c00"
                          : "#1e2e00"
                      }
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 justify-end">
            <span className="text-[#555555] text-xs">Загрузка:</span>
            {[
              { color: "#1e2e00", label: "Низкая" },
              { color: "#3a5c00", label: "Средняя" },
              { color: "#88CC00", label: "Высокая" },
              { color: "#AAFF00", label: "Пик" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[#555555] text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments Table */}
        <AppointmentsTable />
      </div>
    </div>
  );
}
