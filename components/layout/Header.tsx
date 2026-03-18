"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#141E2B] bg-[#0A0D14]/90 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
      <div>
        <h1 className="text-[#EDF2FA] font-semibold text-base font-unbounded leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[#2C4460] text-xs mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="text-right">
        <p className="text-[#EDF2FA] text-sm font-medium leading-none tabular-nums">
          {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="text-[#2C4460] text-xs mt-0.5">
          {new Date().toLocaleDateString("ru-RU", { weekday: "long" })}
        </p>
      </div>
    </header>
  );
}
