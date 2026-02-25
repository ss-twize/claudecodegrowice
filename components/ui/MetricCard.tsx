import { TrendingUp, TrendingDown } from "lucide-react";
import { formatPercent } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accent?: boolean;
}

export default function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  accent = false,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={`rounded-xl border p-5 card-hover ${
        accent
          ? "bg-[#AAFF00] border-[#AAFF00] accent-glow"
          : "bg-[#111111] border-[#1e1e1e]"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            accent ? "bg-black/20" : "bg-[#1a1a1a] border border-[#2a2a2a]"
          }`}
        >
          <span className={accent ? "text-black" : "text-[#AAFF00]"}>
            {icon}
          </span>
        </div>

        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
              accent
                ? "bg-black/15 text-black"
                : isPositive
                ? "bg-[#AAFF00]/10 text-[#AAFF00]"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {formatPercent(Math.abs(change))}
          </div>
        )}
      </div>

      <p
        className={`text-sm font-medium mb-1 ${
          accent ? "text-black/70" : "text-[#888888]"
        }`}
      >
        {title}
      </p>
      <p
        className={`text-2xl font-bold ${
          accent ? "text-black" : "text-white"
        }`}
      >
        {value}
      </p>
      {changeLabel && (
        <p
          className={`text-xs mt-1 ${
            accent ? "text-black/60" : "text-[#555555]"
          }`}
        >
          {changeLabel}
        </p>
      )}
    </div>
  );
}
