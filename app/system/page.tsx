"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { callWebhook } from "@/lib/webhooks";
import { useAuth } from "@/lib/auth";
import { useSystemStates } from "@/lib/hooks/useSystemStates";
import { useChannelConnections } from "@/lib/hooks/useChannelConnections";
import { supabase, ORG_UID } from "@/lib/supabase";
import { GreenApiChannelCard } from "@/components/system/GreenApiChannelCard";
import { Settings2, ExternalLink, MessageSquare, Bot, Power } from "lucide-react";

// Static Telegram channel config — WA and Max use GreenApiChannelCard (channel_connections table)
const TELEGRAM_CHANNEL = {
  id: "telegram", name: "Telegram", icon: "TG",
  enabled: false, connected: false, messagesMonth: 0,
  botName: "", webhookUrl: "",
};

const IN_DEVELOPMENT_SYSTEM_CODES = new Set(["avto_sdvig", "analitika_otmeny", "obrabotchik_otzyvov"]);

export default function SystemPage() {
  const { role, isOwner } = useAuth();
  const { systems, setSystems } = useSystemStates();
  const { getConnection, refetch: refetchConnections } = useChannelConnections();
  const [tgChannel, setTgChannel] = useState({ ...TELEGRAM_CHANNEL });
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [togglingSystem, setTogglingSystem] = useState<string | null>(null);

  const toggleChannel = async (id: string) => {
    const newEnabled = !tgChannel.enabled;
    setTgChannel(prev => ({ ...prev, enabled: newEnabled }));
    await callWebhook("kanal_toggle", { channel_id: id, enabled: newEnabled });
  };

  const updateChannel = (_id: string, field: string, value: string) => {
    setTgChannel(prev => ({ ...prev, [field]: value }));
  };

  const saveChannelSettings = async (id: string) => {
    await callWebhook("kanal_nastroit", { channel_id: id, bot_name: tgChannel.botName, webhook_url: tgChannel.webhookUrl });
  };

  const autoSystems = systems.filter((system) => system.system_code !== "main_agent");

  const toggleSystem = async (systemCode: string, currentEnabled: boolean) => {
    if (togglingSystem) return;
    setTogglingSystem(systemCode);
    const newEnabled = !currentEnabled;
    await callWebhook("sistema_toggle", { system_code: systemCode, enabled: newEnabled });
    setSystems((prev) => prev.map((system) => (
      system.system_code === systemCode
        ? { ...system, enabled: newEnabled }
        : system
    )));
    await supabase
      .from("system_states")
      .update({ enabled: newEnabled, updated_at: new Date().toISOString() })
      .eq("org_uid", ORG_UID)
      .eq("system_code", systemCode);
    setTogglingSystem(null);
  };

  const configureSystem = async (systemCode: string) => {
    const result = await callWebhook("sistema_nastroit", { system_code: systemCode });
    if (!result.configured) alert("Вебхук не настроен. Добавьте адрес для действия «sistema_nastroit».");
  };

  return (
    <div>
      <Header title="Система" subtitle="Каналы связи и автоматизации" />
      <div className="p-6 space-y-6">

        {/* Channel management */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="mb-5">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Каналы связи</h3>
            <p className="text-[#5E7488] text-sm mt-0.5">Настройте интеграции и параметры каналов</p>
          </div>
          <div className="space-y-3">
            {/* ── Telegram ── */}
            {(() => {
              const ch = tgChannel;
              return (
                <div className={`border rounded-xl overflow-hidden transition-colors ${ch.enabled ? "border-[#00FF00]/30" : "border-[#223444]"}`}>
                  <div className={`flex items-center justify-between p-4 ${ch.enabled ? "bg-[#00FF00]/5" : "bg-[#0A0D14]"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${ch.enabled ? "bg-[#00FF00]/20 text-[#00FF00]" : "bg-[#1A2535] text-[#8299B4]"}`}>
                        {ch.icon}
                      </div>
                      <div>
                        <p className="text-[#EDF2FA] font-semibold">{ch.name}</p>
                        <p className={`text-xs ${ch.enabled ? "text-[#00FF00]" : "text-[#5E7488]"}`}>
                          {ch.connected ? (ch.enabled ? "Подключён и активен" : "Подключён, но отключён") : "Не подключён"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleChannel(ch.id)}
                        className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 ${ch.enabled ? "bg-[#00FF00]" : "bg-[#1A2535]"}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${ch.enabled ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                      <button onClick={() => setExpandedChannel(expandedChannel === ch.id ? null : ch.id)}
                        className="p-1.5 rounded-lg text-[#5E7488] hover:text-[#EDF2FA] hover:bg-[#1A2535] transition-colors">
                        <Settings2 size={16} />
                      </button>
                    </div>
                  </div>
                  {expandedChannel === ch.id && (
                    <div className="border-t border-[#223444] p-4 space-y-4 bg-[#0A0D14]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Имя бота</label>
                          <input value={ch.botName} onChange={(e) => updateChannel(ch.id, "botName", e.target.value)}
                            placeholder="@your_bot"
                            className="w-full bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]" />
                        </div>
                        <div>
                          <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Токен бота</label>
                          <div className="flex gap-2">
                            <input value={ch.webhookUrl} onChange={(e) => updateChannel(ch.id, "webhookUrl", e.target.value)}
                              placeholder="https://..."
                              className="flex-1 bg-[#0F1622] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]" />
                            {ch.webhookUrl && (
                              <a href={ch.webhookUrl} target="_blank" rel="noopener noreferrer"
                                className="w-10 h-10 rounded-lg bg-[#0F1622] border border-[#223444] flex items-center justify-center hover:border-[#2C4460] transition-colors flex-shrink-0">
                                <ExternalLink size={14} className="text-[#8299B4]" />
                              </a>
                            )}
                          </div>
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
              );
            })()}

            {/* ── WhatsApp ── */}
            <GreenApiChannelCard
              channelCode="whatsapp"
              channelName="WhatsApp"
              icon="WA"
              connection={getConnection("whatsapp")}
              role={role}
              onRefetch={refetchConnections}
            />

            {/* ── Max ── */}
            <GreenApiChannelCard
              channelCode="max"
              channelName="Max"
              icon="МХ"
              connection={getConnection("max")}
              role={role}
              onRefetch={refetchConnections}
            />
          </div>
        </div>

        {/* Automation systems — owner only */}
        {isOwner && (
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 size={16} className="text-[#00FF00]" />
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Автосистемы</h3>
            </div>
            <p className="text-[#5E7488] text-sm mb-6">Автоматические сценарии работы с клиентами</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {autoSystems.map((system) => {
                const isInDevelopment = IN_DEVELOPMENT_SYSTEM_CODES.has(system.system_code);

                return (
                <div
                  key={system.system_code}
                  className={`bg-[#0A0D14] border border-[#223444] rounded-xl p-5 flex flex-col ${isInDevelopment ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center flex-shrink-0">
                      <Bot size={18} className="text-[#00FF00]" />
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-md border ${isInDevelopment ? "bg-[#1A2535] text-[#9AA9BB] border-[#31465D]" : system.enabled ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/20" : "bg-[#1A2535] text-[#5E7488] border-[#223444]"}`}>
                      {isInDevelopment ? "В разработке" : system.enabled ? "Активно" : "Выключено"}
                    </span>
                  </div>
                  <p className="text-[#EDF2FA] font-semibold mb-1 text-sm">{system.name}</p>
                  <p className="text-[#5E7488] text-xs mb-4 leading-relaxed flex-1">{system.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => configureSystem(system.system_code)}
                      disabled={isInDevelopment}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#223444] text-[#8299B4] hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Settings2 size={12} />
                      Настроить
                    </button>
                    <button
                      onClick={() => toggleSystem(system.system_code, system.enabled)}
                      disabled={isInDevelopment || togglingSystem === system.system_code}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${system.enabled ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-[#00FF00]/30 text-[#00FF00] hover:bg-[#00FF00]/10"}`}
                    >
                      <Power size={12} />
                      {isInDevelopment ? "Недоступно" : system.enabled ? "Выключить" : "Включить"}
                    </button>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
