"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  UserCog,
  DollarSign,
  Scissors,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/appointments", label: "Записи", icon: CalendarDays },
  { href: "/staff", label: "Персонал", icon: UserCog },
  { href: "/finances", label: "Финансы", icon: DollarSign },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#111318] border-r border-[#30363d] flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#30363d]">
        <div className="w-8 h-8 rounded-lg bg-[#00FF00] flex items-center justify-center">
          <Scissors size={16} className="text-black" />
        </div>
        <span className="text-[#e6edf3] font-bold text-xl tracking-tight font-unbounded">
          GROW<span className="text-[#00FF00]">ICE</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p className="text-[#7d8590] text-xs font-medium uppercase tracking-wider px-3 mb-3">
          Навигация
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20"
                      : "text-[#9198a1] hover:text-[#e6edf3] hover:bg-[#1c2128]"
                  }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? "text-[#00FF00]" : ""}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00FF00]/20 border border-[#00FF00]/30 flex items-center justify-center">
            <span className="text-[#00FF00] text-xs font-bold">А</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#e6edf3] text-sm font-medium truncate">Администратор</p>
            <p className="text-[#7d8590] text-xs truncate">Салон красоты</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
