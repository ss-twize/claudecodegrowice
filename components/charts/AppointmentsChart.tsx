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
      <div className="bg-[#1c2128] border border-[#30363d] rounded-lg p-3 text-sm">
        <p className="text-[#9198a1] mb-1">{label}</p>
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
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex-1">
      <div className="mb-5">
        <h3 className="text-[#e6edf3] font-semibold font-unbounded">Записи по дням</h3>
        <p className="text-[#7d8590] text-sm">Средние показатели за неделю</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={appointmentsByDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "#7d8590", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#7d8590", fontSize: 12 }}
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
  );
}
