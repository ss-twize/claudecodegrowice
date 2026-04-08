"use client";

import Header from "@/components/layout/Header";
import { useAuth } from "@/lib/auth";
import { BarChart2 } from "lucide-react";

export default function FinancesPage() {
  const { isOwner } = useAuth();

  if (!isOwner) {
    return (
      <div>
        <Header title="Финансы" subtitle="Финансовые показатели" />
        <div className="p-6">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-10 text-center">
            <p className="text-[#5E7488] text-sm">Доступно только владельцу</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Финансы" subtitle="Финансовые показатели" />
      <div className="p-6">
        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-10 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-xl bg-[#1A2535] border border-[#223444] flex items-center justify-center">
            <BarChart2 size={24} className="text-[#5E7488]" />
          </div>
          <div>
            <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">В разработке</h3>
            <p className="text-[#5E7488] text-sm max-w-sm">
              Финансовый модуль будет подключён после настройки синхронизации выручки из YClients и таблицы расходов
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
