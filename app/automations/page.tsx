"use client";

import Header from "@/components/layout/Header";
import { Power, ArrowRight, AlertTriangle } from "lucide-react";

const scenarios = [
  { name: "Напоминания о записи", enabled: true, lastRun: "Сегодня, 09:30", sent: 148, delivered: 142, replied: 18, booked: 0, revenue: null, errors: 2 },
  { name: "Благодарность после визита", enabled: true, lastRun: "Сегодня, 21:00", sent: 96, delivered: 93, replied: 34, booked: 0, revenue: null, errors: 1 },
  { name: "Запрос отзыва", enabled: true, lastRun: "Вчера, 18:20", sent: 88, delivered: 84, replied: 19, booked: 0, revenue: null, errors: 2 },
  { name: "Чаевые", enabled: false, lastRun: "3 дня назад", sent: 34, delivered: 29, replied: 6, booked: 0, revenue: null, errors: 5 },
  { name: "Повторная запись через 28 дней", enabled: true, lastRun: "Сегодня, 11:10", sent: 64, delivered: 61, replied: 21, booked: 17, revenue: "₽48 300", errors: 3 },
  { name: "Возврат клиента через 50 дней", enabled: true, lastRun: "Сегодня, 12:40", sent: 41, delivered: 38, replied: 11, booked: 9, revenue: "₽27 900", errors: 4 },
  { name: "Разовые рассылки / акции", enabled: false, lastRun: "7 дней назад", sent: 310, delivered: 287, replied: 23, booked: 12, revenue: "₽39 600", errors: 8 },
];

export default function AutomationsPage() {
  return (
    <div>
      <Header title="Автоматизации" subtitle="Отдельный экран сценариев: включение, результат, ошибки и быстрый вход в настройки" />
      <div className="p-6 space-y-4">
        {scenarios.map((scenario) => (
          <section key={scenario.name} className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[#EDF2FA] font-semibold font-unbounded">{scenario.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-md border ${scenario.enabled ? "text-[#00FF00] border-[#00FF00]/30 bg-[#00FF00]/10" : "text-[#5E7488] border-[#223444] bg-[#0A0D14]"}`}>
                    {scenario.enabled ? "Включен" : "Выключен"}
                  </span>
                </div>
                <p className="text-[#5E7488] text-sm mt-1">Последнее выполнение: {scenario.lastRun}</p>
              </div>

              <div className="flex items-center gap-2">
                <button className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${scenario.enabled ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20" : "bg-[#0A0D14] text-[#EDF2FA] border border-[#223444]"}`}>
                  <Power size={15} />
                  {scenario.enabled ? "Выключить" : "Включить"}
                </button>
                <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#0A0D14] text-[#EDF2FA] border border-[#223444]">
                  Настроить
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-7 gap-3 mt-5">
              {[
                ["Отправлено", scenario.sent],
                ["Доставлено", scenario.delivered],
                ["Ответили", scenario.replied],
                ["Записались", scenario.booked],
                ["Выручка", scenario.revenue ?? "—"],
                ["Ошибки", scenario.errors],
                ["Контроль", scenario.errors > 3 ? "Проверить" : "ОК"],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3">
                  <p className="text-[#5E7488] text-xs">{label}</p>
                  <p className="text-[#EDF2FA] text-sm font-semibold mt-1">{value}</p>
                </div>
              ))}
            </div>

            {scenario.errors > 3 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">
                <AlertTriangle size={15} />
                Есть ошибки доставки или интеграций — нужен ручной контроль.
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
