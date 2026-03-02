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

const defaultStatus = { classes: "bg-[#1A2535] text-[#8299B4] border border-[#223444]", dot: "bg-[#8299B4]" };

interface Props {
  appointments: Appointment[]
  loading?: boolean
}

export default function AppointmentsTable({ appointments, loading }: Props) {
  const tableData = appointments.map((a) => ({ ...a, clientName: a.client }));
  const { sorted, sortCol, sortDir, onSort } = useSortable(tableData);

  return (
    <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#223444] flex items-center justify-between">
        <div>
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Записи</h3>
          <p className="text-[#5E7488] text-sm">
            {loading ? "Загрузка..." : `${appointments.length} последних записей`}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#5E7488] text-sm">Загрузка данных...</div>
        ) : appointments.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#5E7488] text-sm">Записей не найдено</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A2535]">
                <SortableHeader label="Клиент"      col="clientName" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Услуга"       col="service"    sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Мастер"       col="master"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Дата"         col="date"       sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Длит.</th>
                <SortableHeader label="Сумма"        col="price"      sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                <SortableHeader label="Статус"       col="status"     sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((appt) => {
                const sc = statusConfig[appt.status] || defaultStatus;
                return (
                  <tr key={appt.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{appt.client}</td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{appt.service}</td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{appt.master}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <p className="text-[#EDF2FA] text-sm">{appt.date}</p>
                      <p className="text-[#5E7488] text-xs">{appt.time}</p>
                    </td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm">{appt.duration}</td>
                    <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-semibold whitespace-nowrap">
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
