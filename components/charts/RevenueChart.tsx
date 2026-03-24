"use client";

import { useMemo, useState } from "react";
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
type RangeFocus = "current" | "previous";

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
  const [focus, setFocus] = useState<RangeFocus>("current");
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [focusMenuOpen, setFocusMenuOpen] = useState(false);

  const periodData = useMemo(() => {
    if (range === "week") {
      return focus === "current" ? data.slice(-1) : data.slice(-2, -1);
    }
    if (range === "month") {
      return focus === "current" ? data.slice(-1) : data.slice(-2, -1);
    }
    if (range === "quarter") {
      return focus === "current" ? data.slice(-3) : data.slice(-6, -3);
    }
    if (focus === "previous") {
      const previousYear = data.slice(-24, -12);
      return previousYear.length > 0 ? previousYear : data.slice(-12);
    }
    return data.slice(-12);
  }, [data, range, focus]);

  const selectedRangeLabel = RANGE_OPTIONS.find((option) => option.value === range)?.label ?? RANGE_OPTIONS[3].label;
  const focusOptions: Array<{ value: RangeFocus; label: string }> = useMemo(() => {
    if (range === "week") return [{ value: "current", label: "Текущая неделя" }, { value: "previous", label: "Предыдущая неделя" }];
    if (range === "month") return [{ value: "current", label: "Текущий месяц" }, { value: "previous", label: "Предыдущий месяц" }];
    if (range === "quarter") return [{ value: "current", label: "Текущий квартал" }, { value: "previous", label: "Предыдущий квартал" }];
    return [{ value: "current", label: "Текущий год" }, { value: "previous", label: "Предыдущий год" }];
  }, [range]);
  const selectedFocusLabel = focusOptions.find((option) => option.value === focus)?.label ?? focusOptions[0].label;

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
                setFocusMenuOpen(false);
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
                      setFocus("current");
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
                setFocusMenuOpen((prev) => !prev);
                setRangeMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
              aria-haspopup="menu"
              aria-expanded={focusMenuOpen}
            >
              {selectedFocusLabel}
              <ChevronDown size={14} className={`transition-transform ${focusMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {focusMenuOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[190px] rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
                {focusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFocus(option.value);
                      setFocusMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      focus === option.value
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
      </div>
    </div>
  );
}
