"use client";

import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import MetricCard from "@/components/ui/MetricCard";
import { staffData, staffKPIData } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";
import { SortableHeader, useSortable } from "@/components/ui/SortableHeader";
import {
  UserCog, TrendingUp, Users, AlertTriangle, CheckCircle2,
  Star, ChevronDown, Plus, X, Wallet,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

type StaffPeriod = "month" | "quarter" | "year";

const PERIOD_LABELS: Record<StaffPeriod, string> = {
  month: "Месяц",
  quarter: "Квартал",
  year: "Год",
};

const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// ── Seeded pseudo-random ───────────────────────────────────────────────────────

function sr(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 10000;
  return x - Math.floor(x);
}

// ── Mock salaries (per staff id) ───────────────────────────────────────────────

const MOCK_SALARIES: Record<string, number> = {
  "1": 58000,
  "2": 62000,
  "3": 55000,
  "4": 71000,
};

const totalSalaries = staffData.reduce((s, m) => s + (MOCK_SALARIES[m.id] ?? 0), 0);

// ── Period-based chart data ────────────────────────────────────────────────────

function periodRevenueData(period: StaffPeriod) {
  const masters = staffData.map((m, mi) => {
    const multiplier = period === "year" ? 12 : period === "quarter" ? 3 : 1;
    const revenue = Math.round(m.revenue * multiplier * (0.85 + sr(mi * 17 + 1) * 0.3));
    return { name: m.name.split(" ")[0], revenue };
  });
  return masters;
}

interface KpiRow {
  id: number | string;
  name: string;
  avatar: string;
  conversionRate: number;
  noShowPercent: number;
  noShowCount: number;
  avgSession: string;
}

function periodKpiData(period: StaffPeriod): KpiRow[] {
  return staffData.map((m, mi) => {
    const base = staffKPIData.find((k) => k.masterId === m.id);
    const shift = period === "year" ? 5 : period === "quarter" ? 3 : 0;
    const conv = Math.min(99, Math.round((base?.conversionRate ?? 70) + shift * sr(mi + 10)));
    const noShow = Math.max(1, Math.round((base?.noShowPercent ?? 5) - shift * sr(mi + 20) * 0.5));
    const noShowCnt = period === "year" ? (base?.noShowCount ?? 3) * 12
      : period === "quarter" ? (base?.noShowCount ?? 3) * 3
      : (base?.noShowCount ?? 3);
    return {
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      conversionRate: conv,
      noShowPercent: noShow,
      noShowCount: noShowCnt,
      avgSession: base?.avgSession ?? "—",
    };
  });
}

function periodLabel(period: StaffPeriod): string {
  const now = new Date();
  const RU_MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  if (period === "month") return `${RU_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  }
  return String(now.getFullYear());
}

// ── Admin types ────────────────────────────────────────────────────────────────

interface AdminEntry {
  id: string;
  name: string;
  phone: string;
  telegram: string;
  salary: number;
  scheduleDays: boolean[]; // 7 days, Mon=0
  scheduleFrom: string;
  scheduleTo: string;
}

const INITIAL_ADMINS: AdminEntry[] = [
  {
    id: "a1",
    name: "Петрова Анна Сергеевна",
    phone: "+7 916 234-56-78",
    telegram: "@anna_petrovа",
    salary: 45000,
    scheduleDays: [true, true, true, true, true, false, false],
    scheduleFrom: "09:00",
    scheduleTo: "18:00",
  },
  {
    id: "a2",
    name: "Смирнова Ольга Ивановна",
    phone: "+7 903 876-54-32",
    telegram: "@olga_sm",
    salary: 42000,
    scheduleDays: [false, false, true, true, true, true, true],
    scheduleFrom: "12:00",
    scheduleTo: "21:00",
  },
];

function isWorkingNow(admin: AdminEntry): boolean {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // Mon=0
  if (!admin.scheduleDays[dow]) return false;
  const [fh, fm] = admin.scheduleFrom.split(":").map(Number);
  const [th, tm] = admin.scheduleTo.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= fh * 60 + fm && mins < th * 60 + tm;
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#8299B4] mb-1">{label}</p>
      <p className="text-[#00FF00] font-semibold">
        {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(payload[0].value)}
      </p>
    </div>
  );
};

// ── Period selector ────────────────────────────────────────────────────────────

function PeriodSelector({ value, onChange }: { value: StaffPeriod; onChange: (p: StaffPeriod) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
      >
        {PERIOD_LABELS[value]}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 min-w-[130px] rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
          {(Object.keys(PERIOD_LABELS) as StaffPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                value === p ? "text-[#00FF00] bg-[#00FF00]/10" : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Colors ─────────────────────────────────────────────────────────────────────

const colors = ["#00FF00", "#88CC00", "#66AA00", "#448800"];

// ── Main component ─────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [period, setPeriod] = useState<StaffPeriod>("month");

  // Chart & table data
  const revenueData = useMemo(() => periodRevenueData(period), [period]);
  const kpiRows = useMemo(() => periodKpiData(period), [period]);
  const { sorted: sortedKPI, sortCol: kpiSortCol, sortDir: kpiSortDir, onSort: kpiOnSort } = useSortable(kpiRows);

  const totalRevenue = staffData.reduce((s, m) => s + m.revenue, 0);
  const totalClients = staffData.reduce((s, m) => s + m.clients, 0);
  const avgWorkload = Math.round(staffData.reduce((s, m) => s + m.workload, 0) / staffData.length);

  // Admins state
  const [admins, setAdmins] = useState<AdminEntry[]>(INITIAL_ADMINS);
  const [adminModal, setAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "", phone: "", telegram: "", salary: "",
    scheduleDays: [true, true, true, true, true, false, false] as boolean[],
    scheduleFrom: "09:00", scheduleTo: "18:00",
  });
  const [adminFormError, setAdminFormError] = useState("");

  function openAdminModal() {
    setAdminForm({
      name: "", phone: "", telegram: "", salary: "",
      scheduleDays: [true, true, true, true, true, false, false],
      scheduleFrom: "09:00", scheduleTo: "18:00",
    });
    setAdminFormError("");
    setAdminModal(true);
  }

  function toggleFormDay(i: number) {
    setAdminForm((f) => {
      const days = [...f.scheduleDays];
      days[i] = !days[i];
      return { ...f, scheduleDays: days };
    });
  }

  function submitAdmin() {
    const { name, phone, telegram, salary, scheduleDays, scheduleFrom, scheduleTo } = adminForm;
    if (!name.trim() || !phone.trim() || !telegram.trim() || !salary.trim()) {
      setAdminFormError("Заполните все поля");
      return;
    }
    if (!scheduleDays.some(Boolean)) {
      setAdminFormError("Выберите хотя бы один рабочий день");
      return;
    }
    const newAdmin: AdminEntry = {
      id: `a${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      telegram: telegram.trim(),
      salary: Number(salary) || 0,
      scheduleDays,
      scheduleFrom,
      scheduleTo,
    };
    setAdmins((prev) => [...prev, newAdmin]);
    setAdminModal(false);
  }

  function removeAdmin(id: string) {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <Header title="Персонал" subtitle="Показатели работы мастеров" />
      <div className="p-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Общая выручка"
            value={formatCurrency(totalRevenue)}
            change={14.5}
            changeLabel="к прошлому месяцу"
            icon={<TrendingUp size={18} />}
            accent
          />
          <MetricCard title="Мастеров" value={String(staffData.length)} icon={<UserCog size={18} />} />
          <MetricCard
            title="Сумма зарплат"
            value={formatCurrency(totalSalaries)}
            change={-2.1}
            changeLabel="к прошлому месяцу"
            icon={<Wallet size={18} />}
          />
          <MetricCard
            title="Уникальных клиентов"
            value={String(totalClients)}
            change={7.3}
            changeLabel="к прошлому месяцу"
            icon={<Users size={18} />}
          />
        </div>

        {/* Revenue chart + KPI table */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Revenue chart */}
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 flex flex-col" style={{ minHeight: 320 }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Выручка по мастерам</h3>
                <p className="text-[#5E7488] text-sm">{periodLabel(period)}</p>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v / 1000}к`} width={45} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,255,0,0.05)" }} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {revenueData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPI table */}
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Показатели по мастерам</h3>
                <p className="text-[#5E7488] text-sm">Конверсия, не явки, время сессии</p>
              </div>
              <PeriodSelector value={period} onChange={setPeriod} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A2535]">
                    <SortableHeader label="Мастер"       col="name"          sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Конверсия"    col="conversionRate" sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Не явки"      col="noShowPercent"  sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 pr-4 py-3" />
                    <SortableHeader label="Время сессии" col="avgSession"     sortCol={kpiSortCol} sortDir={kpiSortDir} onSort={kpiOnSort} className="pl-0 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sortedKPI.map((master, i) => {
                    const colorIdx = staffData.findIndex((s) => String(s.id) === String(master.id));
                    return (
                      <tr key={master.id} className="border-b border-[#1A2535] last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
                              style={{ backgroundColor: colors[colorIdx >= 0 ? colorIdx : i] }}>
                              {master.avatar}
                            </div>
                            <span className="text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{master.name.split(" ")[0]}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#1A2535] rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#00FF00]" style={{ width: `${master.conversionRate}%` }} />
                            </div>
                            <span className="text-[#00FF00] text-sm font-semibold">{master.conversionRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div>
                            <span className={`text-sm font-medium ${master.noShowPercent > 8 ? "text-red-400" : master.noShowPercent > 5 ? "text-yellow-400" : "text-[#00FF00]"}`}>
                              {master.noShowPercent}%
                            </span>
                            <span className="text-[#5E7488] text-xs ml-1">({master.noShowCount} раз)</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-[#8299B4] text-sm">{master.avgSession || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Staff cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Карточки мастеров</h3>
            <div className="flex items-center gap-2 text-sm text-[#8299B4]">
              Средняя загрузка:{" "}
              <span className="text-[#00FF00] font-semibold">{avgWorkload}%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {staffData.map((master) => {
              const kpi = staffKPIData.find((k) => k.masterId === master.id);
              return (
                <div key={master.id} className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 card-hover">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black flex-shrink-0"
                      style={{ backgroundColor: master.color }}>
                      {master.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#EDF2FA] font-semibold truncate">{master.name}</p>
                      <p className="text-[#5E7488] text-xs">{master.role}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between mb-1.5">
                      <span className="text-[#5E7488] text-xs">Загрузка</span>
                      <span className="text-[#EDF2FA] text-xs font-medium">{master.workload}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1A2535] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${master.workload}%`, backgroundColor: master.color }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Выручка</span>
                      <span className="text-[#00FF00] text-xs font-semibold">{formatCurrency(master.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Средний чек</span>
                      <span className="text-[#8299B4] text-xs">{formatCurrency(master.avgCheck)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Клиентов</span>
                      <span className="text-[#8299B4] text-xs">{master.clients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5E7488] text-xs">Рейтинг</span>
                      <div className="flex items-center gap-1">
                        <Star size={11} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-[#8299B4] text-xs">{master.rating}</span>
                      </div>
                    </div>
                  </div>
                  {kpi && (
                    <div className="mt-4 pt-3 border-t border-[#1A2535] grid grid-cols-2 gap-2">
                      <div className="bg-[#141E2B] rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <CheckCircle2 size={11} className="text-[#00FF00]" />
                          <span className="text-[#00FF00] text-xs font-bold">{kpi.conversionRate}%</span>
                        </div>
                        <p className="text-[#5E7488] text-xs">Конверсия</p>
                      </div>
                      <div className="bg-[#141E2B] rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          <AlertTriangle size={11} className={kpi.noShowPercent > 8 ? "text-red-400" : "text-yellow-400"} />
                          <span className={`text-xs font-bold ${kpi.noShowPercent > 8 ? "text-red-400" : "text-yellow-400"}`}>{kpi.noShowPercent}%</span>
                        </div>
                        <p className="text-[#5E7488] text-xs">Не явки</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Admins block ──────────────────────────────────────────────────────── */}
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Администраторы</h3>
              <p className="text-[#5E7488] text-sm">{admins.length} сотрудника</p>
            </div>
            <button
              onClick={openAdminModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 text-[#00FF00] text-xs font-semibold hover:bg-[#00FF00]/20 transition-colors"
            >
              <Plus size={14} />
              Добавить
            </button>
          </div>

          {admins.length === 0 ? (
            <p className="text-[#5E7488] text-sm text-center py-8">Администраторы не добавлены</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {admins.map((admin) => {
                const working = isWorkingNow(admin);
                return (
                  <div key={admin.id} className="bg-[#0A0D14] border border-[#223444] rounded-xl p-4 relative">
                    {/* Delete */}
                    <button
                      onClick={() => removeAdmin(admin.id)}
                      className="absolute top-3 right-3 p-1 rounded text-[#5E7488] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X size={13} />
                    </button>

                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${working ? "bg-[#00FF00]" : "bg-[#5E7488]"}`} />
                      <span className={`text-xs font-medium ${working ? "text-[#00FF00]" : "text-[#5E7488]"}`}>
                        {working ? "Работает сейчас" : "Не работает"}
                      </span>
                    </div>

                    {/* Name */}
                    <p className="text-[#EDF2FA] font-semibold text-sm mb-3 pr-5">{admin.name}</p>

                    {/* Fields */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#5E7488]">Телефон</span>
                        <span className="text-[#8299B4]">{admin.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5E7488]">Телеграм</span>
                        <span className="text-[#8299B4]">{admin.telegram}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5E7488]">Зарплата</span>
                        <span className="text-[#00FF00] font-semibold">{formatCurrency(admin.salary)}</span>
                      </div>
                    </div>

                    {/* Schedule */}
                    <div className="mt-3 pt-3 border-t border-[#1A2535]">
                      <p className="text-[#5E7488] text-xs mb-2">График работы</p>
                      <div className="flex gap-1 mb-2">
                        {DAYS_SHORT.map((d, i) => (
                          <div
                            key={d}
                            className={`flex-1 text-center text-xs py-1 rounded ${
                              admin.scheduleDays[i]
                                ? "bg-[#00FF00]/20 text-[#00FF00] font-semibold"
                                : "bg-[#1A2535] text-[#5E7488]"
                            }`}
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                      <p className="text-[#8299B4] text-xs">
                        {admin.scheduleFrom} — {admin.scheduleTo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Add admin modal ──────────────────────────────────────────────────── */}
      {adminModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAdminModal(false); }}
        >
          <div className="bg-[#0F1622] border border-[#223444] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#1A2535]">
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded text-sm">Добавить администратора</h3>
              <button onClick={() => setAdminModal(false)} className="text-[#5E7488] hover:text-[#EDF2FA] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* ФИО */}
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">ФИО *</label>
                <input
                  type="text"
                  placeholder="Иванова Мария Петровна"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 placeholder-[#3A4A5A] outline-none focus:border-[#00FF00]/50 transition-colors"
                />
              </div>

              {/* Телефон */}
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Телефон *</label>
                <input
                  type="tel"
                  placeholder="+7 900 000-00-00"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 placeholder-[#3A4A5A] outline-none focus:border-[#00FF00]/50 transition-colors"
                />
              </div>

              {/* Телеграм */}
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Телеграм *</label>
                <input
                  type="text"
                  placeholder="@username"
                  value={adminForm.telegram}
                  onChange={(e) => setAdminForm((f) => ({ ...f, telegram: e.target.value }))}
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 placeholder-[#3A4A5A] outline-none focus:border-[#00FF00]/50 transition-colors"
                />
              </div>

              {/* Зарплата */}
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Зарплата, ₽ *</label>
                <input
                  type="number"
                  placeholder="45000"
                  value={adminForm.salary}
                  onChange={(e) => setAdminForm((f) => ({ ...f, salary: e.target.value }))}
                  className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 placeholder-[#3A4A5A] outline-none focus:border-[#00FF00]/50 transition-colors"
                />
              </div>

              {/* График — дни */}
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-2 block">Рабочие дни *</label>
                <div className="flex gap-1.5">
                  {DAYS_SHORT.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleFormDay(i)}
                      className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
                        adminForm.scheduleDays[i]
                          ? "bg-[#00FF00]/15 border-[#00FF00]/30 text-[#00FF00] font-semibold"
                          : "bg-[#0A0D14] border-[#223444] text-[#5E7488] hover:border-[#2C4460]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* График — часы */}
              <div>
                <label className="text-[#8299B4] text-xs font-medium mb-2 block">Часы работы *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={adminForm.scheduleFrom}
                    onChange={(e) => setAdminForm((f) => ({ ...f, scheduleFrom: e.target.value }))}
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
                  />
                  <span className="text-[#5E7488] text-sm">—</span>
                  <input
                    type="time"
                    value={adminForm.scheduleTo}
                    onChange={(e) => setAdminForm((f) => ({ ...f, scheduleTo: e.target.value }))}
                    className="bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none focus:border-[#00FF00]/50 transition-colors"
                  />
                </div>
              </div>

              {adminFormError && (
                <p className="text-red-400 text-xs">{adminFormError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-[#1A2535]">
              <button
                onClick={() => setAdminModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#223444] text-[#8299B4] text-sm font-medium hover:border-[#2C4460] hover:text-[#EDF2FA] transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={submitAdmin}
                className="flex-1 py-2.5 rounded-lg bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
