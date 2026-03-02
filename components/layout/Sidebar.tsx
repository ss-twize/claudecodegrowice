"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, UserCog, DollarSign,
  Scissors, BarChart3, CreditCard, Settings, Megaphone, Star,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMapRatings } from "@/lib/hooks/useMapRatings";

const allMainNav = [
  { href: "/",            label: "Главная",          icon: LayoutDashboard, ownerOnly: false },
  { href: "/clients",     label: "Клиенты и Рассылка", icon: Megaphone,     ownerOnly: false },
  { href: "/appointments",label: "Записи",            icon: CalendarDays,   ownerOnly: false },
  { href: "/staff",       label: "Персонал",          icon: UserCog,        ownerOnly: true  },
  { href: "/finances",    label: "Финансы",           icon: DollarSign,     ownerOnly: true  },
];

const allUtilNav = [
  { href: "/analytics", label: "Аналитика",        icon: BarChart3,  ownerOnly: true  },
  { href: "/system",    label: "Система и оплата",  icon: CreditCard, ownerOnly: false },
  { href: "/settings",  label: "Настройки",         icon: Settings,   ownerOnly: false },
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

function RatingBadge({ source, rating, count }: { source: string; rating: number; count: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-[#e6edf3] leading-none">{source === 'яндекс' ? 'Я' : '2Г'}</span>
        </div>
        <span className="text-[#9198a1] text-xs">{source === 'яндекс' ? 'Яндекс' : '2ГИС'}</span>
      </div>
      <div className="flex items-center gap-1">
        <Star size={10} className="text-yellow-400 fill-yellow-400" />
        <span className="text-[#e6edf3] text-xs font-semibold">{rating.toFixed(1)}</span>
        <span className="text-[#7d8590] text-xs">({count})</span>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { role, setRole, isOwner } = useAuth();
  const ratings = useMapRatings();

  const mainNav = allMainNav.filter(item => !item.ownerOnly || isOwner);
  const utilNav = allUtilNav.filter(item => !item.ownerOnly || isOwner);

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

      {/* Bottom: ratings + user */}
      <div className="border-t border-[#30363d]">
        {/* Ratings */}
        {ratings.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-[#21262d] space-y-0.5">
            {ratings.map((r) => (
              <RatingBadge key={r.source} source={r.source} rating={r.rating} count={r.reviews_count} />
            ))}
          </div>
        )}

        {/* User + role switcher */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#00FF00]/20 border border-[#00FF00]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[#00FF00] text-xs font-bold">{isOwner ? 'В' : 'А'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#e6edf3] text-sm font-medium truncate">{isOwner ? 'Владелец' : 'Администратор'}</p>
              <p className="text-[#7d8590] text-xs truncate">Салон красоты</p>
            </div>
          </div>
          {/* Role switcher (demo) */}
          <div className="flex gap-1">
            {(['владелец', 'администратор'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-1 rounded-md text-xs font-medium transition-colors ${
                  role === r
                    ? 'bg-[#00FF00] text-black'
                    : 'bg-[#21262d] text-[#7d8590] hover:text-[#e6edf3]'
                }`}
              >
                {r === 'владелец' ? 'Владелец' : 'Админ'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
