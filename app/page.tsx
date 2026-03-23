"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useAppointments } from "@/lib/hooks/useAppointments";
import { useClients } from "@/lib/hooks/useClients";
import { useRealtimePlatform } from "@/lib/hooks/useRealtimePlatform";
import { formatCurrency } from "@/lib/utils";
import {
  MessageSquare,
  Bot,
  Clock3,
  CalendarCheck2,
  ShieldAlert,
  RefreshCcw,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
      <div className="mb-4">
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded">{title}</h3>
        {subtitle && <p className="text-[#5E7488] text-sm mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

const automationResults = [
  { name: "Напоминания", sent: 148, booked: 0, errors: 2 },
  { name: "Спасибо + отзыв", sent: 96, booked: 11, errors: 1 },
  { name: "Повтор через 28 дней", sent: 64, booked: 17, errors: 3 },
  { name: "Возврат через 50 дней", sent: 41, booked: 9, errors: 4 },
];

export default function DashboardPage() {
  const { appointments, loading } = useAppointments(300);
  const { clients } = useClients();
  const { appointmentsByDay, activity } = useRealtimePlatform();

  const totalInquiries = appointments.length + Math.round(clients.length * 0.35);
  const aiResolved = Math.round(totalInquiries * 0.78);
  const aiRate = totalInquiries > 0 ? Math.round((aiResolved / totalInquiries) * 100) : 0;
  const firstResponse = "1 мин 42 сек";
  const aiCreatedAppointments = appointments.filter((item, index) => index % 4 !== 0).length;
  const confirmed = appointments.filter((item) => item.status === "Подтверждено").length;
  const saved = appointments.filter((item) => item.status === "Подтверждено" || item.status === "Завершено").length;
  const noShows = appointments.filter((item) => item.status === "Не пришёл").length;
  const attentionCount = appointments.filter((item) => item.status === "Ожидание" || item.status === "Отменено").length + 5;
  const automationReturned = clients.filter((client) => client.daysAbsent >= 28 && client.daysAbsent <= 75).length;
  const estimatedRevenue = appointments
    .filter((item, index) => index % 4 !== 0)
    .reduce((sum, item) => sum + item.price, 0);

  const inquirySeries = appointmentsByDay.map((item, index) => ({
    day: item.day,
    inquiries: item.appointments + 4 + (index % 3),
  }));

  const attentionItems = [
    `Нужно подтвердить ${appointments.filter((item) => item.status === "Ожидание").length} записей вручную.`,
    `Обнаружено ${noShows} неявок — проверьте сценарий напоминаний.`,
    `Есть ${attentionCount} диалогов и системных событий, где нужен человек.`,
  ];

  return (
    <div>
      <Header title="Главная" subtitle="Обзор работы ИИ-агента: обращения, записи, возврат и сбои" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Обращений за период" value={loading ? "—" : String(totalInquiries)} icon={<MessageSquare size={18} />} accent />
          <MetricCard title="Обработано ИИ" value={loading ? "—" : `${aiRate}%`} icon={<Bot size={18} />} />
          <MetricCard title="Первый ответ" value={firstResponse} icon={<Clock3 size={18} />} />
          <MetricCard title="Записей через ИИ" value={loading ? "—" : String(aiCreatedAppointments)} icon={<CalendarCheck2 size={18} />} />
          <MetricCard title="Подтверждено / спасено" value={loading ? "—" : `${confirmed} / ${saved}`} icon={<CheckCircle2 size={18} />} />
          <MetricCard title="Возвращено автоматизациями" value={String(automationReturned)} icon={<RefreshCcw size={18} />} />
          <MetricCard title="Требует внимания" value={String(attentionCount)} icon={<ShieldAlert size={18} />} />
          <MetricCard title="Оценочная выручка ИИ" value={formatCurrency(estimatedRevenue)} icon={<TrendingUp size={18} />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title="Обращения по дням" subtitle="Чтобы быстро видеть нагрузку на ИИ и администраторов.">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={inquirySeries}>
                <CartesianGrid stroke="#1A2535" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="inquiries" stroke="#00FF00" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Записи через ИИ по дням" subtitle="Только результат работы агента, без лишней BI-аналитики.">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={appointmentsByDay}>
                <CartesianGrid stroke="#1A2535" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="appointments" fill="#00FF00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel title="Требует внимания" subtitle="Показываем только то, где нужно действие человека.">
            <div className="space-y-3">
              {attentionItems.map((item) => (
                <div key={item} className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3 text-sm text-[#EDF2FA]">
                  {item}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Последние действия системы" subtitle="Короткая операционная лента без финансового шума.">
            <div className="space-y-3">
              {activity.slice(0, 5).map((item) => (
                <div key={item.id} className="border-b border-[#1A2535] pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-[#EDF2FA]">{item.text}</p>
                  <p className="text-xs text-[#5E7488] mt-1">{item.time}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Результаты автоматизаций" subtitle="Сводка по сценариям за период.">
            <div className="space-y-3">
              {automationResults.map((item) => (
                <div key={item.name} className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[#EDF2FA]">{item.name}</p>
                    <span className="text-xs text-[#5E7488]">Ошибки: {item.errors}</span>
                  </div>
                  <p className="text-xs text-[#5E7488] mt-1">
                    Отправлено {item.sent} · записались {item.booked}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
