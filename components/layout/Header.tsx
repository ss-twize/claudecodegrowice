"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-[#e6edf3] font-semibold text-lg">{title}</h1>
        {subtitle && (
          <p className="text-[#7d8590] text-xs">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 w-52 hover:border-[#3d444d] transition-colors">
          <Search size={14} className="text-[#7d8590]" />
          <input
            type="text"
            placeholder="Поиск..."
            className="bg-transparent text-sm text-[#e6edf3] placeholder-[#7d8590] outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center hover:border-[#3d444d] transition-colors">
          <Bell size={16} className="text-[#9198a1]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00E378] rounded-full" />
        </button>

        {/* Date */}
        <div className="text-right">
          <p className="text-[#e6edf3] text-sm font-medium">25 февраля 2026</p>
          <p className="text-[#7d8590] text-xs">Среда</p>
        </div>
      </div>
    </header>
  );
}
