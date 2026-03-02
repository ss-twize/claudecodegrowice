"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, UserCog, DollarSign,
  Scissors, BarChart3, CreditCard, Settings, Megaphone,
} from "lucide-react";

const mainNav = [
  { href: "/", label: "Дашборд", icon: LayoutDashboard },
  { href: "/clients", label: "Клиенты и Рассылка", icon: Megaphone },
  { href: "/appointments", label: "Записи", icon: CalendarDays },
  { href: "/staff", label: "Персонал", icon: UserCog },
  { href: "/finances", label: "Финансы", icon: DollarSign },
];

const utilNav = [
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/system", label: "Система и оплата", icon: CreditCard },
  { href: "/settings", label: "Настройки", icon: Settings },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? "bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/20"
            : "text-[#9198a1] hover:text-[#e6edf3] hover:bg-[#1c2128]"
        }`}
      >
        <Icon size={18} className={isActive ? "text-[#00FF00]" : ""} />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}

export default function Sidebar() {
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
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        <div>
          <p className="text-[#7d8590] text-xs font-medium uppercase tracking-wider px-3 mb-2">
            Основное
          </p>
          <ul className="space-y-1">
            {mainNav.map((item) => <NavItem key={item.href} {...item} />)}
          </ul>
        </div>

        <div>
          <p className="text-[#7d8590] text-xs font-medium uppercase tracking-wider px-3 mb-2">
            Управление
          </p>
          <ul className="space-y-1">
            {utilNav.map((item) => <NavItem key={item.href} {...item} />)}
          </ul>
        </div>
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
