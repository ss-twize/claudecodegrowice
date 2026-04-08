"use client";

import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ChevronDown } from "lucide-react";
import type { DayMetric, MonthMetric } from "@/lib/hooks/useAnalyticsData";

type RevenueRange = "week" | "month" | "quarter" | "year";

const RANGE_OPTIONS: Array<{ value: RevenueRange; label: string }> = [
  { value: "week", label: "Неделя" },
  { value: "month", label: "Месяц" },
  { value: "quarter", label: "Квартал" },
  { value: "year", label: "Год" },
];

const RU_MONTHS_SHORT = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const RU_MONTHS_FULL = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const RU_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type ChartPoint = { label: string; revenue: number };

function getMonWeekStart(date: Date): Date {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

type DateOption = { value: number; label: string };

function getDateOptions(range: RevenueRange): DateOption[] {
  const now = new Date();
  const fmt = (d: Date) => `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()].toLowerCase()}`;

  if (range === "year") {
    return Array.from({ length: 3 }, (_, i) => ({
      value: i,
      label: String(now.getFullYear() - i),
    }));
  }
  if (range === "quarter") {
    const curQ = Math.floor(now.getMonth() / 3);
    return Array.from({ length: 6 }, (_, i) => {
      const total = now.getFullYear() * 4 + curQ - i;
      const year = Math.floor(total / 4);
      const q = ((total % 4) + 4) % 4 + 1;
      return { value: i, label: `Q${q} ${year}` };
    });
  }
  if (range === "month") {
    return Array.from({ length: 12 }, (_, i) => {
      const total = now.getFullYear() * 12 + now.getMonth() - i;
      const year = Math.floor(total / 12);
      const month = ((total % 12) + 12) % 12;
      return { value: i, label: `${RU_MONTHS_FULL[month]} ${year}` };
    });
  }
  // week
  const ws = getMonWeekStart(now);
  return Array.from({ length: 8 }, (_, i) => {
    const start = new Date(ws);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { value: i, label: `${fmt(start)} — ${fmt(end)}` };
  });
}

function getChartData(
  range: RevenueRange,
  offset: number,
  daily: DayMetric[],
  monthly: MonthMetric[],
): ChartPoint[] {
  const now = new Date();

  if (range === "year") {
    const year = now.getFullYear() - offset;
    return RU_MONTHS_SHORT.map((label, i) => {
      const monthStr = `${year}-${String(i + 1).padStart(2, "0")}`;
      const m = monthly.find(x => x.month.startsWith(monthStr));
      return { label, revenue: m?.revenue ?? 0 };
    });
  }

  if (range === "quarter") {
    const curQ = Math.floor(now.getMonth() / 3);
    const total = now.getFullYear() * 4 + curQ - offset;
    const year = Math.floor(total / 4);
    const quarter = ((total % 4) + 4) % 4;
    return Array.from({ length: 3 }, (_, i) => {
      const mi = quarter * 3 + i;
      const monthStr = `${year}-${String(mi + 1).padStart(2, "0")}`;
      const m = monthly.find(x => x.month.startsWith(monthStr));
      return { label: RU_MONTHS_SHORT[mi], revenue: m?.revenue ?? 0 };
    });
  }

  if (range === "month") {
    const total = now.getFullYear() * 12 + now.getMonth() - offset;
    const year = Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    const days = new Date(year, month + 1, 0).getDate();
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    return Array.from({ length: days }, (_, i) => {
      const dateStr = `${prefix}-${String(i + 1).padStart(2, "0")}`;
      const d = daily.find(x => x.date === dateStr);
      return { label: String(i + 1), revenue: d?.revenue ?? 0 };
    });
  }

  // week
  const ws = getMonWeekStart(now);
  ws.setDate(ws.getDate() - offset * 7);
  return RU_DAYS.map((label, i) => {
    const d = new Date(ws);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dm = daily.find(x => x.date === dateStr);
    return { label, revenue: dm?.revenue ?? 0 };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#141E2B] border border-[#223444] rounded-lg p-3 text-sm">
      <p className="text-[#8299B4] mb-2 font-medium">{label}</p>
      <p className="text-[#00FF00] font-semibold">
        Выручка:{" "}
        {new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(payload[0].value)}
      </p>
    </div>
  );
};

interface RevenueChartProps {
  dailyMetrics?: DayMetric[];
  monthlyMetrics?: MonthMetric[];
}

export default function RevenueChart({ dailyMetrics = [], monthlyMetrics = [] }: RevenueChartProps) {
  const [range, setRange] = useState<RevenueRange>("year");
  const [offset, setOffset] = useState(0);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);

  const dateOptions = useMemo(() => getDateOptions(range), [range]);
  const periodData = useMemo(
    () => getChartData(range, offset, dailyMetrics, monthlyMetrics),
    [range, offset, dailyMetrics, monthlyMetrics],
  );

  const hasData = periodData.some(p => p.revenue > 0);
  const selectedRangeLabel = RANGE_OPTIONS.find(o => o.value === range)?.label ?? "Год";
  const selectedDateLabel = dateOptions.find(o => o.value === offset)?.label ?? "";
  const xInterval = range === "month" ? 4 : 0;

  return (
    <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Выручка за период</h3>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setRangeMenuOpen(p => !p); setDateMenuOpen(false); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
            >
              {selectedRangeLabel}
              <ChevronDown size={14} className={`transition-transform ${rangeMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {rangeMenuOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[140px] rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
                {RANGE_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { setRange(o.value); setOffset(0); setRangeMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      range === o.value ? "text-[#00FF00] bg-[#00FF00]/10" : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setDateMenuOpen(p => !p); setRangeMenuOpen(false); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#223444] bg-[#0A0D14] text-[#8299B4] text-xs hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"
            >
              {selectedDateLabel}
              <ChevronDown size={14} className={`transition-transform ${dateMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {dateMenuOpen && (
              <div className="absolute top-full left-0 mt-1 min-w-[200px] max-h-64 overflow-y-auto rounded-lg border border-[#223444] bg-[#0A0D14] shadow-xl z-20 py-1">
                {dateOptions.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { setOffset(o.value); setDateMenuOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      offset === o.value ? "text-[#00FF00] bg-[#00FF00]/10" : "text-[#8299B4] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-[260px]">
        {!hasData ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[#5E7488] text-sm">Нет данных за выбранный период</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={periodData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF00" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00FF00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2535" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#5E7488", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                interval={xInterval}
              />
              <YAxis
                tick={{ fill: "#5E7488", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${Math.round(v / 1000)}к`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Выручка"
                stroke="#00FF00"
                strokeWidth={2}
                fill="url(#revenueGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#00FF00", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
