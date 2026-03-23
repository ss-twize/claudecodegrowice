"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Settings, Scissors, Star, MessageSquareMore,
  Users, Bot, CreditCard, Plug, Shield, BarChart3, DollarSign, UserCog,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMapRatings } from "@/lib/hooks/useMapRatings";

const allMainNav = [
  { href: "/", label: "Главная", icon: LayoutDashboard, ownerOnly: false },
  { href: "/conversations", label: "Обращения", icon: MessageSquareMore, ownerOnly: false },
  { href: "/appointments", label: "Записи", icon: CalendarDays, ownerOnly: false },
  { href: "/clients", label: "Клиенты", icon: Users, ownerOnly: false },
  { href: "/automations", label: "Автоматизации", icon: Bot, ownerOnly: false },
  { href: "/settings", label: "Настройки", icon: Settings, ownerOnly: false },
];

const allUtilNav = [
  { href: "/system#integrations", label: "Интеграции", icon: Plug, ownerOnly: false },
  { href: "/system", label: "Оплата и тариф", icon: CreditCard, ownerOnly: false },
  { href: "/settings#roles", label: "Доступы и роли", icon: Shield, ownerOnly: false },
];

const legacyNav = [
  { href: "/analytics", label: "Аналитика", icon: BarChart3, ownerOnly: true },
  { href: "/finances", label: "Финансы", icon: DollarSign, ownerOnly: true },
  { href: "/staff", label: "Персонал", icon: UserCog, ownerOnly: true },
];

function NavItem({ href, label, icon: Icon, subtle = false }: { href: string; label: string; icon: any; subtle?: boolean }) {
  const pathname = usePathname();
  const baseHref = href.split("#")[0];
  const isActive = pathname === baseHref;
  return (
    <li>
      <Link
        href={href}
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          isActive
            ? "text-[#00FF00] bg-[#00FF00]/[0.07] shadow-[inset_3px_0_0_#00FF00]"
            : subtle
              ? "text-[#425769] hover:text-[#8299B4] hover:bg-[#101723]"
              : "text-[#5E7488] hover:text-[#EDF2FA] hover:bg-[#141E2B]"
        }`}
      >
        <Icon size={17} className={`flex-shrink-0 transition-colors ${isActive ? "text-[#00FF00]" : subtle ? "group-hover:text-[#5E7488]" : "group-hover:text-[#8299B4]"}`} />
        <span className="truncate">{label}</span>
        {subtle && !isActive && <span className="ml-auto text-[10px] uppercase tracking-wide text-[#2C4460]">legacy</span>}
      </Link>
    </li>
  );
}

function NavSectionLabel({ children }: { children: string }) {
  return <p className="text-[#2C4460] text-[10px] font-semibold uppercase tracking-[0.12em] px-3 mb-2 select-none">{children}</p>;
}

function RatingBadge({ source, rating, count }: { source: string; rating: number; count: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-md bg-[#141E2B] border border-[#223444] flex items-center justify-center flex-shrink-0">
          <span className="text-[8px] font-bold text-[#8299B4] leading-none">{source === "яндекс" ? "Я" : "2Г"}</span>
        </div>
        <span className="text-[#5E7488] text-xs">{source === "яндекс" ? "Яндекс" : "2ГИС"}</span>
      </div>
      <div className="flex items-center gap-1">
        <Star size={9} className="text-amber-400 fill-amber-400 flex-shrink-0" />
        <span className="text-[#EDF2FA] text-xs font-semibold tabular-nums">{rating.toFixed(1)}</span>
        <span className="text-[#2C4460] text-xs">({count})</span>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { role, setRole, isOwner } = useAuth();
  const ratings = useMapRatings();

  const mainNav = allMainNav.filter((item) => !item.ownerOnly || isOwner);
  const utilNav = allUtilNav.filter((item) => !item.ownerOnly || isOwner);
  const hiddenLegacy = legacyNav.filter((item) => !item.ownerOnly || isOwner);

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#07090E] border-r border-[#141E2B] flex flex-col z-50">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#141E2B]">
        <div className="w-8 h-8 rounded-lg bg-[#00FF00]/[0.08] border border-[#00FF00]/30 flex items-center justify-center flex-shrink-0">
          <Scissors size={15} className="text-[#00FF00]" />
        </div>
        <div>
          <span className="text-[#EDF2FA] font-bold text-xl tracking-tight font-unbounded leading-none block">GROW<span className="text-[#00FF00]">ICE</span></span>
          <span className="text-[#2C4460] text-[10px]">AI-операции салона</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
        <div>
          <NavSectionLabel>Основное</NavSectionLabel>
          <ul className="space-y-0.5">{mainNav.map((item) => <NavItem key={item.href} {...item} />)}</ul>
        </div>

        <div>
          <NavSectionLabel>Дополнительно</NavSectionLabel>
          <ul className="space-y-0.5">{utilNav.map((item) => <NavItem key={item.href} {...item} />)}</ul>
        </div>

        <div>
          <NavSectionLabel>Future / Legacy</NavSectionLabel>
          <ul className="space-y-0.5">{hiddenLegacy.map((item) => <NavItem key={item.href} {...item} subtle />)}</ul>
        </div>
      </nav>

      <div className="border-t border-[#141E2B]">
        {ratings.length > 0 && (
          <div className="px-4 pt-3 pb-2.5 border-b border-[#141E2B] space-y-1">
            {ratings.map((r) => <RatingBadge key={r.source} source={r.source} rating={r.rating} count={r.reviews_count} />)}
          </div>
        )}

        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#141E2B] border border-[#223444] flex items-center justify-center flex-shrink-0">
              <span className="text-[#00FF00] text-xs font-bold font-unbounded">{isOwner ? "В" : "А"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[#EDF2FA] text-sm font-medium truncate">{isOwner ? "Владелец" : "Администратор"}</p>
              <p className="text-[#2C4460] text-xs truncate">ИИ, записи, возврат, контроль</p>
            </div>
          </div>

          <div className="flex gap-1 bg-[#0F1622] border border-[#1A2535] rounded-lg p-0.5">
            {(["владелец", "администратор"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${role === r ? "bg-[#00FF00] text-black shadow-[0_0_12px_rgba(0,255,0,0.3)]" : "text-[#5E7488] hover:text-[#8299B4]"}`}
              >
                {r === "владелец" ? "Владелец" : "Админ"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
