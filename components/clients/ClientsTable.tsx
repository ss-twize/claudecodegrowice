import { clientsData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

const statusColors: Record<string, string> = {
  VIP: "bg-[#AAFF00]/15 text-[#AAFF00] border border-[#AAFF00]/25",
  Постоянный: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  Новый: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
};

export default function ClientsTable() {
  return (
    <div className="bg-[#111111] border border-[#1e1e1e] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">База клиентов</h3>
          <p className="text-[#555555] text-sm">{clientsData.length} клиентов показано</p>
        </div>
        <button className="text-sm bg-[#AAFF00] text-black font-semibold px-4 py-1.5 rounded-lg hover:bg-[#ccff33] transition-colors">
          + Добавить
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {["Клиент", "Контакты", "Визиты", "Последний визит", "Сумма", "LTV", "Статус", "Источник"].map((h) => (
                <th key={h} className="text-left text-[#555555] text-xs font-medium px-5 py-3 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientsData.map((client) => (
              <tr
                key={client.id}
                className="border-b border-[#141414] hover:bg-[#141414] transition-colors"
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#AAFF00]/10 border border-[#AAFF00]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#AAFF00] text-xs font-bold">{client.avatar}</span>
                    </div>
                    <span className="text-white text-sm font-medium whitespace-nowrap">{client.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-white text-sm whitespace-nowrap">{client.phone}</p>
                  <p className="text-[#555555] text-xs">{client.email}</p>
                </td>
                <td className="px-5 py-3.5 text-white text-sm font-semibold">{client.visits}</td>
                <td className="px-5 py-3.5 text-[#888888] text-sm whitespace-nowrap">{client.lastVisit}</td>
                <td className="px-5 py-3.5 text-white text-sm font-semibold whitespace-nowrap">
                  {formatCurrency(client.totalSpent)}
                </td>
                <td className="px-5 py-3.5 text-[#AAFF00] text-sm font-semibold whitespace-nowrap">
                  {formatCurrency(client.ltv)}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md whitespace-nowrap ${statusColors[client.status]}`}>
                    {client.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[#888888] text-sm whitespace-nowrap">{client.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
