"use client";

import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useAppointments } from "@/lib/hooks/useAppointments";
import {
  MessageSquare,
  Clock3,
  Bot,
  UserRound,
  CalendarPlus2,
  MoonStar,
} from "lucide-react";

const CHANNELS = ["Telegram", "WhatsApp", "MAX", "SMS"] as const;
const INTENTS = ["Запись", "Вопрос по услугам", "Перенос", "Отмена", "Стоимость"] as const;
export default function ConversationsPage() {
  const { appointments, loading } = useAppointments(120);

  const rows = appointments.slice(0, 12).map((item, index) => {
    const status = item.status === "Ожидание" ? "Новый" : item.status === "Отменено" ? "Передан человеку" : item.status === "Не пришёл" ? "Ошибка" : "Завершён";
    const handledBy = index % 5 === 0 ? "Человек" : "ИИ";
    const result = item.status === "Подтверждено" ? "Записал" : item.status === "Отменено" ? "Переведён админу" : item.status === "Не пришёл" ? "Потерян" : "Ответил";

    return {
      id: item.id,
      client: item.client,
      channel: CHANNELS[index % CHANNELS.length],
      topic: INTENTS[index % INTENTS.length],
      status,
      handledBy,
      firstResponse: index % 4 === 0 ? "3 мин 10 сек" : "1 мин 12 сек",
      result,
    };
  });

  const total = rows.length;
  const aiSolved = rows.filter((row) => row.handledBy === "ИИ").length;
  const handedToHuman = rows.filter((row) => row.status === "Передан человеку").length;
  const booked = rows.filter((row) => row.result === "Записал").length;
  const offHours = Math.max(2, Math.round(total * 0.22));

  return (
    <div>
      <Header title="Обращения" subtitle="Операционный экран диалогов: что пришло, кто обработал и чем закончилось" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          <MetricCard title="Всего обращений" value={loading ? "—" : String(total)} icon={<MessageSquare size={18} />} accent />
          <MetricCard title="Средний ответ" value="1 мин 42 сек" icon={<Clock3 size={18} />} />
          <MetricCard title="Решено ИИ" value={loading ? "—" : `${Math.round((aiSolved / Math.max(total, 1)) * 100)}%`} icon={<Bot size={18} />} />
          <MetricCard title="Передано человеку" value={loading ? "—" : `${Math.round((handedToHuman / Math.max(total, 1)) * 100)}%`} icon={<UserRound size={18} />} />
          <MetricCard title="Завершилось записью" value={loading ? "—" : `${Math.round((booked / Math.max(total, 1)) * 100)}%`} icon={<CalendarPlus2 size={18} />} />
          <MetricCard title="Вне рабочего времени" value={String(offHours)} icon={<MoonStar size={18} />} />
        </div>

        <section className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444]">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Список обращений</h3>
            <p className="text-[#5E7488] text-sm">Без лишней аналитики: только то, что помогает обработать поток.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1A2535]">
                  {["Статус", "Канал", "Клиент", "Тема / интент", "Кто обработал", "Первый ответ", "Результат"].map((header) => (
                    <th key={header} className="px-5 py-3 text-left text-[#5E7488] text-xs font-medium whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{row.status}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{row.channel}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{row.client}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{row.topic}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{row.handledBy}</td>
                    <td className="px-5 py-3.5 text-sm text-[#8299B4] whitespace-nowrap">{row.firstResponse}</td>
                    <td className="px-5 py-3.5 text-sm text-[#EDF2FA] whitespace-nowrap">{row.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-2">Legacy / secondary</h3>
          <p className="text-sm text-[#5E7488]">
            Глубокая аналитика длины диалога, вторичные коммуникационные коэффициенты и прочие BI-метрики убраны с первого уровня интерфейса.
          </p>
        </section>
      </div>
    </div>
  );
}
