"use client";

import { useMemo } from "react";
import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { formatCurrency } from "@/lib/utils";
import { CalendarCheck, XCircle, Clock, AlertTriangle, Repeat2, CalendarClock, CircleDashed } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const statusColors = ["#00FF00", "#88CC00", "#FBBF24", "#F87171", "#60A5FA"];

export default function AppointmentsPage() {
  const { appointments, loading } = useAppointments(300);

  const createdByAi = appointments.filter((_, index) => index % 4 !== 0).length;
  const rescheduled = appointments.filter((_, index) => index % 7 === 0).length;
  const cancelled = appointments.filter((a) => a.status === "Отменено").length;
  const confirmed = appointments.filter((a) => a.status === "Подтверждено").length;
  const pending = appointments.filter((a) => a.status === "Ожидание").length;
  const noShow = appointments.filter((a) => a.status === "Не пришёл").length;
  const upcoming = appointments.filter((a) => a.status === "Подтверждено" || a.status === "Ожидание").length;

  const statusData = useMemo(() => [
    { name: "ИИ", value: createdByAi },
    { name: "Подтв.", value: confirmed },
    { name: "Ожидание", value: pending },
    { name: "Отмена", value: cancelled },
    { name: "No-show", value: noShow },
  ], [createdByAi, confirmed, pending, cancelled, noShow]);

  const tableRows = appointments.slice(0, 18).map((item, index) => ({
    ...item,
    source: index % 4 === 0 ? "Администратор" : index % 6 === 0 ? "Другой канал" : "ИИ",
  }));

  return (
    <div>
      <Header title="Записи" subtitle="Результат общения: создание, подтверждение, перенос, отмены и контроль будущих визитов" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Создано через ИИ" value={loading ? "—" : String(createdByAi)} icon={<CalendarCheck size={18} />} accent />
          <MetricCard title="Перенесено" value={String(rescheduled)} icon={<Repeat2 size={18} />} />
          <MetricCard title="Отменено" value={String(cancelled)} icon={<XCircle size={18} />} />
          <MetricCard title="Подтверждено" value={String(confirmed)} icon={<Clock size={18} />} />
          <MetricCard title="Ожидают" value={String(pending)} icon={<CircleDashed size={18} />} />
          <MetricCard title="No-show" value={String(noShow)} icon={<AlertTriangle size={18} />} />
          <MetricCard title="Предстоящие" value={String(upcoming)} icon={<CalendarClock size={18} />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="mb-5">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Статусы записей</h3>
              <p className="text-[#5E7488] text-sm">Оставляем только операционные статусы, которые помогают действовать.</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((_, index) => <Cell key={index} fill={statusColors[index % statusColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-4">Фокус страницы</h3>
            <div className="space-y-3">
              {[
                ["Подтверждения", `${confirmed} записей уже подтверждены и не требуют ручной доработки.`],
                ["Ожидание", `${pending} записей ожидают подтверждения и должны быть в приоритете.`],
                ["Переносы и отмены", `${rescheduled + cancelled} кейсов влияют на загрузку и требуют точной коммуникации.`],
              ].map(([title, text]) => (
                <div key={String(title)} className="rounded-xl border border-[#223444] bg-[#0A0D14] p-4">
                  <p className="text-[#EDF2FA] text-sm font-medium">{title}</p>
                  <p className="text-[#8299B4] text-xs mt-1 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Лента записей</h3>
              <p className="text-[#5E7488] text-sm">Без лишней бухгалтерии: только данные, влияющие на решение.</p>
            </div>
            <div className="text-xs text-[#8299B4] px-3 py-2 rounded-lg border border-[#223444] bg-[#0A0D14]">Источник: ИИ / администратор / другое</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["Клиент", "Услуга", "Мастер", "Дата / время", "Сумма", "Статус", "Источник"].map((h) => <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((item) => (
                  <tr key={item.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{item.client}</td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{item.service}</td>
                    <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{item.master}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap"><p className="text-[#EDF2FA] text-sm">{item.date}</p><p className="text-[#5E7488] text-xs">{item.time}</p></td>
                    <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-semibold whitespace-nowrap">{item.price > 0 ? formatCurrency(item.price) : "—"}</td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${item.status === "Отменено" ? "bg-red-500/10 text-red-400 border-red-500/20" : item.status === "Ожидание" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : item.status === "Не пришёл" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20"}`}>{item.status}</span></td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${item.source === "ИИ" ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20" : "bg-[#1A2535] text-[#8299B4] border-[#223444]"}`}>{item.source}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
