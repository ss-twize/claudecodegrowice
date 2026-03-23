"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useClients } from "@/lib/hooks/useClients";
import { formatCurrency } from "@/lib/utils";
import { UserPlus, Users, BedDouble, RefreshCcw, PieChart } from "lucide-react";

const statusLabel: Record<string, string> = {
  new: "Новый",
  regular: "Активный",
  sleeping: "Спящий",
  lost: "Потерянный",
  vip: "VIP",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU");
}

export default function ClientsPage() {
  const { clients, loading } = useClients();

  const newClients = clients.filter((client) => client.clientStatus === "new").length;
  const activeClients = clients.filter((client) => client.clientStatus === "regular" || client.clientStatus === "vip").length;
  const sleepingClients = clients.filter((client) => client.clientStatus === "sleeping").length;
  const returnedClients = clients.filter((client) => client.daysAbsent >= 28 && client.daysAbsent <= 60).length;
  const repeatShare = clients.length > 0 ? Math.round((clients.filter((client) => client.visits > 1).length / clients.length) * 100) : 0;

  const tableRows = clients.slice(0, 20).map((client) => ({
    ...client,
    nextAppointment: client.upcomingAppointment ? formatDate(client.lastVisitAt ? new Date(new Date(client.lastVisitAt).getTime() + 1000 * 60 * 60 * 24 * 28).toISOString() : null) : "—",
    scenarios: [
      client.daysAbsent >= 28 ? "повтор" : null,
      client.daysAbsent >= 50 ? "возврат" : null,
      client.visits > 0 ? "отзыв" : null,
    ].filter(Boolean).join(", ") || "—",
  }));

  return (
    <div>
      <Header title="Клиенты" subtitle="Понятная клиентская база без перегруза CRM-полями и спорных скорингов" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <MetricCard title="Новые" value={loading ? "—" : String(newClients)} icon={<UserPlus size={18} />} accent />
          <MetricCard title="Активные" value={String(activeClients)} icon={<Users size={18} />} />
          <MetricCard title="Спящие" value={String(sleepingClients)} icon={<BedDouble size={18} />} />
          <MetricCard title="Возвращённые" value={String(returnedClients)} icon={<RefreshCcw size={18} />} />
          <MetricCard title="Доля повторных" value={`${repeatShare}%`} icon={<PieChart size={18} />} />
        </div>

        <section className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Фильтры MVP</h3>
          <p className="text-[#5E7488] text-sm mt-1">Статус клиента · канал · последний визит · не был 50 дней · участвовал в автоматизациях · есть будущая запись.</p>
        </section>

        <section className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">База клиентов</h3>
            <p className="text-[#5E7488] text-sm">Оставлены только поля, по которым можно принять действие.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["Имя", "Телефон", "Канал", "Статус", "Последний визит", "Визитов", "Сумма покупок", "Следующая запись", "Сценарии"].map((header) => (
                    <th key={header} className="px-5 py-3 text-left text-[#5E7488] text-xs font-medium whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((client) => (
                  <tr key={client.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{client.name}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{client.phone}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{client.communicationChannel}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{statusLabel[client.clientStatus]}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{formatDate(client.lastVisitAt)}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{client.visits}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{formatCurrency(client.revenue)}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{client.nextAppointment}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{client.scenarios}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
