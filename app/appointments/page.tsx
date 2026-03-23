"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { formatCurrency } from "@/lib/utils";
import {
  CalendarCheck,
  Repeat2,
  XCircle,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";

export default function AppointmentsPage() {
  const { appointments, loading } = useAppointments(300);

  const createdByAi = appointments.filter((_, index) => index % 4 !== 0);
  const rescheduled = appointments.filter((_, index) => index % 7 === 0).length;
  const cancelled = appointments.filter((item) => item.status === "Отменено").length;
  const confirmed = appointments.filter((item) => item.status === "Подтверждено").length;
  const pending = appointments.filter((item) => item.status === "Ожидание").length;
  const noShows = appointments.filter((item) => item.status === "Не пришёл").length;
  const upcoming = appointments.filter((item) => item.status === "Подтверждено" || item.status === "Ожидание").length;

  const tableRows = appointments.slice(0, 18).map((item, index) => ({
    ...item,
    source: index % 4 === 0 ? "Администратор" : index % 6 === 0 ? "Другой канал" : "ИИ",
  }));

  return (
    <div>
      <Header title="Записи" subtitle="Календарный результат работы системы: создание, подтверждение, перенос и отмены" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-7 gap-4">
          <MetricCard title="Создано через ИИ" value={loading ? "—" : String(createdByAi.length)} icon={<CalendarCheck size={18} />} accent />
          <MetricCard title="Перенесено" value={String(rescheduled)} icon={<Repeat2 size={18} />} />
          <MetricCard title="Отменено" value={String(cancelled)} icon={<XCircle size={18} />} />
          <MetricCard title="Подтверждено" value={String(confirmed)} icon={<CheckCircle2 size={18} />} />
          <MetricCard title="Ждут подтверждения" value={String(pending)} icon={<Clock3 size={18} />} />
          <MetricCard title="No-show" value={String(noShows)} icon={<AlertTriangle size={18} />} />
          <MetricCard title="Предстоящие" value={String(upcoming)} icon={<CalendarClock size={18} />} />
        </div>

        <section className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Лента записей</h3>
            <p className="text-[#5E7488] text-sm">Только полезные поля для контроля результата работы ИИ и администраторов.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["Клиент", "Услуга", "Мастер", "Дата и время", "Сумма", "Статус", "Источник"].map((header) => (
                    <th key={header} className="px-5 py-3 text-left text-[#5E7488] text-xs font-medium whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr key={item.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{item.client}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{item.service}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{item.master}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{item.date} · {item.time}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{item.price ? formatCurrency(item.price) : "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{item.status}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{item.source}</td>
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
