"use client";

import { useMemo } from "react";
import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { useAppointments } from "@/lib/hooks/useAppointments";
import {
  MessageSquare, Clock3, Bot, UserRound, CalendarPlus2, MoonStar, AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";

const channelPalette = ["#00FF00", "#60A5FA", "#FBBF24", "#F472B6"];
const channels = ["Telegram", "WhatsApp", "MAX", "SMS"];
const intents = ["Запись", "Перенос", "Отмена", "Стоимость", "График работы"];

export default function ConversationsPage() {
  const { appointments, loading } = useAppointments(180);

  const rows = useMemo(() => appointments.slice(0, 14).map((item, index) => {
    const status = item.status === "Ожидание" ? (index % 3 === 0 ? "В работе" : "Новый") : item.status === "Отменено" ? "Передан человеку" : item.status === "Не пришёл" ? "Ошибка" : "Завершён";
    const handledBy = status === "Передан человеку" || index % 5 === 0 ? "Человек" : "ИИ";
    const outcome = item.status === "Подтверждено" ? "Записан" : item.status === "Отменено" ? "Передан" : item.status === "Не пришёл" ? "Потерян" : "Не записан";
    return {
      id: item.id,
      client: item.client,
      channel: channels[index % channels.length],
      intent: intents[index % intents.length],
      status,
      handledBy,
      firstResponse: index % 4 === 0 ? "2 мин 18 сек" : "1 мин 09 сек",
      outcome,
    };
  }), [appointments]);

  const total = rows.length;
  const aiSolved = rows.filter((row) => row.handledBy === "ИИ").length;
  const passedToHuman = rows.filter((row) => row.status === "Передан человеку").length;
  const booked = rows.filter((row) => row.outcome === "Записан").length;
  const offHours = Math.max(2, Math.round(total * 0.24));

  const channelData = channels.map((channel) => ({ channel, value: rows.filter((row) => row.channel === channel).length }));
  const outcomeData = [
    { name: "Записан", value: rows.filter((row) => row.outcome === "Записан").length },
    { name: "Передан", value: rows.filter((row) => row.outcome === "Передан").length },
    { name: "Не записан", value: rows.filter((row) => row.outcome === "Не записан").length },
    { name: "Потерян", value: rows.filter((row) => row.outcome === "Потерян").length },
  ];

  return (
    <div>
      <Header title="Обращения" subtitle="Рабочий экран диалогов: каналы, скорость ответа, участие ИИ и финальный результат" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Всего обращений" value={loading ? "—" : String(total)} icon={<MessageSquare size={18} />} accent />
          <MetricCard title="Средний ответ" value="1 мин 42 сек" icon={<Clock3 size={18} />} />
          <MetricCard title="Решено ИИ" value={`${Math.round((aiSolved / Math.max(total, 1)) * 100)}%`} icon={<Bot size={18} />} />
          <MetricCard title="Передано человеку" value={`${Math.round((passedToHuman / Math.max(total, 1)) * 100)}%`} icon={<UserRound size={18} />} />
          <MetricCard title="Завершилось записью" value={`${Math.round((booked / Math.max(total, 1)) * 100)}%`} icon={<CalendarPlus2 size={18} />} />
          <MetricCard title="Вне рабочего времени" value={String(offHours)} icon={<MoonStar size={18} />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="mb-5">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Распределение обращений по каналам</h3>
              <p className="text-[#5E7488] text-sm">Показываем, откуда приходит поток и где важнее держать контроль.</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={channelData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                <XAxis dataKey="channel" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {channelData.map((_, index) => <Cell key={index} fill={channelPalette[index % channelPalette.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col">
            <div className="mb-4">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Итоги диалогов</h3>
              <p className="text-[#5E7488] text-sm">Чтобы быстро видеть, где ИИ приносит результат, а где теряет клиента.</p>
            </div>
            <div className="flex-1 min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={4}>
                    {outcomeData.map((_, index) => <Cell key={index} fill={channelPalette[index % channelPalette.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-3">
              {outcomeData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: channelPalette[index % channelPalette.length] }} /><span className="text-[#8299B4]">{item.name}</span></div>
                  <span className="text-[#EDF2FA] font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#223444] flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Поток обращений</h3>
                <p className="text-[#5E7488] text-sm">Список диалогов с понятным финальным исходом.</p>
              </div>
              <div className="text-xs text-[#8299B4] px-3 py-2 rounded-lg border border-[#223444] bg-[#0A0D14]">Новый / В работе / Завершён / Передан человеку / Ошибка</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    {["Статус", "Канал", "Клиент", "Интент", "Первый ответ", "Кто обработал", "Итог"].map((h) => <th key={h} className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                      <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${row.status === "Ошибка" ? "bg-red-500/10 text-red-400 border-red-500/20" : row.status === "Передан человеку" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : row.status === "Новый" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20"}`}>{row.status}</span></td>
                      <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{row.channel}</td>
                      <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{row.client}</td>
                      <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{row.intent}</td>
                      <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{row.firstResponse}</td>
                      <td className="px-5 py-3.5 text-sm whitespace-nowrap"><span className={`text-xs px-2 py-1 rounded-md border ${row.handledBy === "ИИ" ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20" : "bg-[#1A2535] text-[#EDF2FA] border-[#223444]"}`}>{row.handledBy}</span></td>
                      <td className="px-5 py-3.5 text-[#EDF2FA] text-sm whitespace-nowrap">{row.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-4">Нужен контроль человека</h3>
            <div className="space-y-3">
              {[
                "5 обращений были переданы администратору из-за переноса или отмены.",
                "2 канала отвечали дольше 3 минут — проверьте правила эскалации.",
                "Есть обращения из MAX и SMS, где нужно проверить подключение и шаблоны.",
              ].map((item) => (
                <div key={item} className="rounded-xl border border-[#223444] bg-[#0A0D14] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0"><AlertTriangle size={15} className="text-yellow-400" /></div>
                    <p className="text-[#8299B4] text-sm leading-relaxed">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
