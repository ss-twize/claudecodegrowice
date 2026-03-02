"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { profileSettings, orgSettings, rolesData, notificationsConfig } from "@/lib/mockData";
import { Plus, Trash2, ExternalLink, CheckCircle2, Shield, Users, Bell } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ ...profileSettings });
  const [org, setOrg] = useState({ ...orgSettings });
  const [admins, setAdmins] = useState([...orgSettings.admins]);
  const [branches, setBranches] = useState<{ name: string; address: string }[]>([]);
  const [profileSaved, setProfileSaved] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);
  const [notifications, setNotifications] = useState(notificationsConfig.map((n) => ({ ...n })));

  const saveProfile = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const saveOrg = () => {
    setOrgSaved(true);
    setTimeout(() => setOrgSaved(false), 2000);
  };

  const addAdmin = () => setAdmins((prev) => [...prev, ""]);
  const removeAdmin = (i: number) => setAdmins((prev) => prev.filter((_, idx) => idx !== i));
  const updateAdmin = (i: number, val: string) => setAdmins((prev) => prev.map((a, idx) => idx === i ? val : a));

  const addBranch = () => setBranches((prev) => [...prev, { name: "", address: "" }]);
  const removeBranch = (i: number) => setBranches((prev) => prev.filter((_, idx) => idx !== i));
  const updateBranch = (i: number, field: "name" | "address", val: string) =>
    setBranches((prev) => prev.map((b, idx) => idx === i ? { ...b, [field]: val } : b));

  const toggleNotification = (id: string, channel: "telegram" | "email") => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, [channel]: !n[channel] } : n));
  };

  const ROLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    owner:  { bg: "bg-[#00FF00]/10",  border: "border-[#00FF00]/20",  text: "text-[#00FF00]" },
    admin:  { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400" },
    master: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400" },
  };

  return (
    <div>
      <Header title="Настройки" subtitle="Профиль, организация, роли и уведомления" />
      <div className="p-6 space-y-6 max-w-3xl">

        {/* Profile */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Профиль</h3>
          <p className="text-[#7d8590] text-sm mb-5">Личные данные владельца</p>
          <div className="space-y-4">
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">ФИО</label>
              <input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors" />
            </div>
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Телефон</label>
              <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors" />
            </div>
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

        {/* Organization */}
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

            {/* Map links */}
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

            {/* Admins */}
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

            {/* Branches */}
            {branches.length > 0 && (
              <div>
                <p className="text-[#9198a1] text-xs font-medium mb-3">Филиалы</p>
                <div className="space-y-3">
                  {branches.map((branch, i) => (
                    <div key={i} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[#9198a1] text-xs font-medium">Филиал {i + 1}</span>
                        <button onClick={() => removeBranch(i)} className="text-[#7d8590] hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <input value={branch.name} onChange={(e) => updateBranch(i, "name", e.target.value)} placeholder="Название филиала"
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

        {/* Roles */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-[#00FF00]" />
            <h3 className="text-[#e6edf3] font-semibold font-unbounded">Роли и права доступа</h3>
          </div>
          <p className="text-[#7d8590] text-sm mb-5">Управление уровнями доступа для сотрудников</p>
          <div className="space-y-3">
            {rolesData.map((role) => {
              const colors = ROLE_COLORS[role.id];
              return (
                <div key={role.id} className={`border rounded-xl p-4 ${colors.border} ${colors.bg}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`text-sm font-semibold ${colors.text}`}>{role.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={13} className="text-[#7d8590]" />
                      <span className="text-[#9198a1] text-xs">{role.members.length} чел.</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {role.permissions.map((perm) => (
                      <span key={perm} className="text-xs px-2 py-0.5 rounded-md bg-[#161b22] border border-[#30363d] text-[#9198a1]">{perm}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {role.members.map((member) => (
                      <div key={member} className="flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-black ${role.id === "owner" ? "bg-[#00FF00]" : role.id === "admin" ? "bg-blue-400" : "bg-yellow-400"}`}>
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

        {/* Notifications */}
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
                  <th className="text-center text-[#7d8590] text-xs font-medium pb-3 px-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[#00FF00]">TG</span>
                      <span>Telegram</span>
                    </div>
                  </th>
                  <th className="text-center text-[#7d8590] text-xs font-medium pb-3 px-4 whitespace-nowrap">Email</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notif) => (
                  <tr key={notif.id} className="border-b border-[#21262d] last:border-0">
                    <td className="py-3 pr-4">
                      <span className="text-[#9198a1] text-sm">{notif.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => toggleNotification(notif.id, "telegram")}
                        className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 ${notif.telegram ? "bg-[#00FF00]" : "bg-[#21262d]"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${notif.telegram ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => toggleNotification(notif.id, "email")}
                        className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 ${notif.email ? "bg-[#00FF00]" : "bg-[#21262d]"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${notif.email ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
