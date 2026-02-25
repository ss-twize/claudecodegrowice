"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#1e1e1e] bg-[#002322] flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-white font-semibold text-lg">{title}</h1>
        {subtitle && (
          <p className="text-[#555555] text-xs">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-[#141414] border border-[#1e1e1e] rounded-lg px-3 py-2 w-52 hover:border-[#333333] transition-colors">
          <Search size={14} className="text-[#555555]" />
          <input
            type="text"
            placeholder="Поиск..."
            className="bg-transparent text-sm text-white placeholder-[#555555] outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-[#141414] border border-[#1e1e1e] flex items-center justify-center hover:border-[#333333] transition-colors">
          <Bell size={16} className="text-[#888888]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00FF00] rounded-full" />
        </button>

        {/* Date */}
        <div className="text-right">
          <p className="text-white text-sm font-medium">25 февраля 2026</p>
          <p className="text-[#555555] text-xs">Среда</p>
        </div>
      </div>
    </header>
  );
}
