"use client";

import Header from "@/components/layout/Header";
import { CheckCircle2, AlertTriangle, Plug, Bot, Bell, Shield, Building2, MessageSquare } from "lucide-react";

const sections = [
  {
    id: "profile",
    title: "Профиль",
    items: ["Контакт владельца", "Часовой пояс", "Язык интерфейса"],
  },
  {
    id: "business",
    title: "Бизнес и филиалы",
    items: ["Название салона", "Филиалы", "Часы работы", "Контактные номера"],
  },
  {
    id: "channels",
    title: "Каналы связи",
    items: ["Telegram — подключён, синхронизация 5 мин назад", "WhatsApp — подключён, синхронизация 11 мин назад", "MAX — ожидает подключения", "SMS — ошибка авторизации"],
    icon: MessageSquare,
  },
  {
    id: "integrations",
    title: "Интеграции",
    items: ["YCLIENTS / CRM", "Статус синхронизации", "Логи ошибок и повторные попытки"],
    icon: Plug,
  },
  {
    id: "rules",
    title: "Правила записи",
    items: ["Услуги", "Мастера", "Филиалы", "Правила отмены и переноса", "Ограничения на авто-запись"],
  },
  {
    id: "agent",
    title: "ИИ-агент",
    items: ["Тон общения", "FAQ / база знаний", "Какие задачи решает сам", "Когда передавать человеку", "Приветствие и шаблоны ответов"],
    icon: Bot,
  },
  {
    id: "automations",
    title: "Автоматизации",
    items: ["Задержка запуска", "Каналы отправки", "Шаблоны сообщений", "Сегменты клиентов", "Условия срабатывания"],
  },
  {
    id: "roles",
    title: "Роли и доступы",
    items: ["Владелец", "Администраторы", "Ограничения доступа по разделам"],
    icon: Shield,
  },
  {
    id: "notifications",
    title: "Уведомления",
    items: ["Ошибки интеграций", "Диалоги, где нужен человек", "Неотправленные сообщения", "Проблемы с каналами"],
    icon: Bell,
  },
  {
    id: "billing",
    title: "Оплата и тариф",
    items: ["Текущий тариф", "Следующее списание", "История оплат"],
  },
];

export default function SettingsPage() {
  return (
    <div>
      <Header title="Настройки" subtitle="Секционный формат MVP: подключение каналов, правила записи, ИИ и уведомления" />
      <div className="p-6 space-y-6 max-w-6xl">
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-[#00FF00]" />
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Что настроено</h3>
            </div>
            <p className="text-sm text-[#5E7488]">Подключены основные каналы, активен ИИ-агент, сценарии возврата работают.</p>
          </div>
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-yellow-400" />
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Требует настройки</h3>
            </div>
            <p className="text-sm text-[#5E7488]">MAX и SMS нужно довести до стабильного подключения, а правила передачи человеку — уточнить.</p>
          </div>
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={18} className="text-blue-400" />
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Принцип MVP</h3>
            </div>
            <p className="text-sm text-[#5E7488]">Убираем вторичные настройки салона и оставляем только то, что влияет на работу агента.</p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <article key={section.id} id={section.id} className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 scroll-mt-8">
                <div className="flex items-center gap-2 mb-3">
                  {Icon ? <Icon size={16} className="text-[#00FF00]" /> : <div className="w-2 h-2 rounded-full bg-[#00FF00]" />}
                  <h3 className="text-[#EDF2FA] font-semibold font-unbounded">{section.title}</h3>
                </div>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-lg border border-[#223444] bg-[#0A0D14] px-3 py-2.5 text-sm text-[#8299B4]">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
