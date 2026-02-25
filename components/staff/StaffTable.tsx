import { staffData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { Star } from "lucide-react";

export default function StaffTable() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {staffData.map((master) => (
        <div
          key={master.id}
          className="bg-[#111111] border border-[#1e1e1e] rounded-xl p-5 card-hover"
        >
          <div className="flex items-start gap-4 mb-5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-bold text-base flex-shrink-0"
              style={{ backgroundColor: master.color }}
            >
              {master.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold">{master.name}</p>
              <p className="text-[#888888] text-sm">{master.role}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={12} className="text-[#AAFF00] fill-[#AAFF00]" />
                <span className="text-[#AAFF00] text-sm font-semibold">{master.rating}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[#AAFF00] font-bold text-sm">{formatCurrency(master.revenue)}</p>
              <p className="text-[#555555] text-xs">за месяц</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Клиентов", value: master.clients },
              { label: "Записей", value: master.appointments },
              { label: "Ср. чек", value: `${(master.avgCheck / 1000).toFixed(1)}к` },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#141414] rounded-lg p-3 text-center">
                <p className="text-white font-bold text-sm">{stat.value}</p>
                <p className="text-[#555555] text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Workload bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#555555] text-xs">Загрузка</span>
              <span className="text-white text-xs font-semibold">{master.workload}%</span>
            </div>
            <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${master.workload}%`,
                  backgroundColor: master.color,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
