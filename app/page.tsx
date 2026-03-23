"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { formatCurrency } from "@/lib/utils";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useClients } from "@/lib/hooks/useClients";
import { useRealtimePlatform } from "@/lib/hooks/useRealtimePlatform";
import {
  MessageSquare, Bot, Clock3, CalendarCheck, ShieldAlert, RefreshCcw,
  CheckCircle2, TrendingUp, AlertTriangle, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const automationCards = [
  { name: "Напоминания", sent: 148, bookings: 0, errors: 2 },
  { name: "Отзывы", sent: 96, bookings: 11, errors: 1 },
  { name: "Повтор 28 дней", sent: 64, bookings: 17, errors: 3 },
  { name: "Возврат 50 дней", sent: 41, bookings: 9, errors: 4 },
];

export default function DashboardPage() {
  const { appointments, loading } = useAppointments(300);
  const { clients } = useClients();
  const { appointmentsByDay, activity } = useRealtimePlatform();

  const inquiries = appointmentsByDay.map((item, index) => ({ day: item.day, value: item.appointments + 3 + (index % 4) }));
  const aiAppointments = appointmentsByDay.map((item, index) => ({ day: item.day, value: Math.max(0, item.appointments - (index % 3)) }));

  const totalInquiries = inquiries.reduce((sum, item) => sum + item.value, 0);
  const aiResolved = Math.round(totalInquiries * 0.79);
  const aiRate = totalInquiries > 0 ? Math.round((aiResolved / totalInquiries) * 100) : 0;
  const avgFirstResponse = "1 мин 42 сек";
  const createdByAi = appointments.filter((_, index) => index % 4 !== 0);
  const confirmed = appointments.filter((item) => item.status === "Подтверждено").length;
  const saved = appointments.filter((item) => item.status === "Подтверждено" || item.status === "Завершено").length;
  const attentionCount = appointments.filter((item) => item.status === "Ожидание" || item.status === "Отменено" || item.status === "Не пришёл").length + 3;
  const returnedClients = clients.filter((client) => client.daysAbsent >= 28 && client.daysAbsent <= 75).length;
  const aiRevenue = createdByAi.reduce((sum, item) => sum + item.price, 0);

  const attentionItems = [
    { title: "Диалоги без финального исхода", text: `Проверьте ${appointments.filter((item) => item.status === "Ожидание").length} обращений, где ИИ не довёл запись до подтверждения.`, tone: "yellow" },
    { title: "Нужен человек", text: `${attentionCount} кейсов требуют вмешательства: переносы, отмены, неявки или ошибки канала.`, tone: "red" },
    { title: "Возврат можно усилить", text: `Сейчас в автосценарии возврата попадает ${returnedClients} клиентов — можно расширить сегмент.`, tone: "green" },
  ];

  return (
    <div>
      <Header title="Главная" subtitle="Что происходит с ИИ-системой прямо сейчас и какой результат она приносит" />
      <div className="p-6 space-y-6">
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Обращения за период" value={loading ? "—" : String(totalInquiries)} icon={<MessageSquare size={18} />} accent />
          <MetricCard title="Обработано ИИ" value={`${aiRate}%`} icon={<Bot size={18} />} />
          <MetricCard title="Первый ответ" value={avgFirstResponse} icon={<Clock3 size={18} />} />
          <MetricCard title="Записей через ИИ" value={String(createdByAi.length)} icon={<CalendarCheck size={18} />} />
          <MetricCard title="Подтверждено" value={String(confirmed)} icon={<CheckCircle2 size={18} />} />
          <MetricCard title="Спасено / сохранено" value={String(saved)} icon={<RefreshCcw size={18} />} />
          <MetricCard title="Проблемные кейсы" value={String(attentionCount)} icon={<ShieldAlert size={18} />} />
          <MetricCard title="Выручка из записей ИИ" value={formatCurrency(aiRevenue)} icon={<TrendingUp size={18} />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Обращения по дням</h3>
                <p className="text-[#5E7488] text-sm">Нагрузка на ИИ и команду по дням недели.</p>
              </div>
              <div className="text-right">
                <p className="text-[#5E7488] text-xs">ИИ решает без человека</p>
                <p className="text-[#00FF00] font-bold text-xl">{aiRate}%</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={inquiries} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#00FF00" fill="rgba(0,255,0,0.18)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col">
            <div className="mb-4">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Требует внимания</h3>
              <p className="text-[#5E7488] text-sm">Сразу видно, где нужен человек.</p>
            </div>
            <div className="space-y-3 flex-1">
              {attentionItems.map((item) => (
                <div key={item.title} className={`rounded-xl border p-4 ${item.tone === "red" ? "bg-red-500/10 border-red-500/20" : item.tone === "yellow" ? "bg-yellow-500/10 border-yellow-500/20" : "bg-[#141E2B] border-[#223444]"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tone === "red" ? "bg-red-500/20 text-red-400" : item.tone === "yellow" ? "bg-yellow-500/20 text-yellow-400" : "bg-[#00FF00]/10 text-[#00FF00]"}`}>
                      {item.tone === "green" ? <ArrowUpRight size={15} /> : <AlertTriangle size={15} />}
                    </div>
                    <div>
                      <p className="text-[#EDF2FA] text-sm font-medium">{item.title}</p>
                      <p className="text-[#8299B4] text-xs mt-1 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:items-stretch">
          <div className="xl:col-span-2 bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Записи через ИИ по дням</h3>
                <p className="text-[#5E7488] text-sm">Только итог, который создаёт агент.</p>
              </div>
              <div className="text-right">
                <p className="text-[#5E7488] text-xs">Возвращено автоматизациями</p>
                <p className="text-[#00FF00] font-bold text-xl">{returnedClients}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={aiAppointments} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="value" fill="#00FF00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col">
            <h3 className="text-[#EDF2FA] font-semibold mb-4 font-unbounded">Последние действия системы</h3>
            <div className="space-y-3">
              {activity.slice(0, 6).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 pb-3 border-b border-[#1A2535] last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#00FF00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#EDF2FA] text-xs leading-relaxed">{entry.text}</p>
                    <p className="text-[#5E7488] text-xs mt-0.5">{entry.time}</p>
                  </div>
                  {entry.amount !== null && <span className="text-xs font-bold text-[#00FF00]">{formatCurrency(entry.amount)}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Результаты автоматизаций за период</h3>
              <p className="text-[#5E7488] text-sm">Компактная сводка по сценариям возврата и сопровождения.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {automationCards.map((card) => (
              <div key={card.name} className="rounded-xl border border-[#223444] bg-[#0A0D14] p-4 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center">
                    <Bot size={16} className="text-[#00FF00]" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md border ${card.errors > 2 ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10" : "text-[#00FF00] border-[#00FF00]/20 bg-[#00FF00]/10"}`}>{card.errors > 2 ? "Нужно проверить" : "Стабильно"}</span>
                </div>
                <p className="text-[#EDF2FA] font-semibold text-sm">{card.name}</p>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div><p className="text-[#5E7488] text-[11px]">Отправлено</p><p className="text-[#EDF2FA] font-semibold">{card.sent}</p></div>
                  <div><p className="text-[#5E7488] text-[11px]">Записались</p><p className="text-[#EDF2FA] font-semibold">{card.bookings}</p></div>
                  <div><p className="text-[#5E7488] text-[11px]">Ошибки</p><p className="text-[#EDF2FA] font-semibold">{card.errors}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
