"use client";

import { Bell, Search } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#141E2B] bg-[#0A0D14]/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">

      {/* Title */}
      <div>
        <h1 className="text-[#EDF2FA] font-semibold text-base font-unbounded leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[#2C4460] text-xs mt-0.5">{subtitle}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2.5">

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#0F1622] border border-[#1A2535] rounded-lg px-3 py-2 w-48 focus-within:border-[#223444] transition-colors">
          <Search size={13} className="text-[#2C4460] flex-shrink-0" />
          <input
            type="text"
            placeholder="Поиск..."
            className="bg-transparent text-sm text-[#EDF2FA] placeholder-[#2C4460] outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg bg-[#0F1622] border border-[#1A2535] flex items-center justify-center hover:border-[#223444] transition-colors group">
          <Bell size={15} className="text-[#5E7488] group-hover:text-[#8299B4] transition-colors" />
          {/* Online indicator */}
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#00FF00] rounded-full pulse-green" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#141E2B]" />

        {/* Date */}
        <div className="text-right">
          <p className="text-[#EDF2FA] text-sm font-medium leading-none tabular-nums">
            {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="text-[#2C4460] text-xs mt-0.5">
            {new Date().toLocaleDateString("ru-RU", { weekday: "long" })}
          </p>
        </div>
      </div>
    </header>
  );
}
