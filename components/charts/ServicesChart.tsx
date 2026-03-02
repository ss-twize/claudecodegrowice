"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { servicesData } from "@/lib/mockData";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
        <p className="text-[#EDF2FA] font-semibold">{payload[0].name}</p>
        <p className="text-[#00FF00]">{payload[0].value}% клиентов</p>
      </div>
    );
  }
  return null;
};

export default function ServicesChart() {
  return (
    <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
      <div className="mb-5">
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Популярные услуги</h3>
        <p className="text-[#5E7488] text-sm">Распределение по записям</p>
      </div>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={servicesData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              dataKey="value"
              strokeWidth={0}
            >
              {servicesData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-2.5">
          {servicesData.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[#8299B4] text-xs">{item.name}</span>
              </div>
              <span className="text-[#EDF2FA] text-xs font-semibold">
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
