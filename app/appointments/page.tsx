"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import { appointmentsByHour, appointmentsData, appointmentsFunnel } from "@/lib/mockData";
import { CalendarCheck, XCircle, Clock, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
        <p className="text-[#9198a1] mb-1">{label}</p>
        <p className="text-[#00FF00] font-semibold">{payload[0].value} записей</p>
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

const funnelMax = appointmentsFunnel[0].count;

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
          <MetricCard title="Подтверждено" value={String(confirmed)} icon={<Clock size={18} />} />
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

        {/* Conversion Funnel + Hour heatmap */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Conversion Funnel */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="mb-5">
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Воронка конверсии</h3>
              <p className="text-[#7d8590] text-sm">Путь от обращения до оплаты</p>
            </div>
            <div className="space-y-3">
              {appointmentsFunnel.map((stage, i) => {
                const pct = Math.round((stage.count / funnelMax) * 100);
                const convFromPrev = i > 0
                  ? Math.round((stage.count / appointmentsFunnel[i - 1].count) * 100)
                  : 100;
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[#7d8590] text-xs w-4 text-right">{i + 1}</span>
                        <span className="text-[#e6edf3] text-sm">{stage.stage}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {i > 0 && (
                          <span className={`text-xs font-medium ${convFromPrev >= 70 ? "text-[#00FF00]" : convFromPrev >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                            ↓ {convFromPrev}%
                          </span>
                        )}
                        <span className="text-[#e6edf3] font-bold text-sm w-12 text-right">{stage.count}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#21262d] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: i === 0 ? "#00FF00" : i === 1 ? "#66CC00" : i === 2 ? "#44AA00" : i === 3 ? "#2a7a00" : "#1a5200",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-[#21262d] flex items-center justify-between">
              <span className="text-[#7d8590] text-sm">Итоговая конверсия</span>
              <span className="text-[#00FF00] font-bold text-xl">
                {Math.round((appointmentsFunnel[appointmentsFunnel.length - 1].count / funnelMax) * 100)}%
              </span>
            </div>
          </div>

          {/* Heatmap by hour */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="mb-5">
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Загрузка по часам</h3>
              <p className="text-[#7d8590] text-sm">Среднее количество записей по времени суток</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={appointmentsByHour} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "#7d8590", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#7d8590", fontSize: 12 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {appointmentsByHour.map((entry, index) => {
                    const intensity = entry.count / maxHour;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={intensity > 0.8 ? "#00FF00" : intensity > 0.6 ? "#88CC00" : intensity > 0.4 ? "#2d5a1b" : "#1f3a12"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-end">
              <span className="text-[#7d8590] text-xs">Загрузка:</span>
              {[
                { color: "#1f3a12", label: "Низкая" },
                { color: "#2d5a1b", label: "Средняя" },
                { color: "#88CC00", label: "Высокая" },
                { color: "#00FF00", label: "Пик" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[#7d8590] text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <AppointmentsTable />
      </div>
    </div>
  );
}
