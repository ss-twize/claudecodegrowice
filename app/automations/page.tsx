"use client";

import Header from "@/components/layout/Header";
import { useSystemStates } from "@/lib/hooks/useSystemStates";
import { Bot, Power, Settings2, AlertTriangle, MessageSquare } from "lucide-react";

const scenarioMetrics = [
  { code: "reminders", name: "Напоминания о записи", lastRun: "Сегодня, 09:30", sent: 148, delivered: 142, replied: 18, booked: 0, revenue: null, errors: 2 },
  { code: "thanks", name: "Благодарность после визита", lastRun: "Сегодня, 20:10", sent: 96, delivered: 93, replied: 34, booked: 0, revenue: null, errors: 1 },
  { code: "review", name: "Запрос отзыва", lastRun: "Вчера, 18:20", sent: 88, delivered: 84, replied: 19, booked: 0, revenue: null, errors: 2 },
  { code: "tips", name: "Чаевые", lastRun: "3 дня назад", sent: 34, delivered: 29, replied: 6, booked: 0, revenue: null, errors: 5 },
  { code: "repeat_28", name: "Повторная запись через 28 дней", lastRun: "Сегодня, 11:10", sent: 64, delivered: 61, replied: 21, booked: 17, revenue: "₽48 300", errors: 3 },
  { code: "return_50", name: "Возврат клиента через 50 дней", lastRun: "Сегодня, 12:40", sent: 41, delivered: 38, replied: 11, booked: 9, revenue: "₽27 900", errors: 4 },
  { code: "promo", name: "Акционные рассылки", lastRun: "7 дней назад", sent: 310, delivered: 287, replied: 23, booked: 12, revenue: "₽39 600", errors: 8 },
];

export default function AutomationsPage() {
  const { systems } = useSystemStates();

  return (
    <div>
      <Header title="Автоматизации" subtitle="Сценарии сопровождения и возврата клиентов: запуск, результат и контроль ошибок" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-4"><p className="text-[#5E7488] text-sm">Активных сценариев</p><p className="text-[#EDF2FA] text-2xl font-bold mt-2">{systems.filter((s) => s.enabled && s.system_code !== "main_agent").length || 4}</p></div>
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-4"><p className="text-[#5E7488] text-sm">Отправлено</p><p className="text-[#EDF2FA] text-2xl font-bold mt-2">781</p></div>
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-4"><p className="text-[#5E7488] text-sm">Записались</p><p className="text-[#EDF2FA] text-2xl font-bold mt-2">38</p></div>
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-4"><p className="text-[#5E7488] text-sm">Нужно проверить</p><p className="text-yellow-400 text-2xl font-bold mt-2">3 сценария</p></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {scenarioMetrics.map((scenario, index) => (
            <section key={scenario.code} className={`bg-[#0F1622] border rounded-xl p-5 overflow-hidden ${scenario.errors > 3 ? "border-yellow-500/20" : index % 3 === 0 ? "border-[#00FF00]/20" : "border-[#223444]"}`}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${scenario.errors > 3 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-[#00FF00]/10 border-[#00FF00]/20"}`}>
                    {scenario.code === "promo" ? <MessageSquare size={18} className={scenario.errors > 3 ? "text-yellow-400" : "text-[#00FF00]"} /> : <Bot size={18} className={scenario.errors > 3 ? "text-yellow-400" : "text-[#00FF00]"} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[#EDF2FA] font-semibold font-unbounded text-sm">{scenario.name}</h3>
                      <span className={`text-xs font-medium px-2 py-1 rounded-md border ${scenario.errors > 5 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20"}`}>{scenario.errors > 5 ? "Риск" : "Активно"}</span>
                    </div>
                    <p className="text-[#5E7488] text-xs mt-1">Последний запуск: {scenario.lastRun}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${scenario.errors > 5 ? "border-yellow-500/20 text-yellow-400 bg-yellow-500/10" : "border-[#00FF00]/20 text-[#00FF00] bg-[#00FF00]/10"}`}><Power size={13} />Вкл.</button>
                  <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[#223444] text-[#8299B4] hover:text-[#EDF2FA]"><Settings2 size={13} />Настроить</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Отправлено", scenario.sent],
                  ["Доставлено", scenario.delivered],
                  ["Ответили", scenario.replied],
                  ["Записались", scenario.booked],
                  ["Выручка", scenario.revenue ?? "—"],
                  ["Ошибки", scenario.errors],
                  ["Статус", scenario.errors > 3 ? "Нужен контроль" : "ОК"],
                  ["Канал", scenario.code === "promo" ? "Telegram / WA" : "Telegram / WA / SMS"],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3">
                    <p className="text-[#5E7488] text-[11px]">{label}</p>
                    <p className="text-[#EDF2FA] text-sm font-semibold mt-1">{value}</p>
                  </div>
                ))}
              </div>

              {scenario.errors > 3 && (
                <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 flex items-start gap-3">
                  <AlertTriangle size={16} className="text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 text-sm font-medium">Есть ошибки и нужен ручной контроль</p>
                    <p className="text-[#C9D4E3] text-xs mt-1">Проверьте подключение канала, доставку и правила сегментации перед следующим запуском.</p>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
