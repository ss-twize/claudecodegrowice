"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/layout/Header";
import { callWebhook } from "@/lib/webhooks";
import { supabase, ORG_UID } from "@/lib/supabase";
import { useKnowledgeFiles } from "@/lib/hooks/useKnowledgeFiles";
import {
  ExternalLink,
  CheckCircle2,
  Upload,
  FileText,
  X,
  RefreshCw,
  MessageSquare,
  Bot,
  Settings2,
  Users,
} from "lucide-react";
import { useOrgConfig } from "@/lib/contexts/OrgConfigContext";

type ImportSource = "yclients" | "google_sheets";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF", txt: "Текст", doc: "Ворд", docx: "Ворд",
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
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? "bg-[#00FF00]" : "bg-[#1A2535]"}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { files, setFiles } = useKnowledgeFiles();

  const { settings: orgConfigSettings } = useOrgConfig();

  const [salonForm, setSalonForm] = useState({
    salon_name: '',
    timezone: 'Europe/Moscow',
    currency: 'RUB',
    support_url: '',
  });
  const [salonSaving, setSalonSaving] = useState(false);
  const [salonSaved, setSalonSaved] = useState(false);

  // Populate form from context once loaded
  useEffect(() => {
    setSalonForm({
      salon_name: orgConfigSettings.salon_name,
      timezone: orgConfigSettings.timezone,
      currency: orgConfigSettings.currency,
      support_url: orgConfigSettings.support_url ?? '',
    });
  }, [orgConfigSettings]);

  const [greetingSaved, setGreetingSaved] = useState(false);

  const [greeting, setGreeting] = useState("Привет! Я ваш помощник салона красоты. Как могу помочь?");
  const [greetingLoading, setGreetingLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importSource, setImportSource] = useState<ImportSource>("yclients");
  const [importSourceSaving, setImportSourceSaving] = useState(false);
  const [importSourceSaved, setImportSourceSaved] = useState(false);

  useEffect(() => {
    const loadImportSource = async () => {
      const { data } = await supabase
        .from("org_settings")
        .select("contacts_import_source")
        .eq("org_uid", ORG_UID)
        .single();

      const source = data?.contacts_import_source;
      if (source === "yclients" || source === "google_sheets") {
        setImportSource(source);
      }
    };

    void loadImportSource();
  }, []);

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
        });

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
    const result = await callWebhook('privetstvie_sokhranit', { text: greeting });
    if (result.configured) {
      await supabase.from('org_settings').update({ greeting_message: greeting }).eq('org_uid', ORG_UID);
    }
    setGreetingSaved(true);
    setTimeout(() => setGreetingSaved(false), 2000);
    setGreetingLoading(false);
  };

  const saveImportSource = async () => {
    setImportSourceSaving(true);
    await supabase
      .from("org_settings")
      .upsert(
        {
          org_uid: ORG_UID,
          contacts_import_source: importSource,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_uid" },
      );

    setImportSourceSaved(true);
    setTimeout(() => setImportSourceSaved(false), 2000);
    setImportSourceSaving(false);
  };

  const saveSalon = async () => {
    setSalonSaving(true);
    await supabase
      .from('org_settings')
      .upsert(
        { org_uid: ORG_UID, ...salonForm, updated_at: new Date().toISOString() },
        { onConflict: 'org_uid' },
      );
    setSalonSaved(true);
    setTimeout(() => setSalonSaved(false), 2000);
    setSalonSaving(false);
  };

  return (
    <div>
      <Header title="Настройки" subtitle="Управление агентом, базой знаний и параметрами" />
      <div className="p-6 space-y-6">
        {/* ── Параметры салона ── */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={16} className="text-[#00FF00]" />
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Параметры салона</h3>
          </div>
          <p className="text-[#5E7488] text-sm mb-4">Основные сведения и региональные настройки</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Название салона</label>
              <input
                value={salonForm.salon_name}
                onChange={(e) => setSalonForm(f => ({ ...f, salon_name: e.target.value }))}
                placeholder="Салон красоты"
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
              />
            </div>
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Ссылка поддержки</label>
              <input
                value={salonForm.support_url}
                onChange={(e) => setSalonForm(f => ({ ...f, support_url: e.target.value }))}
                placeholder="https://t.me/support"
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488]"
              />
            </div>
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Часовой пояс</label>
              <select
                value={salonForm.timezone}
                onChange={(e) => setSalonForm(f => ({ ...f, timezone: e.target.value }))}
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              >
                <option value="Europe/Moscow">Москва (UTC+3)</option>
                <option value="Europe/Kaliningrad">Калининград (UTC+2)</option>
                <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                <option value="Asia/Novosibirsk">Новосибирск (UTC+7)</option>
                <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
                <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
                <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
              </select>
            </div>
            <div>
              <label className="text-[#5E7488] text-xs mb-1 block">Валюта</label>
              <select
                value={salonForm.currency}
                onChange={(e) => setSalonForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              >
                <option value="RUB">₽ Рубль</option>
                <option value="USD">$ Доллар</option>
                <option value="EUR">€ Евро</option>
                <option value="KZT">₸ Тенге</option>
                <option value="BYN">Br Белорусский рубль</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveSalon}
              disabled={salonSaving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                salonSaved
                  ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                  : salonSaving
                    ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                    : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
              }`}
            >
              {salonSaved && <CheckCircle2 size={14} />}
              {salonSaved ? "Сохранено" : salonSaving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bot size={16} className="text-[#00FF00]" />
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Источник переноса контактов</h3>
          </div>
          <p className="text-[#5E7488] text-sm mb-4">
            На старте выберите источник: YClients или Google Таблицы. Данные из Google Таблиц будут адаптированы под схему clients (YClients-формат).
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-[#5E7488] text-xs">Источник</label>
            <select
              value={importSource}
              onChange={(e) => setImportSource(e.target.value as ImportSource)}
              className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
            >
              <option value="yclients">YClients (прямой импорт клиентов)</option>
              <option value="google_sheets">Google Таблицы (адаптация в схему clients)</option>
            </select>
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={saveImportSource}
              disabled={importSourceSaving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                importSourceSaved
                  ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30"
                  : importSourceSaving
                    ? "bg-[#00FF00]/50 text-black cursor-not-allowed"
                    : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
              }`}
            >
              {importSourceSaved && <CheckCircle2 size={14} />}
              {importSourceSaved ? "Сохранено" : importSourceSaving ? "Сохранение..." : "Сохранить источник"}
            </button>
          </div>
        </div>

        {/* ── Greeting message ── */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={16} className="text-[#00FF00]" />
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Приветственное сообщение</h3>
            </div>
            <p className="text-[#5E7488] text-sm mb-4">Первое сообщение агента новому клиенту</p>
            <textarea
              rows={3}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#5E7488] resize-none"
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
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-[#00FF00]" />
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">База знаний</h3>
          </div>
          <p className="text-[#5E7488] text-sm mb-4">Загрузите документы для агента — они отправляются в обработку и сохраняются на Гугл Диск</p>

          {/* Upload area */}
          <div
            className="border-2 border-dashed border-[#223444] rounded-xl p-6 text-center hover:border-[#00FF00]/40 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={24} className="text-[#5E7488] mx-auto mb-2" />
            <p className="text-[#EDF2FA] text-sm font-medium">Нажмите или перетащите файл</p>
            <p className="text-[#5E7488] text-xs mt-1">PDF, TXT, DOC, DOCX — до 20 МБ</p>
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
                <div key={file.id} className="flex items-center justify-between bg-[#0A0D14] border border-[#223444] rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#8299B4] text-xs font-bold">{(FILE_TYPE_LABELS[file.file_type] || file.file_type).slice(0, 3)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#EDF2FA] text-sm truncate">{file.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_COLORS[file.status] || 'text-[#8299B4] bg-[#1A2535] border-[#223444]'}`}>
                        {file.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {file.drive_url && (
                      <a href={file.drive_url} target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center hover:border-[#2C4460] transition-colors">
                        <ExternalLink size={12} className="text-[#8299B4]" />
                      </a>
                    )}
                    <button onClick={() => deleteFile(file.id)}
                      className="w-7 h-7 rounded-lg bg-[#1A2535] border border-[#223444] flex items-center justify-center hover:border-red-500/40 hover:text-red-400 text-[#5E7488] transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {files.length === 0 && !uploading && (
            <p className="text-[#5E7488] text-xs mt-3 text-center">Файлы не загружены</p>
          )}
        </div>

      </div>
    </div>
  );
}
