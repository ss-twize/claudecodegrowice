"use client";

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
import { appointmentsByDay } from "@/lib/mockData";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
        <p className="text-[#8299B4] mb-1">{label}</p>
        <p className="text-[#00FF00] font-semibold">
          {payload[0].value} записей
        </p>
      </div>
    );
  }
  return null;
};

export default function AppointmentsChart() {
  const maxVal = Math.max(...appointmentsByDay.map((d) => d.appointments));

  return (
    <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex-1 flex flex-col">
      <div className="mb-5">
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Записи по дням</h3>
        <p className="text-[#5E7488] text-sm">Средние показатели за неделю</p>
      </div>
      <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={appointmentsByDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "#5E7488", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#5E7488", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
          <Bar dataKey="appointments" radius={[4, 4, 0, 0]}>
            {appointmentsByDay.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.appointments === maxVal ? "#00FF00" : "#1f3a2a"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
