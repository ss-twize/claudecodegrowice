import { appointmentsData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { classes: string; dot: string }> = {
  Подтверждено: {
    classes: "bg-[#AAFF00]/10 text-[#AAFF00] border border-[#AAFF00]/20",
    dot: "bg-[#AAFF00]",
  },
  Ожидание: {
    classes: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    dot: "bg-yellow-400",
  },
  Отменено: {
    classes: "bg-red-500/10 text-red-400 border border-red-500/20",
    dot: "bg-red-400",
  },
};

export default function AppointmentsTable() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Предстоящие записи</h3>
          <p className="text-[#555555] text-sm">25–27 февраля 2026</p>
        </div>
        <button className="text-sm bg-[#AAFF00] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#ccff33] transition-colors">
          + Запись
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {["Клиент", "Услуга", "Мастер", "Дата и время", "Длит.", "Сумма", "Статус"].map((h) => (
                <th key={h} className="text-left text-[#555555] text-xs font-medium px-5 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appointmentsData.map((appt) => {
              const sc = statusConfig[appt.status];
              return (
                <tr
                  key={appt.id}
                  className="border-b border-[#141414] hover:bg-[#141414] transition-colors"
                >
                  <td className="px-5 py-3.5 text-white text-sm font-medium whitespace-nowrap">
                    {appt.client}
                  </td>
                  <td className="px-5 py-3.5 text-[#888888] text-sm whitespace-nowrap">
                    {appt.service}
                  </td>
                  <td className="px-5 py-3.5 text-[#888888] text-sm whitespace-nowrap">
                    {appt.master}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <p className="text-white text-sm">{appt.date}</p>
                    <p className="text-[#555555] text-xs">{appt.time}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[#888888] text-sm">{appt.duration}</td>
                  <td className="px-5 py-3.5 text-white text-sm font-semibold whitespace-nowrap">
                    {formatCurrency(appt.price)}
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
      </div>
    </div>
  );
}
