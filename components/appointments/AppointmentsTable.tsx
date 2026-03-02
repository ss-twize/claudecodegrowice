'use client'

import { formatCurrency } from "@/lib/utils";
import { SortableHeader, useSortable } from "@/components/ui/SortableHeader";
import type { Appointment } from "@/lib/hooks/useAppointments";

const statusConfig: Record<string, { classes: string; dot: string }> = {
  Подтверждено: { classes: "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20",     dot: "bg-[#00FF00]" },
  Ожидание:     { classes: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",  dot: "bg-yellow-400" },
  Завершено:    { classes: "bg-blue-500/10 text-blue-400 border border-blue-500/20",         dot: "bg-blue-400" },
  Отменено:     { classes: "bg-red-500/10 text-red-400 border border-red-500/20",            dot: "bg-red-400" },
  "Не пришёл":  { classes: "bg-orange-500/10 text-orange-400 border border-orange-500/20",  dot: "bg-orange-400" },
};

const defaultStatus = { classes: "bg-[#21262d] text-[#9198a1] border border-[#30363d]", dot: "bg-[#9198a1]" };

interface Props {
  appointments: Appointment[]
  loading?: boolean
}

export default function AppointmentsTable({ appointments, loading }: Props) {
  const tableData = appointments.map((a) => ({ ...a, clientName: a.client }));
  const { sorted, sortCol, sortDir, onSort } = useSortable(tableData);

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
        <div>
          <h3 className="text-[#e6edf3] font-semibold font-unbounded">Записи</h3>
          <p className="text-[#7d8590] text-sm">
            {loading ? "Загрузка..." : `${appointments.length} последних записей`}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#7d8590] text-sm">Загрузка данных...</div>
        ) : appointments.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#7d8590] text-sm">Записей не найдено</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#21262d]">
                <SortableHeader label="Клиент"      col="clientName" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Услуга"       col="service"    sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Мастер"       col="master"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Дата"         col="date"       sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <th className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">Длит.</th>
                <SortableHeader label="Сумма"        col="price"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Статус"       col="status"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((appt) => {
                const sc = statusConfig[appt.status] || defaultStatus;
                return (
                  <tr key={appt.id} className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors">
                    <td className="px-5 py-3.5 text-[#e6edf3] text-sm font-medium whitespace-nowrap">{appt.client}</td>
                    <td className="px-5 py-3.5 text-[#9198a1] text-sm whitespace-nowrap">{appt.service}</td>
                    <td className="px-5 py-3.5 text-[#9198a1] text-sm whitespace-nowrap">{appt.master}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-[#e6edf3] text-sm">{appt.date}</p>
                      <p className="text-[#7d8590] text-xs">{appt.time}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[#9198a1] text-sm">{appt.duration}</td>
                    <td className="px-5 py-3.5 text-[#e6edf3] text-sm font-semibold whitespace-nowrap">
                      {appt.price > 0 ? formatCurrency(appt.price) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`flex items-center gap-1.5 w-fit text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap ${sc.classes}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
