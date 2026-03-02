"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { subscriptionData, pricingPlans, systemModules, channelDetails } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { callWebhook } from "@/lib/webhooks";
import { useAuth } from "@/lib/auth";
import { CheckCircle2, Shield, Zap, Crown, Star, RefreshCw, Settings2, ExternalLink, Clock, MessageSquare } from "lucide-react";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  text: <Zap size={18} />,
  "voice-start": <Star size={18} />,
  "voice-pro": <Shield size={18} />,
  "voice-max": <Crown size={18} />,
};

const PAYMENT_PERIODS = [
  { months: 1, label: "1 месяц", discount: 0 },
  { months: 3, label: "3 месяца", discount: 5 },
  { months: 6, label: "6 месяцев", discount: 10 },
  { months: 12, label: "12 месяцев", discount: 20 },
];

export default function SystemPage() {
  const { role } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState("voice-pro");
  const [paymentPeriod, setPaymentPeriod] = useState(1);
  const [modules, setModules] = useState(systemModules.map((m) => ({ ...m })));
  const [channels, setChannels] = useState(channelDetails.map((c) => ({ ...c })));
  const [checking, setChecking] = useState(false);
  const [expandedChannel, setExpandedChannel] = useState<string | null>("telegram");

  const plan = pricingPlans.find((p) => p.id === selectedPlan)!;
  const period = PAYMENT_PERIODS.find((p) => p.months === paymentPeriod)!;
  const monthlyPrice = Math.round(plan.price * (1 - period.discount / 100));
  const total = monthlyPrice * paymentPeriod;

  const toggleModule = async (id: string) => {
    const current = modules.find((m) => m.id === id);
    if (!current) return;
    const newEnabled = !current.enabled;
    setModules((prev) => prev.map((m) => m.id === id ? { ...m, enabled: newEnabled } : m));
    await callWebhook("modul_toggle", { module_id: id, enabled: newEnabled }, role);
  };

  const toggleChannel = async (id: string) => {
    const current = channels.find((c) => c.id === id);
    if (!current) return;
    const newEnabled = !current.enabled;
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, enabled: newEnabled } : c));
    await callWebhook("kanal_toggle", { channel_id: id, enabled: newEnabled }, role);
  };

  const updateChannel = (id: string, field: string, value: string) => {
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const saveChannelSettings = async (id: string) => {
    const ch = channels.find((c) => c.id === id);
    if (!ch) return;
    await callWebhook("kanal_nastroit", { channel_id: id, bot_name: ch.botName, webhook_url: ch.webhookUrl, work_from: ch.workFrom, work_to: ch.workTo }, role);
  };

  const handleCheck = () => {
    setChecking(true);
    setTimeout(() => setChecking(false), 2000);
  };

  const autoModules = modules.filter((m) => m.group === "auto");

  return (
    <div>
      <Header title="Система и оплата" subtitle="Управление подпиской и модулями" />
      <div className="p-6 space-y-6">

        {/* Current subscription */}
        <div className="bg-[#00FF00] rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-black/60 text-xs font-medium uppercase tracking-wider mb-1">Текущая подписка</p>
              <h3 className="text-black font-bold text-2xl font-unbounded mb-1">{subscriptionData.plan}</h3>
              <p className="text-black/70 text-sm">Статус из Supabase · обновляется автоматически</p>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <p className="text-black/60 text-xs mb-0.5">Статус</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                  <span className="text-black font-bold text-sm">{subscriptionData.status}</span>
                </div>
              </div>
              <div>
                <p className="text-black/60 text-xs mb-0.5">Оплачено до</p>
                <p className="text-black font-bold text-sm">{subscriptionData.paidUntil}</p>
              </div>
              <div>
                <p className="text-black/60 text-xs mb-0.5">Осталось дней</p>
                <p className="text-black font-bold text-2xl">{subscriptionData.daysLeft}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing plans */}
        <div>
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Выбор тарифа</h3>
          <p className="text-[#7d8590] text-sm mb-4">Нажмите на тариф для выбора</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {pricingPlans.map((p) => {
              const isSelected = selectedPlan === p.id;
              const isCurrent = p.id === "voice-pro";
              return (
                <button key={p.id} onClick={() => setSelectedPlan(p.id)}
                  className={`text-left rounded-xl border p-5 transition-all ${isSelected ? "border-[#00FF00] bg-[#00FF00]/5" : "border-[#30363d] bg-[#161b22] hover:border-[#3d444d]"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-[#00FF00]/20 text-[#00FF00]" : "bg-[#21262d] text-[#9198a1]"}`}>
                      {PLAN_ICONS[p.id]}
                    </div>
                    {isCurrent && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[#00FF00]/15 text-[#00FF00] border border-[#00FF00]/25">Текущий</span>
                    )}
                    {(p as any).popular && !isCurrent && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Популярный</span>
                    )}
                  </div>
                  <p className={`font-bold text-lg mb-0.5 font-unbounded ${isSelected ? "text-[#00FF00]" : "text-[#e6edf3]"}`}>{p.name}</p>
                  <p className="text-[#e6edf3] font-semibold text-lg mb-4">{formatCurrency(p.price)}<span className="text-[#7d8590] text-xs font-normal">/мес</span></p>
                  <ul className="space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 size={13} className={isSelected ? "text-[#00FF00]" : "text-[#7d8590]"} />
                        <span className="text-xs text-[#9198a1]">{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment form */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-4">Оплата</h3>
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-[#9198a1] text-xs font-medium mb-2 block">Срок оплаты</label>
              <div className="space-y-2">
                {PAYMENT_PERIODS.map((p) => (
                  <button key={p.months} onClick={() => setPaymentPeriod(p.months)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-sm ${
                      paymentPeriod === p.months ? "border-[#00FF00]/40 bg-[#00FF00]/5 text-[#e6edf3]" : "border-[#30363d] bg-[#0d1117] text-[#9198a1] hover:text-[#e6edf3]"
                    }`}>
                    <span>{p.label}</span>
                    {p.discount > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-[#00FF00]/15 text-[#00FF00]">−{p.discount}%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-w-52">
              <p className="text-[#9198a1] text-xs font-medium mb-3">Итого к оплате</p>
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#9198a1]">Тариф</span>
                  <span className="text-[#e6edf3] font-medium">{plan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9198a1]">Срок</span>
                  <span className="text-[#e6edf3] font-medium">{period.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#9198a1]">Цена/мес</span>
                  <span className="text-[#e6edf3] font-medium">{formatCurrency(monthlyPrice)}</span>
                </div>
                {period.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#9198a1]">Скидка</span>
                    <span className="text-[#00FF00] font-medium">−{period.discount}%</span>
                  </div>
                )}
                <div className="border-t border-[#30363d] pt-3 flex justify-between">
                  <span className="text-[#e6edf3] font-semibold">Итого</span>
                  <span className="text-[#00FF00] font-bold text-xl">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2.5 rounded-lg bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors">
                  Оплатить
                </button>
                <button onClick={handleCheck}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#30363d] text-[#9198a1] text-sm font-medium hover:border-[#3d444d] transition-colors">
                  <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
                  {checking ? "Проверяем..." : "Проверить оплату"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Channel management */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Каналы связи</h3>
            <p className="text-[#7d8590] text-sm mt-0.5">Настройте интеграции и параметры каналов</p>
          </div>
          <div className="space-y-3">
            {channels.map((ch) => (
              <div key={ch.id} className={`border rounded-xl overflow-hidden transition-colors ${ch.enabled ? "border-[#00FF00]/30" : "border-[#30363d]"}`}>
                {/* Channel header */}
                <div className={`flex items-center justify-between p-4 ${ch.enabled ? "bg-[#00FF00]/5" : "bg-[#0d1117]"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${ch.enabled ? "bg-[#00FF00]/20 text-[#00FF00]" : "bg-[#21262d] text-[#9198a1]"}`}>
                      {ch.icon}
                    </div>
                    <div>
                      <p className="text-[#e6edf3] font-semibold">{ch.name}</p>
                      <p className={`text-xs ${ch.enabled ? "text-[#00FF00]" : "text-[#7d8590]"}`}>
                        {ch.connected ? (ch.enabled ? "Подключён и активен" : "Подключён, но отключён") : "Не подключён"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ch.connected && (
                      <div className="text-right hidden sm:block">
                        <p className="text-[#e6edf3] text-sm font-semibold">{ch.messagesMonth.toLocaleString("ru")}</p>
                        <p className="text-[#7d8590] text-xs">сообщ./мес</p>
                      </div>
                    )}
                    <button onClick={() => toggleChannel(ch.id)}
                      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 ${ch.enabled ? "bg-[#00FF00]" : "bg-[#21262d]"}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${ch.enabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                    <button onClick={() => setExpandedChannel(expandedChannel === ch.id ? null : ch.id)}
                      className="p-1.5 rounded-lg text-[#7d8590] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors">
                      <Settings2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded settings */}
                {expandedChannel === ch.id && (
                  <div className="border-t border-[#30363d] p-4 space-y-4 bg-[#0d1117]">
                    {ch.connected && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                        {[
                          { label: "Сообщений/мес", value: ch.messagesMonth.toLocaleString("ru"), icon: <MessageSquare size={13} /> },
                          { label: "Ср. ответ", value: ch.avgResponse, icon: <Clock size={13} /> },
                        ].map((stat) => (
                          <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1 text-[#7d8590]">{stat.icon}<span className="text-xs">{stat.label}</span></div>
                            <p className="text-[#e6edf3] font-semibold text-sm">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">
                          {ch.id === "telegram" ? "Имя бота" : "Идентификатор аккаунта"}
                        </label>
                        <input
                          value={ch.botName}
                          onChange={(e) => updateChannel(ch.id, "botName", e.target.value)}
                          placeholder={ch.id === "telegram" ? "@your_bot" : "Введите идентификатор"}
                          className="w-full bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]"
                        />
                      </div>
                      <div>
                        <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Webhook URL</label>
                        <div className="flex gap-2">
                          <input
                            value={ch.webhookUrl}
                            onChange={(e) => updateChannel(ch.id, "webhookUrl", e.target.value)}
                            placeholder="https://..."
                            className="flex-1 bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]"
                          />
                          {ch.webhookUrl && (
                            <a href={ch.webhookUrl} target="_blank" rel="noopener noreferrer"
                              className="w-10 h-10 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center hover:border-[#3d444d] transition-colors flex-shrink-0">
                              <ExternalLink size={14} className="text-[#9198a1]" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Часы работы</label>
                      <div className="flex items-center gap-3">
                        <input
                          value={ch.workFrom}
                          onChange={(e) => updateChannel(ch.id, "workFrom", e.target.value)}
                          type="time"
                          className="bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
                        />
                        <span className="text-[#7d8590] text-sm">—</span>
                        <input
                          value={ch.workTo}
                          onChange={(e) => updateChannel(ch.id, "workTo", e.target.value)}
                          type="time"
                          className="bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
                        />
                        <span className="text-[#7d8590] text-xs">Вне этого времени бот не отвечает</span>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => saveChannelSettings(ch.id)} className="px-5 py-2 rounded-lg bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors">
                        Сохранить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Automation modules */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Автоматизация</h3>
              <p className="text-[#7d8590] text-sm mt-0.5">Статус обновляется автоматически</p>
            </div>
          </div>
          <div className="space-y-3">
            {autoModules.map((mod) => (
              <div key={mod.id} className="flex items-center justify-between py-3 border-b border-[#21262d] last:border-0">
                <div>
                  <p className="text-[#e6edf3] text-sm font-medium">{mod.name}</p>
                  <p className={`text-xs mt-0.5 ${mod.enabled ? "text-[#00FF00]" : "text-[#7d8590]"}`}>
                    {mod.enabled ? "Активно" : "Отключено"}
                  </p>
                </div>
                <button onClick={() => toggleModule(mod.id)}
                  className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 ${mod.enabled ? "bg-[#00FF00]" : "bg-[#21262d]"}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${mod.enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
