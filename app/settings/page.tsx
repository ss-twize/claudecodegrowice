"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { profileSettings, orgSettings } from "@/lib/mockData";
import { Plus, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({ ...profileSettings });
  const [org, setOrg] = useState({ ...orgSettings });
  const [admins, setAdmins] = useState([...orgSettings.admins]);
  const [branches, setBranches] = useState<{ name: string; address: string }[]>([]);
  const [profileSaved, setProfileSaved] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

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

  return (
    <div>
      <Header title="Настройки" subtitle="Профиль, организация и филиалы" />
      <div className="p-6 space-y-6 max-w-3xl">

        {/* Profile */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5">
          <h3 className="text-[#e6edf3] font-semibold font-unbounded mb-1">Профиль</h3>
          <p className="text-[#7d8590] text-sm mb-5">Личные данные владельца</p>
          <div className="space-y-4">
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">ФИО</label>
              <input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Телефон</label>
              <input
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Роль</label>
              <input
                value={profile.role}
                readOnly
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#9198a1] text-sm rounded-lg px-3 py-2.5 outline-none cursor-not-allowed"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={saveProfile}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  profileSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30" : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                }`}
              >
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
            <button
              onClick={addBranch}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border border-[#30363d] text-[#9198a1] hover:text-[#e6edf3] hover:border-[#3d444d] transition-colors"
            >
              <Plus size={14} />
              Добавить филиал
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Название организации</label>
              <input
                value={org.name}
                onChange={(e) => setOrg((o) => ({ ...o, name: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-1.5 block">Адрес</label>
              <input
                value={org.address}
                onChange={(e) => setOrg((o) => ({ ...o, address: e.target.value }))}
                className="w-full bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
              />
            </div>

            {/* Map links */}
            <div>
              <label className="text-[#9198a1] text-xs font-medium mb-2 block">Страница на картах</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#e6edf3]">Я</span>
                  </div>
                  <input
                    value={org.yandexMapsUrl}
                    onChange={(e) => setOrg((o) => ({ ...o, yandexMapsUrl: e.target.value }))}
                    placeholder="Ссылка на Яндекс Карты"
                    className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]"
                  />
                  <a href={org.yandexMapsUrl} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center hover:border-[#3d444d] transition-colors flex-shrink-0">
                    <ExternalLink size={14} className="text-[#9198a1]" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#e6edf3]">2Г</span>
                  </div>
                  <input
                    value={org.dgisUrl}
                    onChange={(e) => setOrg((o) => ({ ...o, dgisUrl: e.target.value }))}
                    placeholder="Ссылка на 2ГИС"
                    className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]"
                  />
                  <a href={org.dgisUrl} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center hover:border-[#3d444d] transition-colors flex-shrink-0">
                    <ExternalLink size={14} className="text-[#9198a1]" />
                  </a>
                </div>
              </div>
            </div>

            {/* Admins */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[#9198a1] text-xs font-medium">Администраторы</label>
                <button onClick={addAdmin} className="text-[#00FF00] text-xs font-medium hover:text-[#ccff33] transition-colors">
                  + Добавить
                </button>
              </div>
              <div className="space-y-2">
                {admins.map((admin, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={admin}
                      onChange={(e) => updateAdmin(i, e.target.value)}
                      placeholder="Введите ФИО"
                      className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]"
                    />
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
                        <button onClick={() => removeBranch(i)}
                          className="text-[#7d8590] hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <input
                          value={branch.name}
                          onChange={(e) => updateBranch(i, "name", e.target.value)}
                          placeholder="Название филиала"
                          className="w-full bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]"
                        />
                        <input
                          value={branch.address}
                          onChange={(e) => updateBranch(i, "address", e.target.value)}
                          placeholder="Адрес"
                          className="w-full bg-[#161b22] border border-[#30363d] text-[#e6edf3] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors placeholder-[#7d8590]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={saveOrg}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  orgSaved ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30" : "bg-[#00FF00] text-black hover:bg-[#ccff33]"
                }`}
              >
                {orgSaved && <CheckCircle2 size={14} />}
                {orgSaved ? "Сохранено" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
