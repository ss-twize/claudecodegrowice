"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";

type RevenuePoint = { month: string; revenue: number; expenses: number };
type RevenueRange = "week" | "month" | "quarter" | "year";
type DateOption = { value: number; label: string };

const RANGE_OPTIONS: Array<{ value: RevenueRange; label: string }> = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "year", label: "Год" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
        <p className="text-[#8299B4] mb-2 font-medium">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}:{" "}
            {new Intl.NumberFormat("ru-RU", {
              style: "currency",
              currency: "RUB",
              maximumFractionDigits: 0,
            }).format(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const [range, setRange] = useState<RevenueRange>("year");
  const [offset, setOffset] = useState(0);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

  const registrationDate = useMemo(() => {
    // Определяем стартовый месяц на основе самого раннего доступного месяца в данных
    // (fallback: текущий месяц при пустых данных).
    const now = new Date();
    if (data.length === 0) return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(now.getFullYear(), now.getMonth() - (data.length - 1), 1);
  }, [data]);

  const getPeriodSlice = (selectedRange: RevenueRange, selectedOffset: number) => {
    const safeSlice = (start: number, end?: number) => {
      const chunk = data.slice(start, end);
      return chunk.length > 0 ? chunk : [];
    };

    if (selectedRange === "week") {
      const end = data.length - selectedOffset;
      const start = end - 1;
      return safeSlice(start, end);
    }
    if (selectedRange === "month") {
      const end = data.length - selectedOffset;
      const start = end - 1;
      return safeSlice(start, end);
    }
    if (selectedRange === "quarter") {
      const end = data.length - selectedOffset * 3;
      const start = end - 3;
      return safeSlice(start, end);
    }
    const end = data.length - selectedOffset * 12;
    const start = end - 12;
    return safeSlice(start, end);
  };

  const rawDateOptions: DateOption[] = useMemo(() => {
    const now = new Date();
    const isRegistered = registrationDate <= now;
    const formatDay = (date: Date) => date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });

    if (!isRegistered) return [];

    if (range === "week") {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const allowedStart =
        registrationDate.getFullYear() === now.getFullYear() && registrationDate.getMonth() === now.getMonth()
          ? new Date(registrationDate)
          : monthStart;
      return [{ value: 0, label: `${formatDay(allowedStart)} — ${formatDay(now)}` }];
    }

    if (range === "month") {
      return [{
        value: 0,
        label: now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, (s) => s.toUpperCase()),
      }];
    }

    if (range === "quarter") {
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return [{ value: 0, label: `Q${quarter} ${now.getFullYear()}` }];
    }

    return [{ value: 0, label: String(now.getFullYear()) }];
  }, [range, registrationDate]);

  const requiredPoints = range === "year" ? 12 : range === "quarter" ? 3 : 1;
  const dateOptions = rawDateOptions;

  useEffect(() => {
    if (dateOptions.length === 0) return;
    if (!dateOptions.some((option) => option.value === offset)) {
      setOffset(dateOptions[0].value);
    }
  }, [dateOptions, offset]);

  const effectiveOffset = dateOptions.some((option) => option.value === offset)
    ? offset
    : dateOptions[0]?.value ?? 0;
  const periodData = getPeriodSlice(range, effectiveOffset);
  const hasEnoughData = periodData.length >= requiredPoints;

  const selectedRangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label ?? RANGE_OPTIONS[3].label;
  const selectedDateLabel = dateOptions.find((option) => option.value === effectiveOffset)?.label ?? "Нет доступных дат";

  return (
    <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Выручка за период</h3>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setRangeMenuOpen((prev) => !prev);
                setDateMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
              aria-haspopup="menu"
              aria-expanded={rangeMenuOpen}
            >
              {selectedRangeLabel}
              <ChevronDown size={14} className={`transition-transform ${rangeMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {rangeMenuOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[190px] rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRange(option.value);
                      setOffset(0);
                      setRangeMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      range === option.value
                        ? "text-[#00FF00] bg-[#00FF00]/10"
                        : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDateMenuOpen((prev) => !prev);
                setRangeMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
              aria-haspopup="menu"
              aria-expanded={dateMenuOpen}
            >
              {selectedDateLabel}
              <ChevronDown size={14} className={`transition-transform ${dateMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {dateMenuOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[190px] rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
                {dateOptions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[#5E7488]">Нет доступных дат</p>
                ) : (
                  dateOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setOffset(option.value);
                        setDateMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        effectiveOffset === option.value
                          ? "text-[#00FF00] bg-[#00FF00]/10"
                          : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#00FF00]" />
            <span className="text-[#8299B4]">Выручка</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#4a5568]" />
            <span className="text-[#8299B4]">Расходы</span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0" style={{ minHeight: 220 }}>
        {!hasEnoughData ? (
          <div className="h-full min-h-[220px] rounded-lg border border-dashed border-[#223444] bg-[#0A0D14] flex items-center justify-center">
            <p className="text-[#8299B4] text-sm font-medium">Недостаточно данных</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={periodData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expensesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4a5568" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4a5568" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5E7488", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}к`} width={45} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#00FF00" strokeWidth={2} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }} />
              <Area type="monotone" dataKey="expenses" name="Расходы" stroke="#4a5568" strokeWidth={2} fill="url(#expensesGrad)" dot={false} activeDot={{ r: 4, fill: "#4a5568", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
