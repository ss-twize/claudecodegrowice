"use client";

import { useState, useRef } from "react";
import Header from "@/components/layout/Header";
import { profileSettings, orgSettings, rolesData, notificationsConfig } from "@/lib/mockData";
import { callWebhook } from "@/lib/webhooks";
import { supabase, ORG_UID } from "@/lib/supabase";
import { useSystemStates } from "@/lib/hooks/useSystemStates";
import { useKnowledgeFiles } from "@/lib/hooks/useKnowledgeFiles";
import { useAuth } from "@/lib/auth";
import {
  Plus, Trash2, ExternalLink, CheckCircle2, Shield, Users, Bell,
  Upload, FileText, X, RefreshCw, MessageSquare, Power, Settings2,
  AlertTriangle,
} from "lucide-react";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF", txt: "Текст", doc: "Word", docx: "Word",
};
const STATUS_COLORS: Record<string, string> = {
  загружен: "text-[#00FF00] bg-[#00FF00]/10 border-[#00FF00]/20",
  обрабатывается: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  ошибка: "text-red-400 bg-red-500/10 border-red-500/20",
  отправлен: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? "bg-[#00FF00]" : "bg-[#21262d]"}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { isOwner, role } = useAuth();
  const { systems, setSystems } = useSystemStates();
  const { files, setFiles } = useKnowledgeFiles();

  const [profile, setProfile] = useState({ ...profileSettings });
  const [org, setOrg] = useState({ ...orgSettings });
  const [admins, setAdmins] = useState([...orgSettings.admins]);
  const [branches, setBranches] = useState<{ name: string; address: string }[]>([]);
  const [notifications, setNotifications] = useState(notificationsConfig.map((n) => ({ ...n })));

  const [profileSaved, setProfileSaved] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);
  const [greetingSaved, setGreetingSaved] = useState(false);

  const [greeting, setGreeting] = useState("Привет! Я ваш помощник салона красоты. Как могу помочь?");
  const [greetingLoading, setGreetingLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [togglingSystem, setTogglingSystem] = useState<string | null>(null);

  const ROLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    owner:  { bg: "bg-[#00FF00]/10",  border: "border-[#00FF00]/20",  text: "text-[#00FF00]" },
    admin:  { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400" },
    master: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400" },
  };

  const saveProfile = () => { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000); };
  const saveOrg = () => { setOrgSaved(true); setTimeout(() => setOrgSaved(false), 2000); };

  const addAdmin = () => setAdmins((prev) => [...prev, ""]);
  const removeAdmin = (i: number) => setAdmins((prev) => prev.filter((_, idx) => idx !== i));
  const updateAdmin = (i: number, val: string) => setAdmins((prev) => prev.map((a, idx) => idx === i ? val : a));
  const addBranch = () => setBranches((prev) => [...prev, { name: "", address: "" }]);
  const removeBranch = (i: number) => setBranches((prev) => prev.filter((_, idx) => idx !== i));
  const updateBranch = (i: number, field: "name" | "address", val: string) =>
    setBranches((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  const toggleNotification = (id: string, channel: "telegram" | "email") =>
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, [channel]: !n[channel] } : n));

  // Knowledge base upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'txt', 'doc', 'docx'].includes(ext)) {
      setUploadError("Допустимые форматы: PDF, TXT, DOC, DOCX");
      return;
    }
    setUploadError("");
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const path = `${ORG_UID}/${Date.now()}_${file.name}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('knowledge')
        .upload(path, file, { upsert: true });

      const storageUrl = storageError ? "" : (storageData?.path || "");

      // Insert record to knowledge_files
      const { data: inserted } = await supabase.from('knowledge_files').insert({
        org_uid: ORG_UID,
        name: file.name,
        file_type: ext,
        storage_url: storageUrl,
        status: 'обрабатывается',
      }).select().single();

      if (inserted) {
        setFiles(prev => [inserted, ...prev]);
        // Call webhook to process
        const result = await callWebhook('baza_znanii_zagruzit', {
          file_id: inserted.id,
          file_name: file.name,
          file_type: ext,
          storage_url: storageUrl,
        }, role);

        if (!result.configured) {
          // Update status back to loaded if no webhook
          await supabase.from('knowledge_files').update({ status: 'загружен' }).eq('id', inserted.id);
          setFiles(prev => prev.map(f => f.id === inserted.id ? { ...f, status: 'загружен' } : f));
        }
      }
    } catch {
      setUploadError("Ошибка при загрузке файла");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (id: string) => {
    await supabase.from('knowledge_files').delete().eq('id', id);
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Greeting save
  const saveGreeting = async () => {
    setGreetingLoading(true);
    const result = await callWebhook('privetstvie_sokhranit', { text: greeting }, role);
    if (result.configured) {
      await supabase.from('org_settings').update({ greeting_message: greeting }).eq('org_uid', ORG_UID);
    }
    setGreetingSaved(true);
    setTimeout(() => setGreetingSaved(false), 2000);
    setGreetingLoading(false);
  };

  // System toggle
  const toggleSystem = async (systemCode: string, currentEnabled: boolean) => {
    if (togglingSystem) return;
    setTogglingSystem(systemCode);
    const newEnabled = !currentEnabled;
    const result = await callWebhook('sistema_toggle', { system_code: systemCode, enabled: newEnabled }, role);
    if (result.configured || !result.configured) {
      // Optimistic update
      setSystems(prev => prev.map(s => s.system_code === systemCode ? { ...s, enabled: newEnabled } : s));
      await supabase.from('system_states').update({ enabled: newEnabled, updated_at: new Date().toISOString() })
        .eq('org_uid', ORG_UID).eq('system_code', systemCode);
    }
    setTogglingSystem(null);
  };

  const configureSystem = async (systemCode: string) => {
    const result = await callWebhook('sistema_nastroit', { system_code: systemCode }, role);
    if (!result.configured) alert("Вебхук не настроен. Добавьте адрес для действия «sistema_nastroit».");
  };

  const mainAgent = systems.find(s => s.system_code === 'main_agent');
  const autoSystems = systems.filter(s => s.system_code !== 'main_agent');

  return (
    <div>
      <Header title="Настройки" subtitle="Управление агентом, базой знаний и параметрами" />
      <div className="p-6 space-y-6 max-w-3xl">

        {/* ── Main agent toggle ── */}
        {isOwner && mainAgent && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Power size={16} className="text-[#00FF00]" />
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Основной агент</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#e6edf3] font-medium">{mainAgent.name}</p>
                <p className="text-[#7d8590] text-sm mt-0.5">{mainAgent.description}</p>
                <p className={`text-xs mt-1 font-medium ${mainAgent.enabled ? "text-[#00FF00]" : "text-red-400"}`}>
                  {mainAgent.enabled ? "Активен — принимает обращения" : "Выключен — обращения не обрабатываются"}
                </p>
              </div>
              <Toggle
                enabled={mainAgent.enabled}
                onChange={() => toggleSystem(mainAgent.system_code, mainAgent.enabled)}
              />
            </div>
          </div>
        )}

        {/* ── Greeting message ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare size={16} className="text-[#00FF00]" />
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Приветственное сообщение</h3>
          </div>
          <p className="text-[#7d8590] text-sm mb-4">Первое сообщение агента новому клиенту</p>
          <textarea
            rows={3}
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590] resize-none"
          />
          <div className="flex justify-end mt-3">
            <button onClick={saveGreeting} disabled={greetingLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                greetingSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                : greetingLoading ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
              }`}>
              {greetingLoading && <RefreshCw size={14} className="animate-spin" />}
              {greetingSaved && <CheckCircle2 size={14} />}
              {greetingSaved ? "Сохранено" : greetingLoading ? "Отправка..." : "Сохранить"}
            </button>
          </div>
        </div>

        {/* ── Knowledge base ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-[#00FF00]" />
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">База знаний</h3>
          </div>
          <p className="text-[#7d8590] text-sm mb-4">Загрузите документы для агента — они отправляются в обработку и сохраняются на Google Диск</p>

          {/* Upload area */}
          <div
            className="border-2 border-dashed border-[#30363d] rounded-xl p-6 text-center hover:border-[#00FF00]/40 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-[#7d8590] mx-auto mb-2" />
            <p className="text-[#e6edf3] text-sm font-medium">Нажмите или перетащите файл</p>
            <p className="text-[#7d8590] text-xs mt-1">PDF, TXT, DOC, DOCX — до 20 МБ</p>
            {uploading && <p className="text-[#00FF00] text-xs mt-2 font-medium">Загрузка...</p>}
            {uploadError && <p className="text-red-400 text-xs mt-2">{uploadError}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#9198a1] text-xs font-bold">{(FILE_TYPE_LABELS[file.file_type] || file.file_type).slice(0, 3)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#e6edf3] text-sm truncate">{file.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[file.status] || 'text-[#9198a1] bg-[#21262d] border-[#30363d]'}`}>
                        {file.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {file.drive_url && (
                      <a href={file.drive_url} target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center hover:border-[#3d444d] transition-colors">
                        <ExternalLink size={12} className="text-[#9198a1]" />
                      </a>
                    )}
                    <button onClick={() => deleteFile(file.id)}
                      className="w-7 h-7 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center hover:border-red-500/40 hover:text-red-400 text-[#7d8590] transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && !uploading && (
            <p className="text-[#7d8590] text-xs mt-3 text-center">Файлы не загружены</p>
          )}
        </div>

        {/* ── Auto-systems toggles ── */}
        {isOwner && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 size={16} className="text-[#00FF00]" />
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Автосистемы</h3>
            </div>
            <p className="text-[#7d8590] text-sm mb-4">Включение и настройка автоматических сценариев</p>
            <div className="space-y-3">
              {autoSystems.map((sys) => (
                <div key={sys.system_code} className="flex items-center justify-between py-3 border-b border-[#21262d] last:border-0">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-[#e6edf3] text-sm font-medium">{sys.name}</p>
                    <p className="text-[#7d8590] text-xs mt-0.5">{sys.description}</p>
                    <p className={`text-xs mt-1 font-medium ${sys.enabled ? "text-[#00FF00]" : "text-[#7d8590]"}`}>
                      {sys.enabled ? "Активна" : "Отключена"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => configureSystem(sys.system_code)}
                      className="px-3 py-1.5 rounded-lg border border-[#30363d] text-[#9198a1] text-xs font-medium hover:border-[#3d444d] hover:text-[#e6edf3] transition-colors"
                    >
                      Настроить
                    </button>
                    <Toggle
                      enabled={sys.enabled}
                      onChange={() => toggleSystem(sys.system_code, sys.enabled)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Profile (owner only) ── */}
        {isOwner && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Профиль</h3>
            <p className="text-[#7d8590] text-sm mb-5">Личные данные владельца</p>
            <div className="space-y-4">
              {[
                { label: "ФИО", field: "name" as const },
                { label: "Телефон", field: "phone" as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">{label}</label>
                  <input value={profile[field]} onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Роль</label>
                <input value={profile.role} readOnly
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#9198a1] text-sm rounded-lg px-3 py-2.5 outline-none cursor-not-allowed" />
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={saveProfile}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    profileSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30" : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                  }`}>
                  {profileSaved && <CheckCircle2 size={14} />}
                  {profileSaved ? "Сохранено" : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Organization (owner only) ── */}
        {isOwner && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Организация</h3>
                <p className="text-[#7d8590] text-sm">Данные салона и контакты</p>
              </div>
              <button onClick={addBranch}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-[#30363d] text-[#9198a1] hover:text-[#e6edf3] hover:border-[#3d444d] transition-colors">
                <Plus size={14} />Добавить филиал
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Название организации</label>
                <input value={org.name} onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors" />
              </div>
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Адрес</label>
                <input value={org.address} onChange={(e) => setOrg((o) => ({ ...o, address: e.target.value }))}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors" />
              </div>
              <div>
                <label className="text-[#9198a1] text-xs font-medium mb-2 block">Страница на картах</label>
                <div className="space-y-2">
                  {[
                    { key: "yandexMapsUrl" as const, label: "Я", placeholder: "Ссылка на Яндекс Карты" },
                    { key: "dgisUrl" as const, label: "2Г", placeholder: "Ссылка на 2ГИС" },
                  ].map((map) => (
                    <div key={map.key} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#e6edf3]">{map.label}</span>
                      </div>
                      <input value={org[map.key]} onChange={(e) => setOrg((o) => ({ ...o, [map.key]: e.target.value }))}
                        placeholder={map.placeholder}
                        className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]" />
                      <a href={org[map.key]} target="_blank" rel="noopener noreferrer"
                        className="w-9 h-9 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center hover:border-[#3d444d] transition-colors flex-shrink-0">
                        <ExternalLink size={14} className="text-[#9198a1]" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#9198a1] text-xs font-medium">Администраторы</label>
                  <button onClick={addAdmin} className="text-[#00FF00] text-xs font-medium hover:text-[#ccff33] transition-colors">+ Добавить</button>
                </div>
                <div className="space-y-2">
                  {admins.map((admin, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input value={admin} onChange={(e) => updateAdmin(i, e.target.value)} placeholder="Введите ФИО"
                        className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]" />
                      <button onClick={() => removeAdmin(i)}
                        className="w-9 h-9 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center hover:border-red-500/40 hover:text-red-400 text-[#7d8590] transition-colors flex-shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {branches.length > 0 && (
                <div>
                  <p className="text-[#9198a1] text-xs font-medium mb-3">Филиалы</p>
                  <div className="space-y-3">
                    {branches.map((branch, i) => (
                      <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[#9198a1] text-xs font-medium">Филиал {i + 1}</span>
                          <button onClick={() => removeBranch(i)} className="text-[#7d8590] hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                        <div className="space-y-2">
                          <input value={branch.name} onChange={(e) => updateBranch(i, "name", e.target.value)} placeholder="Название"
                            className="w-full bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]" />
                          <input value={branch.address} onChange={(e) => updateBranch(i, "address", e.target.value)} placeholder="Адрес"
                            className="w-full bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={saveOrg}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    orgSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30" : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                  }`}>
                  {orgSaved && <CheckCircle2 size={14} />}
                  {orgSaved ? "Сохранено" : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Roles (owner only) ── */}
        {isOwner && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-[#00FF00]" />
              <h3 className="text-[#e6edf3] font-semibold font-unbounded">Роли и права доступа</h3>
            </div>
            <p className="text-[#7d8590] text-sm mb-5">Управление уровнями доступа для сотрудников</p>
            <div className="space-y-3">
              {rolesData.map((roleItem) => {
                const colors = ROLE_COLORS[roleItem.id];
                return (
                  <div key={roleItem.id} className={`border rounded-xl p-4 ${colors.border} ${colors.bg}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-sm font-semibold ${colors.text}`}>{roleItem.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-[#7d8590]" />
                        <span className="text-[#9198a1] text-xs">{roleItem.members.length} чел.</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {roleItem.permissions.map((perm) => (
                        <span key={perm} className="text-xs px-2 py-0.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#9198a1]">{perm}</span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleItem.members.map((member) => (
                        <div key={member} className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-black ${roleItem.id === "owner" ? "bg-[#00FF00]" : roleItem.id === "admin" ? "bg-blue-400" : "bg-yellow-400"}`}>
                            {member[0]}
                          </div>
                          <span className="text-[#9198a1] text-xs">{member}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-[#00FF00]" />
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Уведомления</h3>
          </div>
          <p className="text-[#7d8590] text-sm mb-5">Настройте, куда приходят уведомления о событиях</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#21262d]">
                  <th className="text-left text-[#7d8590] text-xs font-medium pb-3">Событие</th>
                  <th className="text-center text-[#7d8590] text-xs font-medium pb-3 px-4 whitespace-nowrap">Telegram</th>
                  <th className="text-center text-[#7d8590] text-xs font-medium pb-3 px-4 whitespace-nowrap">Email</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr key={notif.id} className="border-b border-[#21262d] last:border-0">
                    <td className="py-3 pr-4"><span className="text-[#9198a1] text-sm">{notif.label}</span></td>
                    <td className="py-3 px-4 text-center">
                      <Toggle enabled={notif.telegram} onChange={() => toggleNotification(notif.id, "telegram")} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Toggle enabled={notif.email} onChange={() => toggleNotification(notif.id, "email")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin-only access note */}
        {!isOwner && (
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
              <p className="text-[#9198a1] text-sm">
                Некоторые разделы настроек доступны только владельцу.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
