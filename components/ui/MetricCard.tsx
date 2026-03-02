"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { formatPercent } from "@/lib/utils";

export interface MetricTooltipDef {
  formula?: string;
  description: string;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accent?: boolean;
  tooltip?: MetricTooltipDef;
}

function TooltipPopup({ tooltip }: { tooltip: MetricTooltipDef }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const tooltipWidth = 256;
      const left = Math.min(
        Math.max(tooltipWidth / 2, rect.left + rect.width / 2),
        window.innerWidth - tooltipWidth / 2
      );
      setPos({ top: rect.bottom, left });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={ref}
        className="flex-shrink-0 text-[#2C4460] hover:text-[#5E7488] transition-colors"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setOpen(false)}
        tabIndex={-1}
      >
        <HelpCircle size={13} />
      </button>
      {mounted && open && createPortal(
        <div
          className="fixed z-[9999] w-64 bg-[#141E2B] border border-[#223444] rounded-xl shadow-2xl pointer-events-none overflow-hidden"
          style={{ top: pos.top + 8, left: pos.left, transform: "translateX(-50%)" }}
        >
          {tooltip.formula && (
            <div className="px-4 pt-3.5 pb-3 border-b border-[#1A2535]">
              <p className="text-[#2C4460] text-[10px] font-semibold uppercase tracking-[0.1em] mb-2">Формула</p>
              <p className="text-[#00FF00] text-xs font-mono bg-[#0A0D14] rounded-lg px-2.5 py-1.5 leading-relaxed">
                {tooltip.formula}
              </p>
            </div>
          )}
          <div className="px-4 py-3.5">
            <p className="text-[#2C4460] text-[10px] font-semibold uppercase tracking-[0.1em] mb-2">Значение для бизнеса</p>
            <p className="text-[#8299B4] text-xs leading-relaxed">{tooltip.description}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function MetricCard({
  title, value, change, changeLabel, icon, accent = false, tooltip,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={`rounded-xl border p-5 card-hover transition-all duration-150 ${
        accent ? "card-accent" : "bg-[#0F1622] border-[#223444] card-premium"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            accent
              ? "bg-[#00FF00]/[0.1] border border-[#00FF00]/25"
              : "bg-[#141E2B] border border-[#1A2535]"
          }`}
        >
          <span className="text-[#00FF00]">{icon}</span>
        </div>

        {/* Badge + tooltip */}
        <div className="flex items-center gap-1.5">
          {tooltip && <TooltipPopup tooltip={tooltip} />}
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
                isPositive
                  ? "bg-[#00FF00]/[0.08] text-[#00FF00]"
                  : "bg-red-500/[0.08] text-red-400"
              }`}
            >
              {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {formatPercent(Math.abs(change))}
            </div>
          )}
        </div>
      </div>

      {/* Text */}
      <p className="text-xs font-medium mb-1.5 text-[#5E7488] uppercase tracking-[0.06em]">{title}</p>
      <p className={`text-2xl font-bold font-unbounded leading-none ${accent ? "text-[#00FF00]" : "text-[#EDF2FA]"}`}>
        {value}
      </p>
      {changeLabel && (
        <p className="text-xs mt-2 text-[#2C4460]">{changeLabel}</p>
      )}
    </div>
  );
}
