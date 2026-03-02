import { appointmentsData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { classes: string; dot: string }> = {
  Подтверждено: {
    classes: "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20",
    dot: "bg-[#00FF00]",
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
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between">
        <div>
          <h3 className="text-[#e6edf3] font-semibold">Предстоящие записи</h3>
          <p className="text-[#7d8590] text-sm">25–27 февраля 2026</p>
        </div>
        <button className="text-sm bg-[#00FF00] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#ccff33] transition-colors">
          + Запись
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#21262d]">
              {["Клиент", "Услуга", "Мастер", "Дата и время", "Длит.", "Сумма", "Статус"].map((h) => (
                <th key={h} className="text-left text-[#7d8590] text-xs font-medium px-5 py-3 whitespace-nowrap">
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
                  className="border-b border-[#21262d] hover:bg-[#1c2128] transition-colors"
                >
                  <td className="px-5 py-3.5 text-[#e6edf3] text-sm font-medium whitespace-nowrap">
                    {appt.client}
                  </td>
                  <td className="px-5 py-3.5 text-[#9198a1] text-sm whitespace-nowrap">
                    {appt.service}
                  </td>
                  <td className="px-5 py-3.5 text-[#9198a1] text-sm whitespace-nowrap">
                    {appt.master}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <p className="text-[#e6edf3] text-sm">{appt.date}</p>
                    <p className="text-[#7d8590] text-xs">{appt.time}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[#9198a1] text-sm">{appt.duration}</td>
                  <td className="px-5 py-3.5 text-[#e6edf3] text-sm font-semibold whitespace-nowrap">
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
