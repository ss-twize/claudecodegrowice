"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Header from "@/components/layout/Header";
import { useClients, type Client } from "@/lib/hooks/useClients";
import { useCampaignLogs } from "@/lib/hooks/useCampaignLogs";
import { formatCurrency } from "@/lib/utils";
import { SortableHeader, useSortable } from "@/components/ui/SortableHeader";
import { useAuth } from "@/lib/auth";
import { callWebhook } from "@/lib/webhooks";
import {
  Send, X, TrendingUp, AlertTriangle, UserPlus, UserX, Smile, CheckCircle2, AlertCircle, Filter, RotateCcw, Search,
} from "lucide-react";

const EMOJIS = [
  "❤️","🔥","✅","⭐","🎁","💰","🎉","💎",
  "✨","👋","💅","🌸","💄","👑","🙌","🤩",
  "😍","🥰","💪","⚡","🎊","🏷️","📅","💌",
  "🌟","🎀","💆","🌺","😊","🙏","👍","🆕",
];

type TelegramFilter = "all" | "yes" | "no";
type BinaryFilter = "all" | "yes" | "no";
type LogicMode = "and" | "or";

type ClientFilterOptions = {
  nameQuery: string;
  phoneQuery: string;
  clientIdQuery: string;
  segment: string;
  gender: string;
  channel: string;
  churnRisk: string;
  telegram: TelegramFilter;
  clientStatus: string;
  visitFrequency: string;
  absenceBucket: string;
  communicationActivity: string;
  source: string;
  branch: string;
  master: string;
  favoriteService: string;
  serviceCategory: string;
  tagsQuery: string;
  notesQuery: string;
  minRevenue: number | null;
  maxRevenue: number | null;
  minAvgCheck: number | null;
  minVisits: number | null;
  lastVisitFrom: string;
  lastVisitTo: string;
  firstVisitFrom: string;
  firstVisitTo: string;
  birthdayFrom: string;
  birthdayTo: string;
  lastMessageFrom: string;
  lastCampaignFrom: string;
  valueCategory: string;
  upcomingAppointment: BinaryFilter;
  cancellations: BinaryFilter;
  noShows: BinaryFilter;
  consentToMarketing: BinaryFilter;
  hasBonuses: BinaryFilter;
  hasSubscription: BinaryFilter;
  hasDeposit: BinaryFilter;
  reactedToOffers: BinaryFilter;
};

type CampaignFilterOptions = {
  lastVisitFrom: string;
  lastVisitTo: string;
  absenceBucket: string;
  clientStatus: string;
  minVisits: number | null;
  minAvgCheck: number | null;
  minRevenue: number | null;
  service: string;
  serviceCategory: string;
  visitedServiceBefore: BinaryFilter;
  master: string;
  branch: string;
  gender: string;
  ageGroup: string;
  birthdaySoon: BinaryFilter;
  cancellations: BinaryFilter;
  noShows: BinaryFilter;
  upcomingAppointment: BinaryFilter;
  channel: string;
  consentToMarketing: BinaryFilter;
  source: string;
  tagsQuery: string;
  activity: string;
  periodFrom: string;
  logicMode: LogicMode;
  excludeUpcoming: boolean;
  excludeWithoutConsent: boolean;
  excludeReacted: boolean;
};

const EMPTY_CLIENT_FILTERS: ClientFilterOptions = {
  nameQuery: "",
  phoneQuery: "",
  clientIdQuery: "",
  segment: "all",
  gender: "all",
  channel: "all",
  churnRisk: "all",
  telegram: "all",
  clientStatus: "all",
  visitFrequency: "all",
  absenceBucket: "all",
  communicationActivity: "all",
  source: "all",
  branch: "all",
  master: "all",
  favoriteService: "all",
  serviceCategory: "all",
  tagsQuery: "",
  notesQuery: "",
  minRevenue: null,
  maxRevenue: null,
  minAvgCheck: null,
  minVisits: null,
  lastVisitFrom: "",
  lastVisitTo: "",
  firstVisitFrom: "",
  firstVisitTo: "",
  birthdayFrom: "",
  birthdayTo: "",
  lastMessageFrom: "",
  lastCampaignFrom: "",
  valueCategory: "all",
  upcomingAppointment: "all",
  cancellations: "all",
  noShows: "all",
  consentToMarketing: "all",
  hasBonuses: "all",
  hasSubscription: "all",
  hasDeposit: "all",
  reactedToOffers: "all",
};

type CampaignPreview = {
  id: string;
  createdAt: string;
  campaignName: string;
  campaignType: string;
  text: string;
  recipientsCount: number;
};

const EMPTY_CAMPAIGN_FILTERS: CampaignFilterOptions = {
  lastVisitFrom: "",
  lastVisitTo: "",
  absenceBucket: "all",
  clientStatus: "all",
  minVisits: null,
  minAvgCheck: null,
  minRevenue: null,
  service: "all",
  serviceCategory: "all",
  visitedServiceBefore: "all",
  master: "all",
  branch: "all",
  gender: "all",
  ageGroup: "all",
  birthdaySoon: "all",
  cancellations: "all",
  noShows: "all",
  upcomingAppointment: "all",
  channel: "Telegram",
  consentToMarketing: "yes",
  source: "all",
  tagsQuery: "",
  activity: "all",
  periodFrom: "",
  logicMode: "and",
  excludeUpcoming: false,
  excludeWithoutConsent: true,
  excludeReacted: false,
};

const SEGMENTS = [
  { key: "all", label: "Все клиенты" },
  { key: "new", label: "Новые" },
  { key: "active", label: "Активные" },
  { key: "atRisk", label: "Под риском" },
  { key: "inactive", label: "Неактивные" },
];

const SEGMENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  new: { bg: "bg-[#00FF00]/10", text: "text-[#00FF00]", border: "border-[#00FF00]/20" },
  active: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  atRisk: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  inactive: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
};

const SEGMENT_LABELS: Record<string, string> = {
  new: "Новый", active: "Активный", atRisk: "Под риском", inactive: "Неактивный",
};

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-[#00FF00]/10", text: "text-[#00FF00]" },
  medium: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  high: { bg: "bg-red-500/10", text: "text-red-400" },
};

const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий",
};

const CLIENT_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  regular: "Постоянный",
  sleeping: "Спящий",
  lost: "Потерянный",
  vip: "VIP",
};

const VISIT_FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Еженедельно",
  biweekly: "Раз в 2 недели",
  monthly: "Раз в месяц",
  rare: "Редко",
};

const VALUE_LABELS: Record<string, string> = {
  high: "Высокая ценность",
  medium: "Средняя ценность",
  low: "Низкая ценность",
};

const COMM_ACTIVITY_LABELS: Record<string, string> = {
  opened: "Открывал",
  replied: "Отвечал",
  ignored: "Игнорировал",
};

function toNumberOrNull(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesBinaryFilter(value: boolean, filter: BinaryFilter): boolean {
  if (filter === "all") return true;
  return filter === "yes" ? value : !value;
}

function matchesText(value: string | null | undefined, query: string): boolean {
  if (!query.trim()) return true;
  return String(value || "").toLowerCase().includes(query.trim().toLowerCase());
}

function matchesDateRange(value: string | null, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (from) {
    const fromDate = new Date(from);
    if (date < fromDate) return false;
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) return false;
  }
  return true;
}

function isBirthdaySoon(value: string | null, days = 30): boolean {
  if (!value) return false;
  const birthday = new Date(value);
  if (Number.isNaN(birthday.getTime())) return false;
  const now = new Date();
  const nextBirthday = new Date(now.getFullYear(), birthday.getMonth(), birthday.getDate());
  if (nextBirthday < now) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  const diff = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= days;
}

function countAppliedClientFilters(filters: ClientFilterOptions): number {
  return Object.entries(filters).filter(([, value]) => {
    if (value === "" || value === null) return false;
    if (value === "all") return false;
    return !(typeof value === "boolean" && value === false);
  }).length;
}

function countAppliedCampaignFilters(filters: CampaignFilterOptions): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "channel") return false;
    if (value === "" || value === null) return false;
    if (value === "all") return false;
    return !(typeof value === "boolean" && value === false);
  }).length;
}

function matchesClientFilter(client: Client, options: ClientFilterOptions): boolean {
  if (!matchesText(client.name, options.nameQuery)) return false;
  if (!matchesText(client.phone, options.phoneQuery)) return false;
  if (!matchesText(client.id, options.clientIdQuery)) return false;
  if (options.segment !== "all" && client.segment !== options.segment) return false;
  if (options.gender !== "all" && client.gender !== options.gender) return false;
  if (options.channel !== "all" && client.communicationChannel !== options.channel) return false;
  if (options.churnRisk !== "all" && client.churnRisk !== options.churnRisk) return false;
  if (options.telegram === "yes" && !client.telegram) return false;
  if (options.telegram === "no" && client.telegram) return false;
  if (options.clientStatus !== "all" && client.clientStatus !== options.clientStatus) return false;
  if (options.visitFrequency !== "all" && client.visitFrequency !== options.visitFrequency) return false;
  if (options.absenceBucket !== "all" && client.absenceBucket !== options.absenceBucket) return false;
  if (options.communicationActivity !== "all" && client.communicationActivity !== options.communicationActivity) return false;
  if (options.source !== "all" && client.source !== options.source) return false;
  if (options.branch !== "all" && client.branch !== options.branch) return false;
  if (options.master !== "all" && client.master !== options.master) return false;
  if (options.favoriteService !== "all" && client.favoriteService !== options.favoriteService) return false;
  if (options.serviceCategory !== "all" && client.serviceCategory !== options.serviceCategory) return false;
  if (options.valueCategory !== "all" && client.valueCategory !== options.valueCategory) return false;
  if (!matchesText(client.tags.join(" "), options.tagsQuery)) return false;
  if (!matchesText(client.notes, options.notesQuery)) return false;
  if (options.minRevenue !== null && client.revenue < options.minRevenue) return false;
  if (options.maxRevenue !== null && client.revenue > options.maxRevenue) return false;
  if (options.minAvgCheck !== null && client.avgCheck < options.minAvgCheck) return false;
  if (options.minVisits !== null && client.visits < options.minVisits) return false;
  if (!matchesDateRange(client.lastVisitAt, options.lastVisitFrom, options.lastVisitTo)) return false;
  if (!matchesDateRange(client.firstVisitAt, options.firstVisitFrom, options.firstVisitTo)) return false;
  if (!matchesDateRange(client.birthday, options.birthdayFrom, options.birthdayTo)) return false;
  if (!matchesDateRange(client.lastMessageAt, options.lastMessageFrom, "")) return false;
  if (!matchesDateRange(client.lastCampaignAt, options.lastCampaignFrom, "")) return false;
  if (!matchesBinaryFilter(client.upcomingAppointment, options.upcomingAppointment)) return false;
  if (!matchesBinaryFilter(client.cancellationCount > 0, options.cancellations)) return false;
  if (!matchesBinaryFilter(client.noShowCount > 0, options.noShows)) return false;
  if (!matchesBinaryFilter(client.consentToMarketing, options.consentToMarketing)) return false;
  if (!matchesBinaryFilter(client.hasBonuses, options.hasBonuses)) return false;
  if (!matchesBinaryFilter(client.hasSubscription, options.hasSubscription)) return false;
  if (!matchesBinaryFilter(client.hasDeposit, options.hasDeposit)) return false;
  if (!matchesBinaryFilter(client.reactedToOffers, options.reactedToOffers)) return false;
  return true;
}

function matchesCampaignFilter(client: Client, options: CampaignFilterOptions): boolean {
  const activeChecks: boolean[] = [];
  const addCheck = (active: boolean, result: boolean) => {
    if (active) activeChecks.push(result);
  };

  addCheck(Boolean(options.lastVisitFrom || options.lastVisitTo), matchesDateRange(client.lastVisitAt, options.lastVisitFrom, options.lastVisitTo));
  addCheck(options.absenceBucket !== "all", client.absenceBucket === options.absenceBucket);
  addCheck(options.clientStatus !== "all", client.clientStatus === options.clientStatus);
  addCheck(options.minVisits !== null, client.visits >= (options.minVisits || 0));
  addCheck(options.minAvgCheck !== null, client.avgCheck >= (options.minAvgCheck || 0));
  addCheck(options.minRevenue !== null, client.revenue >= (options.minRevenue || 0));
  addCheck(options.service !== "all", client.favoriteService === options.service || client.services.includes(options.service));
  addCheck(options.serviceCategory !== "all", client.serviceCategory === options.serviceCategory);
  addCheck(options.visitedServiceBefore !== "all", matchesBinaryFilter(client.services.length > 0, options.visitedServiceBefore));
  addCheck(options.master !== "all", client.master === options.master);
  addCheck(options.branch !== "all", client.branch === options.branch);
  addCheck(options.gender !== "all", client.gender === options.gender);
  addCheck(options.ageGroup !== "all", client.ageGroup === options.ageGroup);
  addCheck(options.birthdaySoon !== "all", matchesBinaryFilter(isBirthdaySoon(client.birthday), options.birthdaySoon));
  addCheck(options.cancellations !== "all", matchesBinaryFilter(client.cancellationCount > 0, options.cancellations));
  addCheck(options.noShows !== "all", matchesBinaryFilter(client.noShowCount > 0, options.noShows));
  addCheck(options.upcomingAppointment !== "all", matchesBinaryFilter(client.upcomingAppointment, options.upcomingAppointment));
  addCheck(options.channel !== "all", client.communicationChannel === options.channel || (options.channel === "Telegram" && Boolean(client.telegram)));
  addCheck(options.consentToMarketing !== "all", matchesBinaryFilter(client.consentToMarketing, options.consentToMarketing));
  addCheck(options.source !== "all", client.source === options.source);
  addCheck(Boolean(options.tagsQuery.trim()), matchesText(client.tags.join(" "), options.tagsQuery));
  addCheck(options.activity !== "all", client.communicationActivity === options.activity);
  addCheck(Boolean(options.periodFrom), matchesDateRange(client.createdAt, options.periodFrom, ""));

  const baseMatch = activeChecks.length === 0
    ? true
    : options.logicMode === "and"
      ? activeChecks.every(Boolean)
      : activeChecks.some(Boolean);

  if (!baseMatch) return false;
  if (options.excludeUpcoming && client.upcomingAppointment) return false;
  if (options.excludeWithoutConsent && !client.consentToMarketing) return false;
  if (options.excludeReacted && client.reactedToOffers) return false;
  return true;
}

function FilterSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#223444] bg-[#0A0D14] p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-[#EDF2FA]">{title}</h4>
        {subtitle && <p className="text-xs text-[#5E7488] mt-1">{subtitle}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

function FilterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`bg-[#111927] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none placeholder-[#5E7488] ${props.className || ""}`} />;
}

function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`bg-[#111927] border border-[#223444] text-[#EDF2FA] text-xs rounded-lg px-3 py-2 outline-none ${props.className || ""}`} />;
}

function ServicesCell({ services }: { services: string[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const first = services[0];
  const rest = services.slice(1);

  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left });
    }
    setOpen(true);
  };

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {first && <span className="text-xs px-2 py-0.5 rounded-md bg-[#1A2535] text-[#8299B4] border border-[#223444]">{first}</span>}
      {rest.length > 0 && (
        <>
          <span
            ref={badgeRef}
            className="text-xs px-2 py-0.5 rounded-md bg-[#1A2535] text-[#00FF00] border border-[#00FF00]/20 cursor-default select-none"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setOpen(false)}
          >
            +{rest.length}
          </span>
          {mounted && open && createPortal(
            <div className="fixed z-[9999] bg-[#141E2B] border border-[#223444] rounded-lg p-2 shadow-xl flex flex-col gap-1 pointer-events-none" style={{ top: pos.top, left: pos.left, transform: "translate(-100%, -100%) translateX(-8px) translateY(-4px)" }}>
              {services.map((s) => <span key={s} className="text-xs px-2 py-0.5 rounded-md bg-[#1A2535] text-[#8299B4] border border-[#223444] whitespace-nowrap">{s}</span>)}
            </div>,
            document.body,
          )}
        </>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const { role } = useAuth();
  const { clients, loading: clientsLoading } = useClients();
  const { logs: campaignLogs, loading: campaignLogsLoading } = useCampaignLogs();

  const [activeSegment, setActiveSegment] = useState("all");
  const [clientFilters, setClientFilters] = useState<ClientFilterOptions>(EMPTY_CLIENT_FILTERS);
  const [showAdvancedClientFilters, setShowAdvancedClientFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("предложение");
  const [campaignQuery, setCampaignQuery] = useState("");
  const [campaignFilters, setCampaignFilters] = useState<CampaignFilterOptions>(EMPTY_CAMPAIGN_FILTERS);
  const [showAdvancedCampaignFilters, setShowAdvancedCampaignFilters] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [campaignToast, setCampaignToast] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);
  const [campaignSending, setCampaignSending] = useState(false);
  const [optimisticCampaigns, setOptimisticCampaigns] = useState<CampaignPreview[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!campaignToast) return;
    const timeoutId = window.setTimeout(() => setCampaignToast(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [campaignToast]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmojiPicker]);

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? msgText.length;
    const end = ta.selectionEnd ?? msgText.length;
    const next = msgText.slice(0, start) + emoji + msgText.slice(end);
    setMsgText(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const channels = useMemo(() => Array.from(new Set(clients.map((c) => c.communicationChannel))).sort(), [clients]);
  const masters = useMemo(() => Array.from(new Set(clients.map((c) => c.master))).sort(), [clients]);
  const branches = useMemo(() => Array.from(new Set(clients.map((c) => c.branch))).sort(), [clients]);
  const services = useMemo(() => Array.from(new Set(clients.flatMap((c) => [c.favoriteService, ...c.services]))).sort(), [clients]);
  const serviceCategories = useMemo(() => Array.from(new Set(clients.map((c) => c.serviceCategory))).sort(), [clients]);
  const sources = useMemo(() => Array.from(new Set(clients.map((c) => c.source))).sort(), [clients]);

  const { sorted, sortCol, sortDir, onSort } = useSortable(clients);

  const filtered = useMemo(() => {
    const options = { ...clientFilters, segment: activeSegment === "all" ? clientFilters.segment : activeSegment };
    return sorted.filter((c) => matchesClientFilter(c, options));
  }, [sorted, clientFilters, activeSegment]);

  const campaignRecipients = useMemo(() => {
    return clients.filter((client) => matchesText(client.name, campaignQuery) || matchesText(client.phone, campaignQuery) || matchesText(client.id, campaignQuery) || matchesText(client.telegram, campaignQuery)).filter((c) => matchesCampaignFilter(c, campaignFilters));
  }, [clients, campaignQuery, campaignFilters]);

  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clients.length };
    clients.forEach((c) => {
      if (c.segment) counts[c.segment] = (counts[c.segment] || 0) + 1;
    });
    return counts;
  }, [clients]);

  const clientFilterCount = countAppliedClientFilters({ ...clientFilters, segment: activeSegment === "all" ? clientFilters.segment : activeSegment });
  const campaignFilterCount = countAppliedCampaignFilters(campaignFilters);

  const campaignSignature = (campaign: Pick<CampaignPreview, "campaignName" | "text" | "recipientsCount" | "campaignType">) => `${campaign.campaignName}::${campaign.text}::${campaign.recipientsCount}::${campaign.campaignType}`;

  useEffect(() => {
    const serverSignatures = new Set(campaignLogs.map((log) => campaignSignature({
      campaignName: log.campaignName,
      text: log.text,
      recipientsCount: log.recipientsCount,
      campaignType: log.campaignType,
    })));

    setOptimisticCampaigns((prev) => prev.filter((campaign) => !serverSignatures.has(campaignSignature(campaign))));
  }, [campaignLogs]);

  const visibleCampaigns = useMemo(() => {
    const mappedLogs: CampaignPreview[] = campaignLogs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt || new Date().toISOString(),
      campaignName: log.campaignName,
      campaignType: log.campaignType,
      text: log.text,
      recipientsCount: log.recipientsCount,
    }));

    return [...optimisticCampaigns, ...mappedLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [campaignLogs, optimisticCampaigns]);

  return (
    <div>
      <Header title="Клиенты и Рассылка" subtitle="База клиентов и маркетинговые кампании" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { key: "new", label: "Новые клиенты", icon: <UserPlus size={16} />, color: "#00FF00" },
            { key: "active", label: "Активные", icon: <TrendingUp size={16} />, color: "#60a5fa" },
            { key: "atRisk", label: "Под риском", icon: <AlertTriangle size={16} />, color: "#fbbf24" },
            { key: "inactive", label: "Неактивные", icon: <UserX size={16} />, color: "#f87171" },
          ].map((s) => (
            <button key={s.key} onClick={() => setActiveSegment(activeSegment === s.key ? "all" : s.key)} className={`text-left bg-[#0F1622] border rounded-xl p-4 transition-all ${activeSegment === s.key ? "border-[#00FF00]/40" : "border-[#223444] hover:border-[#2C4460]"}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.icon}</div>
                <span className="text-2xl font-bold" style={{ color: s.color }}>{segmentCounts[s.key] || 0}</span>
              </div>
              <p className="text-[#8299B4] text-sm">{s.label}</p>
            </button>
          ))}
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#223444] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Клиенты</h3>
              <p className="text-[#5E7488] text-sm">{clientsLoading ? "Загрузка..." : `${filtered.length} из ${clients.length} клиентов`}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="text-xs text-[#8299B4] px-3 py-2 rounded-lg border border-[#223444] bg-[#0A0D14]">Применено фильтров: <span className="text-[#EDF2FA] font-semibold">{clientFilterCount}</span></div>
              <button onClick={() => setClientFilters(EMPTY_CLIENT_FILTERS)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#223444] text-[#8299B4] text-sm hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"><RotateCcw size={14} />Сбросить фильтры</button>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-[#00FF00] text-black font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#ccff33] transition-colors"><Send size={14} />Новая рассылка</button>
            </div>
          </div>

          <div className="px-5 py-4 border-b border-[#1A2535] space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-[#EDF2FA] font-medium flex items-center gap-2"><Search size={14} />Быстрые фильтры базы</h4>
                <p className="text-[#5E7488] text-xs mt-1">Для анализа и навигации по клиентской базе.</p>
              </div>
              <button onClick={() => setShowAdvancedClientFilters((prev) => !prev)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${showAdvancedClientFilters ? "border-[#00FF00]/30 text-[#00FF00] bg-[#00FF00]/5" : "border-[#223444] text-[#8299B4] hover:text-[#EDF2FA] hover:border-[#2C4460]"}`}><Filter size={14} />{showAdvancedClientFilters ? "Скрыть дополнительные" : "Дополнительные фильтры"}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
              <FilterInput value={clientFilters.nameQuery} onChange={(e) => setClientFilters((prev) => ({ ...prev, nameQuery: e.target.value }))} placeholder="Поиск по имени" />
              <FilterInput value={clientFilters.phoneQuery} onChange={(e) => setClientFilters((prev) => ({ ...prev, phoneQuery: e.target.value }))} placeholder="Поиск по телефону" />
              <FilterInput value={clientFilters.clientIdQuery} onChange={(e) => setClientFilters((prev) => ({ ...prev, clientIdQuery: e.target.value }))} placeholder="Поиск по ID клиента" />
              <FilterSelect value={clientFilters.clientStatus} onChange={(e) => setClientFilters((prev) => ({ ...prev, clientStatus: e.target.value }))}><option value="all">Статус клиента: все</option>{Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>
              <FilterSelect value={clientFilters.absenceBucket} onChange={(e) => setClientFilters((prev) => ({ ...prev, absenceBucket: e.target.value }))}><option value="all">Период отсутствия: любой</option><option value="30">Не был 30+ дней</option><option value="60">Не был 60+ дней</option><option value="90+">Не был 90+ дней</option><option value="recent">Был недавно</option></FilterSelect>
              <FilterSelect value={clientFilters.gender} onChange={(e) => setClientFilters((prev) => ({ ...prev, gender: e.target.value }))}><option value="all">Пол: любой</option><option value="Ж">Ж</option><option value="М">М</option></FilterSelect>
              <FilterInput type="date" value={clientFilters.lastVisitFrom} onChange={(e) => setClientFilters((prev) => ({ ...prev, lastVisitFrom: e.target.value }))} placeholder="Дата последнего визита от" />
              <FilterInput type="number" min="0" value={clientFilters.minVisits ?? ""} onChange={(e) => setClientFilters((prev) => ({ ...prev, minVisits: toNumberOrNull(e.target.value) }))} placeholder="Визитов от" />
              <FilterInput type="number" min="0" value={clientFilters.minAvgCheck ?? ""} onChange={(e) => setClientFilters((prev) => ({ ...prev, minAvgCheck: toNumberOrNull(e.target.value) }))} placeholder="Средний чек от" />
              <FilterInput type="number" min="0" value={clientFilters.minRevenue ?? ""} onChange={(e) => setClientFilters((prev) => ({ ...prev, minRevenue: toNumberOrNull(e.target.value) }))} placeholder="Сумма покупок от" />
              <FilterSelect value={clientFilters.channel} onChange={(e) => setClientFilters((prev) => ({ ...prev, channel: e.target.value }))}><option value="all">Канал связи: любой</option>{channels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}</FilterSelect>
              <FilterSelect value={clientFilters.consentToMarketing} onChange={(e) => setClientFilters((prev) => ({ ...prev, consentToMarketing: e.target.value as BinaryFilter }))}><option value="all">Согласие на рассылку: любое</option><option value="yes">Есть согласие</option><option value="no">Без согласия</option></FilterSelect>
            </div>

            <div className="flex items-center gap-0.5 bg-[#0A0D14] border border-[#223444] rounded-lg p-1 overflow-x-auto">
              {SEGMENTS.map(({ key, label }) => (
                <button key={key} onClick={() => setActiveSegment(key)} className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${activeSegment === key ? "bg-[#00FF00] text-black" : "text-[#8299B4] hover:text-[#EDF2FA]"}`}>{label}{segmentCounts[key] !== undefined && <span className="ml-1 opacity-60">({segmentCounts[key]})</span>}</button>
              ))}
            </div>

            {showAdvancedClientFilters && (
              <div className="space-y-3">
                <FilterSection title="Основные данные" subtitle="Анализ базы: кто клиент и в каком он сегменте.">
                  <FilterSelect value={clientFilters.visitFrequency} onChange={(e) => setClientFilters((prev) => ({ ...prev, visitFrequency: e.target.value }))}><option value="all">Частота посещений: любая</option>{Object.entries(VISIT_FREQUENCY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>
                  <FilterInput type="date" value={clientFilters.firstVisitFrom} onChange={(e) => setClientFilters((prev) => ({ ...prev, firstVisitFrom: e.target.value }))} placeholder="Первый визит от" />
                  <FilterInput type="date" value={clientFilters.firstVisitTo} onChange={(e) => setClientFilters((prev) => ({ ...prev, firstVisitTo: e.target.value }))} placeholder="Первый визит до" />
                  <FilterSelect value={clientFilters.valueCategory} onChange={(e) => setClientFilters((prev) => ({ ...prev, valueCategory: e.target.value }))}><option value="all">Категория ценности: любая</option>{Object.entries(VALUE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>
                  <FilterInput value={clientFilters.tagsQuery} onChange={(e) => setClientFilters((prev) => ({ ...prev, tagsQuery: e.target.value }))} placeholder="Теги" />
                  <FilterInput value={clientFilters.notesQuery} onChange={(e) => setClientFilters((prev) => ({ ...prev, notesQuery: e.target.value }))} placeholder="Комментарии и заметки" />
                  <FilterInput type="date" value={clientFilters.birthdayFrom} onChange={(e) => setClientFilters((prev) => ({ ...prev, birthdayFrom: e.target.value }))} placeholder="ДР от" />
                  <FilterInput type="date" value={clientFilters.birthdayTo} onChange={(e) => setClientFilters((prev) => ({ ...prev, birthdayTo: e.target.value }))} placeholder="ДР до" />
                </FilterSection>

                <FilterSection title="Поведение клиента" subtitle="Частота визитов, периоды отсутствия и реакция на предложения.">
                  <FilterInput type="date" value={clientFilters.lastVisitTo} onChange={(e) => setClientFilters((prev) => ({ ...prev, lastVisitTo: e.target.value }))} placeholder="Последний визит до" />
                  <FilterSelect value={clientFilters.churnRisk} onChange={(e) => setClientFilters((prev) => ({ ...prev, churnRisk: e.target.value }))}><option value="all">Риск оттока: любой</option><option value="low">Низкий</option><option value="medium">Средний</option><option value="high">Высокий</option></FilterSelect>
                  <FilterInput type="date" value={clientFilters.lastMessageFrom} onChange={(e) => setClientFilters((prev) => ({ ...prev, lastMessageFrom: e.target.value }))} placeholder="Последнее сообщение от" />
                  <FilterInput type="date" value={clientFilters.lastCampaignFrom} onChange={(e) => setClientFilters((prev) => ({ ...prev, lastCampaignFrom: e.target.value }))} placeholder="Последняя рассылка от" />
                  <FilterSelect value={clientFilters.communicationActivity} onChange={(e) => setClientFilters((prev) => ({ ...prev, communicationActivity: e.target.value }))}><option value="all">Активность в коммуникации: любая</option>{Object.entries(COMM_ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>
                  <FilterSelect value={clientFilters.reactedToOffers} onChange={(e) => setClientFilters((prev) => ({ ...prev, reactedToOffers: e.target.value as BinaryFilter }))}><option value="all">Реакция на прошлые предложения</option><option value="yes">Реагировал</option><option value="no">Не реагировал</option></FilterSelect>
                </FilterSection>

                <FilterSection title="Финансы" subtitle="Сегментация по деньгам, ценности и продуктам лояльности.">
                  <FilterInput type="number" min="0" value={clientFilters.maxRevenue ?? ""} onChange={(e) => setClientFilters((prev) => ({ ...prev, maxRevenue: toNumberOrNull(e.target.value) }))} placeholder="Сумма покупок до" />
                  <FilterSelect value={clientFilters.hasBonuses} onChange={(e) => setClientFilters((prev) => ({ ...prev, hasBonuses: e.target.value as BinaryFilter }))}><option value="all">Наличие бонусов</option><option value="yes">Есть бонусы</option><option value="no">Без бонусов</option></FilterSelect>
                  <FilterSelect value={clientFilters.hasSubscription} onChange={(e) => setClientFilters((prev) => ({ ...prev, hasSubscription: e.target.value as BinaryFilter }))}><option value="all">Наличие абонемента</option><option value="yes">Есть абонемент</option><option value="no">Без абонемента</option></FilterSelect>
                  <FilterSelect value={clientFilters.hasDeposit} onChange={(e) => setClientFilters((prev) => ({ ...prev, hasDeposit: e.target.value as BinaryFilter }))}><option value="all">Наличие депозита</option><option value="yes">Есть депозит</option><option value="no">Без депозита</option></FilterSelect>
                </FilterSection>

                <FilterSection title="Услуги" subtitle="Какие услуги посещал клиент, у какого мастера и в каком филиале.">
                  <FilterSelect value={clientFilters.favoriteService} onChange={(e) => setClientFilters((prev) => ({ ...prev, favoriteService: e.target.value }))}><option value="all">Любимая услуга: любая</option>{services.map((service) => <option key={service} value={service}>{service}</option>)}</FilterSelect>
                  <FilterSelect value={clientFilters.serviceCategory} onChange={(e) => setClientFilters((prev) => ({ ...prev, serviceCategory: e.target.value }))}><option value="all">Категория услуг: любая</option>{serviceCategories.map((category) => <option key={category} value={category}>{category}</option>)}</FilterSelect>
                  <FilterSelect value={clientFilters.master} onChange={(e) => setClientFilters((prev) => ({ ...prev, master: e.target.value }))}><option value="all">Мастер: любой</option>{masters.map((master) => <option key={master} value={master}>{master}</option>)}</FilterSelect>
                  <FilterSelect value={clientFilters.branch} onChange={(e) => setClientFilters((prev) => ({ ...prev, branch: e.target.value }))}><option value="all">Филиал: любой</option>{branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</FilterSelect>
                </FilterSection>

                <FilterSection title="Записи" subtitle="Будущие визиты, отмены и неявки.">
                  <FilterSelect value={clientFilters.upcomingAppointment} onChange={(e) => setClientFilters((prev) => ({ ...prev, upcomingAppointment: e.target.value as BinaryFilter }))}><option value="all">Предстоящая запись</option><option value="yes">Есть будущая запись</option><option value="no">Нет будущей записи</option></FilterSelect>
                  <FilterSelect value={clientFilters.cancellations} onChange={(e) => setClientFilters((prev) => ({ ...prev, cancellations: e.target.value as BinaryFilter }))}><option value="all">История отмен</option><option value="yes">Были отмены</option><option value="no">Без отмен</option></FilterSelect>
                  <FilterSelect value={clientFilters.noShows} onChange={(e) => setClientFilters((prev) => ({ ...prev, noShows: e.target.value as BinaryFilter }))}><option value="all">История неявок</option><option value="yes">Были неявки</option><option value="no">Без неявок</option></FilterSelect>
                </FilterSection>

                <FilterSection title="Маркетинг и коммуникации" subtitle="Канал, источник привлечения и согласие на рассылку.">
                  <FilterSelect value={clientFilters.source} onChange={(e) => setClientFilters((prev) => ({ ...prev, source: e.target.value }))}><option value="all">Источник привлечения: любой</option>{sources.map((source) => <option key={source} value={source}>{source}</option>)}</FilterSelect>
                  <FilterSelect value={clientFilters.telegram} onChange={(e) => setClientFilters((prev) => ({ ...prev, telegram: e.target.value as TelegramFilter }))}><option value="all">Telegram: любой</option><option value="yes">Есть Telegram</option><option value="no">Нет Telegram</option></FilterSelect>
                </FilterSection>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="left-accent-scrollbar max-h-[420px] overflow-y-auto" dir="rtl">
              <div dir="ltr">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-[#0F1622]">
                <tr className="border-b border-[#1A2535]">
                  <SortableHeader label="ФИО" col="name" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Телефон" col="phone" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Пол</th>
                  <SortableHeader label="Выручка" col="revenue" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Средний чек</th>
                  <SortableHeader label="Визиты" col="visits" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Статус клиента</th>
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Филиал</th>
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Мастер</th>
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Канал</th>
                  <SortableHeader label="Статус" col="segment" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <SortableHeader label="Риск оттока" col="churnRisk" sortCol={sortCol} sortDir={sortDir} onSort={onSort} />
                  <th className="text-left text-[#5E7488] text-xs font-medium px-5 py-3 whitespace-nowrap">Услуги</th>
                </tr>
                  </thead>
                  <tbody>
                    {filtered.map((client) => {
                      const segColor = client.segment ? SEGMENT_COLORS[client.segment] : null;
                      const riskColor = client.churnRisk ? RISK_COLORS[client.churnRisk] : null;
                      return (
                        <tr key={client.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors">
                          <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-medium whitespace-nowrap">{client.name}</td>
                          <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.phone}</td>
                          <td className="px-5 py-3.5"><span className={`text-xs font-medium px-2 py-1 rounded-md ${client.gender === "Ж" ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>{client.gender}</span></td>
                          <td className="px-5 py-3.5 text-[#00FF00] text-sm font-semibold whitespace-nowrap">{formatCurrency(client.revenue)}</td>
                          <td className="px-5 py-3.5 text-[#EDF2FA] text-sm whitespace-nowrap">{formatCurrency(client.avgCheck)}</td>
                          <td className="px-5 py-3.5 text-[#EDF2FA] text-sm font-semibold whitespace-nowrap">{client.visits}</td>
                          <td className="px-5 py-3.5"><span className="text-xs font-medium px-2 py-1 rounded-md bg-[#1A2535] text-[#EDF2FA] border border-[#223444]">{CLIENT_STATUS_LABELS[client.clientStatus]}</span></td>
                          <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.branch}</td>
                          <td className="px-5 py-3.5 text-[#8299B4] text-sm whitespace-nowrap">{client.master}</td>
                          <td className="px-5 py-3.5 text-sm whitespace-nowrap"><span className="text-xs px-2 py-1 rounded-md bg-[#1A2535] text-[#8299B4] border border-[#223444]">{client.communicationChannel}</span></td>
                          <td className="px-5 py-3.5">{client.segment && segColor ? <span className={`text-xs font-medium px-2 py-1 rounded-md border ${segColor.bg} ${segColor.text} ${segColor.border}`}>{SEGMENT_LABELS[client.segment]}</span> : <span className="text-[#5E7488]">—</span>}</td>
                          <td className="px-5 py-3.5">{client.churnRisk && riskColor ? <span className={`text-xs font-medium px-2 py-1 rounded-md ${riskColor.bg} ${riskColor.text}`}>{RISK_LABELS[client.churnRisk]}</span> : <span className="text-[#5E7488]">—</span>}</td>
                          <td className="px-5 py-3.5"><ServicesCell services={client.services} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-5">
          <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">Результаты кампаний</h3>
          <p className="text-[#5E7488] text-sm mb-6">История отправленных рассылок</p>
          {campaignLogsLoading && visibleCampaigns.length === 0 ? <div className="flex items-center justify-center py-12 text-[#5E7488] text-sm">Загрузка кампаний...</div> : visibleCampaigns.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-center"><div className="w-14 h-14 rounded-xl bg-[#1A2535] border border-[#223444] flex items-center justify-center mb-4"><Send size={22} className="text-[#5E7488]" /></div><p className="text-[#EDF2FA] font-medium mb-1">Кампаний пока нет</p><p className="text-[#5E7488] text-sm max-w-xs">Запустите первую рассылку, и она сразу появится в таблице ниже.</p></div> : <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-[#1A2535]"><th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Дата запуска</th><th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Название</th><th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 min-w-[320px]">Текст кампании</th><th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Получатели</th><th className="text-left text-[#5E7488] text-xs font-medium px-4 py-3 whitespace-nowrap">Тип</th></tr></thead><tbody>{visibleCampaigns.map((campaign) => <tr key={campaign.id} className="border-b border-[#1A2535] hover:bg-[#141E2B] transition-colors align-top"><td className="px-4 py-3 text-sm text-[#8299B4] whitespace-nowrap">{new Date(campaign.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td><td className="px-4 py-3 text-sm font-medium text-[#EDF2FA] whitespace-nowrap">{campaign.campaignName}</td><td className="px-4 py-3 text-sm text-[#8299B4]">{campaign.text || "Без текста сообщения"}</td><td className="px-4 py-3 text-sm font-semibold text-[#EDF2FA] whitespace-nowrap">{campaign.recipientsCount}</td><td className="px-4 py-3"><span className="inline-flex items-center rounded-md border border-[#223444] bg-[#1A2535] px-2.5 py-1 text-xs font-medium text-[#EDF2FA] capitalize">{campaign.campaignType}</span></td></tr>)}</tbody></table></div>}
        </div>

      </div>

      {campaignToast && <div className="fixed bottom-6 right-6 z-[70] max-w-sm w-[calc(100vw-2rem)] sm:w-full"><div className={`rounded-xl border shadow-2xl px-4 py-3 backdrop-blur-sm ${campaignToast.type === "success" ? "bg-[#0F1622]/95 border-[#00FF00]/30" : "bg-[#0F1622]/95 border-red-500/30"}`}><div className="flex items-start gap-3"><div className={`mt-0.5 ${campaignToast.type === "success" ? "text-[#00FF00]" : "text-red-400"}`}>{campaignToast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}</div><div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#EDF2FA]">{campaignToast.title}</div><div className="text-sm text-[#8299B4] mt-1">{campaignToast.message}</div></div><button onClick={() => setCampaignToast(null)} className="text-[#5E7488] hover:text-[#EDF2FA] transition-colors" aria-label="Закрыть уведомление"><X size={16} /></button></div></div></div>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F1622] border border-[#223444] rounded-xl p-6 w-full max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[#EDF2FA] font-semibold font-unbounded">Новая рассылка</h3>
                <p className="text-[#5E7488] text-sm mt-0.5">Быстрый отбор аудитории под оффер, акцию или персональное сообщение.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-[#5E7488] hover:text-[#EDF2FA] transition-colors ml-4 flex-shrink-0"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Название кампании</label>
                  <FilterInput value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Например: Реактивация потерянных клиентов" className="w-full text-sm py-2.5" />
                </div>
                <div>
                  <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Тип кампании</label>
                  <FilterSelect value={campaignType} onChange={(e) => setCampaignType(e.target.value)} className="w-full text-sm py-2.5"><option value="скидка">Скидка</option><option value="акция">Акция</option><option value="предложение">Предложение</option></FilterSelect>
                </div>
                <div>
                  <label className="text-[#8299B4] text-xs font-medium mb-1.5 block">Логика условий</label>
                  <FilterSelect value={campaignFilters.logicMode} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, logicMode: e.target.value as LogicMode }))} className="w-full text-sm py-2.5"><option value="and">Все условия (И)</option><option value="or">Любое условие (ИЛИ)</option></FilterSelect>
                </div>
              </div>

              <div className="rounded-xl border border-[#223444] bg-[#0A0D14] p-4">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[#EDF2FA]">Быстрые фильтры рассылки</h4>
                    <p className="text-xs text-[#5E7488] mt-1">Только прикладные фильтры для отбора сегмента под сообщение.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <div className="text-xs text-[#8299B4] px-3 py-2 rounded-lg border border-[#223444] bg-[#111927]">Применено фильтров: <span className="text-[#EDF2FA] font-semibold">{campaignFilterCount}</span></div>
                    <button onClick={() => setCampaignFilters(EMPTY_CAMPAIGN_FILTERS)} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#223444] text-[#8299B4] text-sm hover:text-[#EDF2FA] hover:border-[#2C4460] transition-colors"><RotateCcw size={14} />Сбросить</button>
                    <button onClick={() => setShowAdvancedCampaignFilters((prev) => !prev)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${showAdvancedCampaignFilters ? "border-[#00FF00]/30 text-[#00FF00] bg-[#00FF00]/5" : "border-[#223444] text-[#8299B4] hover:text-[#EDF2FA] hover:border-[#2C4460]"}`}><Filter size={14} />{showAdvancedCampaignFilters ? "Скрыть дополнительные" : "Дополнительные фильтры"}</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <FilterInput value={campaignQuery} onChange={(e) => setCampaignQuery(e.target.value)} placeholder="Имя, телефон, ID, @username" />
                  <FilterSelect value={campaignFilters.clientStatus} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, clientStatus: e.target.value }))}><option value="all">Статус клиента: любой</option>{Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>
                  <FilterSelect value={campaignFilters.absenceBucket} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, absenceBucket: e.target.value }))}><option value="all">Период отсутствия</option><option value="30">30+ дней</option><option value="60">60+ дней</option><option value="90+">90+ дней</option></FilterSelect>
                  <FilterInput type="date" value={campaignFilters.lastVisitFrom} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, lastVisitFrom: e.target.value }))} placeholder="Последний визит от" />
                  <FilterInput type="number" min="0" value={campaignFilters.minVisits ?? ""} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, minVisits: toNumberOrNull(e.target.value) }))} placeholder="Визитов от" />
                  <FilterInput type="number" min="0" value={campaignFilters.minAvgCheck ?? ""} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, minAvgCheck: toNumberOrNull(e.target.value) }))} placeholder="Средний чек от" />
                  <FilterInput type="number" min="0" value={campaignFilters.minRevenue ?? ""} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, minRevenue: toNumberOrNull(e.target.value) }))} placeholder="Сумма покупок от" />
                  <FilterSelect value={campaignFilters.service} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, service: e.target.value }))}><option value="all">Конкретная услуга</option>{services.map((service) => <option key={service} value={service}>{service}</option>)}</FilterSelect>
                  <FilterSelect value={campaignFilters.master} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, master: e.target.value }))}><option value="all">Мастер</option>{masters.map((master) => <option key={master} value={master}>{master}</option>)}</FilterSelect>
                  <FilterSelect value={campaignFilters.branch} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, branch: e.target.value }))}><option value="all">Филиал</option>{branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}</FilterSelect>
                </div>

                {showAdvancedCampaignFilters && (
                  <div className="space-y-3 mt-4">
                    <FilterSection title="Условия отбора" subtitle="Соберите аудиторию под конкретный оффер.">
                      <FilterInput type="date" value={campaignFilters.lastVisitTo} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, lastVisitTo: e.target.value }))} placeholder="Последний визит до" />
                      <FilterSelect value={campaignFilters.serviceCategory} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, serviceCategory: e.target.value }))}><option value="all">Категория услуг</option>{serviceCategories.map((category) => <option key={category} value={category}>{category}</option>)}</FilterSelect>
                      <FilterSelect value={campaignFilters.gender} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, gender: e.target.value }))}><option value="all">Пол</option><option value="Ж">Ж</option><option value="М">М</option></FilterSelect>
                      <FilterSelect value={campaignFilters.ageGroup} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, ageGroup: e.target.value }))}><option value="all">Возрастная группа</option><option value="18–24">18–24</option><option value="25–34">25–34</option><option value="35–44">35–44</option><option value="45+">45+</option></FilterSelect>
                      <FilterSelect value={campaignFilters.birthdaySoon} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, birthdaySoon: e.target.value as BinaryFilter }))}><option value="all">Ближайший день рождения</option><option value="yes">День рождения скоро</option><option value="no">Не скоро</option></FilterSelect>
                      <FilterSelect value={campaignFilters.cancellations} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, cancellations: e.target.value as BinaryFilter }))}><option value="all">Отменил запись</option><option value="yes">Были отмены</option><option value="no">Без отмен</option></FilterSelect>
                      <FilterSelect value={campaignFilters.noShows} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, noShows: e.target.value as BinaryFilter }))}><option value="all">Не пришёл</option><option value="yes">Были неявки</option><option value="no">Без неявок</option></FilterSelect>
                      <FilterSelect value={campaignFilters.upcomingAppointment} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, upcomingAppointment: e.target.value as BinaryFilter }))}><option value="all">Есть будущая запись</option><option value="yes">Есть</option><option value="no">Нет</option></FilterSelect>
                      <FilterSelect value={campaignFilters.channel} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, channel: e.target.value }))}><option value="all">Канал отправки</option>{channels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}</FilterSelect>
                      <FilterSelect value={campaignFilters.consentToMarketing} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, consentToMarketing: e.target.value as BinaryFilter }))}><option value="all">Согласие на рассылку</option><option value="yes">Есть согласие</option><option value="no">Без согласия</option></FilterSelect>
                      <FilterSelect value={campaignFilters.source} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, source: e.target.value }))}><option value="all">Источник привлечения</option>{sources.map((source) => <option key={source} value={source}>{source}</option>)}</FilterSelect>
                      <FilterInput value={campaignFilters.tagsQuery} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, tagsQuery: e.target.value }))} placeholder="Теги" />
                      <FilterSelect value={campaignFilters.activity} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, activity: e.target.value }))}><option value="all">Активность в прошлых рассылках</option>{Object.entries(COMM_ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect>
                      <FilterInput type="date" value={campaignFilters.periodFrom} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, periodFrom: e.target.value }))} placeholder="Период, за который брать клиентов" />
                    </FilterSection>

                    <FilterSection title="Исключения" subtitle="Исключите клиентов, которым не нужно отправлять оффер.">
                      <label className="flex items-center gap-2 text-xs text-[#EDF2FA]"><input type="checkbox" checked={campaignFilters.excludeUpcoming} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, excludeUpcoming: e.target.checked }))} /> Исключить клиентов с будущей записью</label>
                      <label className="flex items-center gap-2 text-xs text-[#EDF2FA]"><input type="checkbox" checked={campaignFilters.excludeWithoutConsent} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, excludeWithoutConsent: e.target.checked }))} /> Исключить клиентов без согласия</label>
                      <label className="flex items-center gap-2 text-xs text-[#EDF2FA]"><input type="checkbox" checked={campaignFilters.excludeReacted} onChange={(e) => setCampaignFilters((prev) => ({ ...prev, excludeReacted: e.target.checked }))} /> Исключить уже реагировавших на предложения</label>
                    </FilterSection>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5"><label className="text-[#8299B4] text-xs font-medium">Текст сообщения</label><div className="relative" ref={emojiPickerRef}><button onClick={() => setShowEmojiPicker((v) => !v)} className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs transition-colors ${showEmojiPicker ? "bg-[#00FF00]/10 border-[#00FF00]/30 text-[#00FF00]" : "bg-[#0A0D14] border-[#223444] text-[#8299B4] hover:text-[#EDF2FA]"}`}><Smile size={13} /><span>Эмоджи</span></button>{showEmojiPicker && <div className="absolute right-0 top-full mt-1 z-10 bg-[#141E2B] border border-[#223444] rounded-xl p-2 shadow-2xl w-56"><div className="grid grid-cols-8 gap-0.5">{EMOJIS.map((em) => <button key={em} onClick={() => insertEmoji(em)} className="text-base w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#223444] transition-colors">{em}</button>)}</div></div>}</div></div>
                <textarea ref={textareaRef} rows={4} value={msgText} onChange={(e) => setMsgText(e.target.value)} placeholder="Введите текст рассылки..." className="w-full bg-[#0A0D14] border border-[#223444] text-[#EDF2FA] text-sm rounded-lg px-3 py-2.5 outline-none placeholder-[#5E7488] resize-none" />
                <p className="text-[#5E7488] text-xs mt-1">{msgText.length} символов</p>
              </div>

              <div className="rounded-xl border border-[#223444] bg-[#0A0D14] p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-[#8299B4]">Собранная аудитория</div>
                  <div className="text-2xl font-semibold text-[#00FF00] mt-1">{campaignRecipients.length}</div>
                </div>
                <div className="text-xs text-[#5E7488] max-w-xl">Фильтры рассылки отделены от аналитических фильтров базы: здесь только те параметры, которые помогают быстро собрать сегмент под конкретный оффер.</div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg border border-[#223444] text-[#8299B4] text-sm font-medium hover:border-[#2C4460] transition-colors">Отмена</button>
              <button
                onClick={async () => {
                  setCampaignSending(true);
                  const launchedAt = new Date().toISOString();
                  const result = await callWebhook("rassylka_zapustit", {
                    campaign_name: campaignName || "Новая рассылка",
                    campaign_type: campaignType,
                    transport: campaignFilters.channel === "all" ? "telegram" : campaignFilters.channel.toLowerCase(),
                    text: msgText,
                    filters: campaignFilters,
                    recipients_count: campaignRecipients.length,
                    recipient_ids: campaignRecipients.map((c) => c.id),
                  });
                  setCampaignSending(false);
                  if (result.ok) {
                    setOptimisticCampaigns((prev) => [{
                      id: `local-${launchedAt}`,
                      createdAt: launchedAt,
                      campaignName: campaignName || "Новая рассылка",
                      campaignType,
                      text: msgText,
                      recipientsCount: campaignRecipients.length,
                    }, ...prev]);
                    setCampaignToast({ type: "success", title: "Рассылка отправлена", message: `Кампания «${campaignName || "Новая рассылка"}» запущена на ${campaignRecipients.length} получателей.` });
                    setShowModal(false);
                  } else {
                    setCampaignToast({ type: "error", title: result.configured ? "Ошибка отправки" : "Вебхук не настроен", message: result.error || "Не удалось запустить рассылку. Проверьте настройки интеграции." });
                  }
                }}
                disabled={campaignSending || !msgText.trim() || campaignRecipients.length === 0}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {campaignSending ? "Отправка..." : "Собрать аудиторию и запустить рассылку"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
