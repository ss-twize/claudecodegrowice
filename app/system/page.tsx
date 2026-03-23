"use client";

import Header from "@/components/layout/Header";
import { CheckCircle2, CreditCard, Plug, ShieldCheck } from "lucide-react";

const plans = [
  { name: "Start", price: "₽9 900", note: "До 500 диалогов / мес" },
  { name: "Growth", price: "₽19 900", note: "Основной тариф MVP" },
  { name: "Network", price: "₽34 900", note: "Для сети салонов и филиалов" },
];

const integrations = [
  ["Telegram", "Подключён", "Синхронизация 5 мин назад"],
  ["WhatsApp", "Подключён", "Синхронизация 11 мин назад"],
  ["MAX", "Ожидает подключения", "Нужно завершить авторизацию"],
  ["YCLIENTS", "Подключён", "Ошибок за 24 часа: 0"],
];

export default function SystemPage() {
  return (
    <div>
      <Header title="Оплата и тариф" subtitle="Второй уровень MVP: тариф, платежи и статус ключевых подключений" />
      <div className="p-6 space-y-6">
        <section className="bg-[#00FF00] rounded-xl p-5 text-black">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} />
            <h3 className="font-semibold font-unbounded">Текущий тариф: Growth</h3>
          </div>
          <p className="text-sm text-black/70">Активен до 30 апреля 2026 · следующее списание — автоматически.</p>
        </section>

        <section>
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-4">Линейка тарифов</h3>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {plans.map((plan, index) => (
              <article key={plan.name} className={`rounded-xl border p-5 ${index === 1 ? "bg-[#00FF00]/5 border-[#00FF00]/30" : "bg-[#0F1622] border-[#223444]"}`}>
                <h4 className="text-[#EDF2FA] font-semibold text-lg">{plan.name}</h4>
                <p className="text-[#00FF00] font-bold text-2xl mt-2">{plan.price}</p>
                <p className="text-[#5E7488] text-sm mt-2">{plan.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <article className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Plug size={16} className="text-[#00FF00]" />
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Ключевые интеграции</h3>
            </div>
            <div className="space-y-3">
              {integrations.map(([name, status, note]) => (
                <div key={name} className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[#EDF2FA] font-medium">{name}</p>
                    <span className="text-xs text-[#5E7488]">{status}</span>
                  </div>
                  <p className="text-xs text-[#5E7488] mt-1">{note}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-[#00FF00]" />
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Платёжный контроль</h3>
            </div>
            <ul className="space-y-3 text-sm text-[#8299B4]">
              <li className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3">История оплат и акты — во втором уровне, не в основном меню.</li>
              <li className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3">Расширенные биллинговые детали скрыты, чтобы не смешивать кабинет агента с финансовой системой салона.</li>
              <li className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-3 flex items-center gap-2"><CheckCircle2 size={15} className="text-[#00FF00]" />Основные платежные действия доступны без перегруза.</li>
            </ul>
          </article>
        </section>
      </div>
    </div>
  );
}
