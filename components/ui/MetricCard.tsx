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

function TooltipPopup({ tooltip, accent }: { tooltip: MetricTooltipDef; accent: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        ref={ref}
        className={`flex-shrink-0 transition-colors ${accent ? "text-black/40 hover:text-black/70" : "text-[#7d8590] hover:text-[#9198a1]"}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setOpen(false)}
        tabIndex={-1}
      >
        <HelpCircle size={13} />
      </button>
      {mounted && open && createPortal(
        <div
          className="fixed z-[9999] w-64 bg-[#1c2128] border border-[#30363d] rounded-xl shadow-2xl pointer-events-none overflow-hidden"
          style={{ top: pos.top, left: pos.left, transform: "translate(-50%, calc(-100% - 10px))" }}
        >
          {tooltip.formula && (
            <div className="px-4 pt-3.5 pb-3 border-b border-[#30363d]">
              <p className="text-[#7d8590] text-xs font-medium uppercase tracking-wider mb-1.5">Формула</p>
              <p className="text-[#00FF00] text-xs font-mono bg-[#0d1117] rounded-lg px-2.5 py-1.5 leading-relaxed">{tooltip.formula}</p>
            </div>
          )}
          <div className="px-4 py-3.5">
            <p className="text-[#7d8590] text-xs font-medium uppercase tracking-wider mb-1.5">Значение для бизнеса</p>
            <p className="text-[#9198a1] text-xs leading-relaxed">{tooltip.description}</p>
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
    <div className={`rounded-xl border p-5 card-hover ${accent ? "bg-[#00FF00] border-[#00FF00] accent-glow" : "bg-[#161b22] border-[#30363d]"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? "bg-black/20" : "bg-[#21262d] border border-[#30363d]"}`}>
          <span className={accent ? "text-black" : "text-[#00FF00]"}>{icon}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {tooltip && <TooltipPopup tooltip={tooltip} accent={accent} />}
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${accent ? "bg-black/15 text-black" : isPositive ? "bg-[#00FF00]/10 text-[#00FF00]" : "bg-red-500/10 text-red-400"}`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {formatPercent(Math.abs(change))}
            </div>
          )}
        </div>
      </div>
      <p className={`text-sm font-medium mb-1 ${accent ? "text-black/70" : "text-[#9198a1]"}`}>{title}</p>
      <p className={`text-2xl font-bold ${accent ? "text-black" : "text-[#e6edf3]"}`}>{value}</p>
      {changeLabel && (
        <p className={`text-xs mt-1 ${accent ? "text-black/60" : "text-[#7d8590]"}`}>{changeLabel}</p>
      )}
    </div>
  );
}
