"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";
import { ORG_UID } from "@/lib/supabase";

type Step = "intro" | "creating" | "auth_qr" | "checking" | "success" | "error";

interface Props {
  channelCode: "whatsapp" | "max";
  channelName: string;
  /** Pass existing connection_id to resume a pending flow */
  existingConnectionId?: string | null;
  /** Resume directly at QR step */
  resumeAtQr?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CHANNEL_ICON: Record<string, string> = { whatsapp: "WA", max: "МХ" };
const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: "#25D366",
  max: "#0088cc",
};

export function ChannelConnectDrawer({
  channelCode,
  channelName,
  existingConnectionId,
  resumeAtQr,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>(
    existingConnectionId ? (resumeAtQr ? "auth_qr" : "creating") : "intro"
  );
  const [connectionId, setConnectionId] = useState<string | null>(
    existingConnectionId ?? null
  );
  const [qr, setQr] = useState<string | null>(null);
  const [qrTimer, setQrTimer] = useState(55);
  const [errorText, setErrorText] = useState("");
  const [mounted, setMounted] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, []);

  // ── Poll status ────────────────────────────────────────────────────────
  const startPolling = useCallback(
    (id: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/channels?action=status&id=${id}`);
          const data = await res.json();
          if (data.status === "pending_auth" && step !== "auth_qr") {
            clearInterval(pollRef.current!);
            fetchQr(id);
          } else if (data.status === "connected") {
            clearInterval(pollRef.current!);
            setStep("checking");
            setTimeout(() => {
              setStep("success");
              onSuccess();
            }, 1500);
          }
        } catch {}
      }, 3000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step]
  );

  // ── Fetch QR ───────────────────────────────────────────────────────────
  const fetchQr = useCallback(
    async (id?: string) => {
      const cid = id ?? connectionId;
      if (!cid) return;
      try {
        const res = await fetch(`/api/channels?action=qr&id=${cid}`);
        const data = await res.json();
        if (data.alreadyLogged) {
          setStep("checking");
          setTimeout(() => { setStep("success"); onSuccess(); }, 1500);
          return;
        }
        if (data.qr) {
          setQr(data.qr);
          setStep("auth_qr");
          setQrTimer(55);
          // QR countdown
          if (qrTimerRef.current) clearInterval(qrTimerRef.current);
          qrTimerRef.current = setInterval(() => {
            setQrTimer((t) => {
              if (t <= 1) {
                clearInterval(qrTimerRef.current!);
                setQr(null);
                return 0;
              }
              return t - 1;
            });
          }, 1000);
          // Continue polling status while showing QR
          startPolling(cid);
        } else {
          setErrorText("Не удалось получить QR-код. Попробуйте ещё раз.");
          setStep("error");
        }
      } catch {
        setErrorText("Ошибка соединения. Проверьте подключение и повторите.");
        setStep("error");
      }
    },
    [connectionId, onSuccess, startPolling]
  );

  // Resume existing flow
  useEffect(() => {
    if (existingConnectionId && resumeAtQr) {
      fetchQr(existingConnectionId);
    } else if (existingConnectionId) {
      startPolling(existingConnectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create connection ──────────────────────────────────────────────────
  const handleCreate = async () => {
    setStep("creating");
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          org_uid: ORG_UID,
          channel_code: channelCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorText(data.error ?? "Не удалось создать подключение");
        setStep("error");
        return;
      }
      setConnectionId(data.connection_id);
      startPolling(data.connection_id);
    } catch {
      setErrorText("Ошибка соединения. Проверьте подключение и повторите.");
      setStep("error");
    }
  };

  // ── Retry ──────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setQr(null);
    setErrorText("");
    setConnectionId(null);
    setStep("intro");
  };

  const accentColor = CHANNEL_COLOR[channelCode];

  if (!mounted) return null;

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-[#0F1622] border-l border-[#223444] z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#223444]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-black"
              style={{ backgroundColor: accentColor }}
            >
              {CHANNEL_ICON[channelCode]}
            </div>
            <div>
              <p className="text-[#EDF2FA] font-semibold font-unbounded text-sm">
                Подключение {channelName}
              </p>
              <p className="text-[#5E7488] text-xs">{stepLabel(step)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#5E7488] hover:text-[#EDF2FA] hover:bg-[#1A2535] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-6 pt-4">
          <StepDots current={stepIndex(step)} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "intro" && (
            <StepIntro channelName={channelName} channelCode={channelCode} accentColor={accentColor} />
          )}
          {step === "creating" && <StepCreating channelName={channelName} />}
          {step === "auth_qr" && (
            <StepQr
              channelCode={channelCode}
              qr={qr}
              timer={qrTimer}
              onRefresh={() => fetchQr()}
            />
          )}
          {step === "checking" && <StepChecking />}
          {step === "success" && <StepSuccess channelName={channelName} />}
          {step === "error" && <StepError text={errorText} onRetry={handleRetry} />}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#223444]">
          {step === "intro" && (
            <button
              onClick={handleCreate}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors bg-[#00FF00] text-black hover:bg-[#ccff33]"
            >
              Продолжить
              <ChevronRight size={16} />
            </button>
          )}
          {step === "auth_qr" && (
            <div className="flex gap-2">
              <button
                onClick={() => fetchQr()}
                className="flex-1 py-2.5 rounded-xl border border-[#223444] text-[#8299B4] text-sm font-medium hover:border-[#2C4460] hover:text-[#EDF2FA] transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} />
                Обновить
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#223444] text-[#8299B4] text-sm font-medium hover:border-[#2C4460] hover:text-[#EDF2FA] transition-colors"
              >
                Закрыть
              </button>
            </div>
          )}
          {(step === "creating" || step === "checking") && (
            <button
              disabled
              className="w-full py-3 rounded-xl bg-[#1A2535] text-[#5E7488] text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} className="animate-spin" />
              Подождите...
            </button>
          )}
          {step === "success" && (
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              Готово
            </button>
          )}
          {step === "error" && (
            <div className="flex gap-2">
              <button
                onClick={handleRetry}
                className="flex-1 py-2.5 rounded-xl bg-[#00FF00] text-black text-sm font-semibold hover:bg-[#ccff33] transition-colors"
              >
                Повторить
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-[#223444] text-[#8299B4] text-sm font-medium hover:border-[#2C4460] transition-colors"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}

// ── Step label ───────────────────────────────────────────────────────────────

function stepLabel(step: Step): string {
  const map: Record<Step, string> = {
    intro: "Шаг 1 — Информация",
    creating: "Шаг 2 — Создаём подключение",
    auth_qr: "Шаг 3 — Авторизация",
    checking: "Шаг 4 — Проверка",
    success: "Готово",
    error: "Ошибка",
  };
  return map[step];
}

function stepIndex(step: Step): number {
  const order: Step[] = ["intro", "creating", "auth_qr", "checking", "success"];
  return order.indexOf(step);
}

// ── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i < current
              ? "bg-[#00FF00] w-6"
              : i === current
              ? "bg-[#00FF00] w-8"
              : "bg-[#1A2535] w-4"
          }`}
        />
      ))}
    </div>
  );
}

// ── Step: Intro ──────────────────────────────────────────────────────────────

function StepIntro({
  channelName,
  channelCode,
  accentColor,
}: {
  channelName: string;
  channelCode: string;
  accentColor: string;
}) {
  const items = channelCode === "whatsapp"
    ? [
        "Система создаст защищённое подключение к вашему аккаунту",
        "Откройте WhatsApp на телефоне и отсканируйте QR-код",
        "Аккаунт начнёт принимать и отправлять сообщения автоматически",
      ]
    : [
        "Система создаст защищённое подключение к вашему аккаунту Max",
        "Откройте приложение Max и подтвердите вход с помощью QR",
        "Аккаунт начнёт принимать и отправлять сообщения автоматически",
      ];

  return (
    <div className="space-y-5">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-black mx-auto"
        style={{ backgroundColor: accentColor }}
      >
        {CHANNEL_ICON[channelCode]}
      </div>
      <div className="text-center">
        <h3 className="text-[#EDF2FA] font-semibold text-lg font-unbounded mb-2">
          Подключение {channelName}
        </h3>
        <p className="text-[#8299B4] text-sm leading-relaxed">
          Займёт около 1–2 минут. Телефон с аккаунтом должен быть рядом.
        </p>
      </div>
      <div className="space-y-3">
        {items.map((text, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#00FF00] text-xs font-bold">{i + 1}</span>
            </div>
            <p className="text-[#8299B4] text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#0A0D14] border border-[#223444] rounded-xl p-4">
        <p className="text-[#5E7488] text-xs leading-relaxed">
          Подключение защищено. Ваши данные и переписка не передаются третьим лицам.
        </p>
      </div>
    </div>
  );
}

// ── Step: Creating ───────────────────────────────────────────────────────────

function StepCreating({ channelName }: { channelName: string }) {
  const steps = [
    { label: "Создаём защищённый канал", done: true },
    { label: "Подготавливаем аккаунт", done: false },
    { label: "Ожидаем готовности", done: false },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center mx-auto mb-4">
          <RefreshCw size={28} className="text-[#00FF00] animate-spin" />
        </div>
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-2">
          Создаём подключение
        </h3>
        <p className="text-[#8299B4] text-sm">
          Подготавливаем {channelName} к работе. Это займёт 30–60 секунд.
        </p>
      </div>
      <div className="space-y-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 bg-[#0A0D14] border border-[#223444] rounded-lg px-4 py-3"
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                s.done
                  ? "bg-[#00FF00]/20 border border-[#00FF00]/30"
                  : "bg-[#1A2535] border border-[#223444]"
              }`}
            >
              {s.done ? (
                <CheckCircle2 size={12} className="text-[#00FF00]" />
              ) : (
                <RefreshCw size={10} className="text-[#5E7488] animate-spin" />
              )}
            </div>
            <span
              className={`text-sm ${s.done ? "text-[#EDF2FA]" : "text-[#5E7488]"}`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step: QR ─────────────────────────────────────────────────────────────────

function StepQr({
  channelCode,
  qr,
  timer,
  onRefresh,
}: {
  channelCode: string;
  qr: string | null;
  timer: number;
  onRefresh: () => void;
}) {
  const instruction =
    channelCode === "whatsapp"
      ? "Откройте WhatsApp → Связанные устройства → Привязать устройство → Отсканируйте QR"
      : "Откройте Max → Настройки → Привязать устройство → Отсканируйте QR";

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">
          Отсканируйте QR-код
        </h3>
        <p className="text-[#8299B4] text-sm">{instruction}</p>
      </div>

      {/* QR block */}
      <div className="flex justify-center">
        <div className="relative bg-white rounded-2xl p-4 w-52 h-52 flex items-center justify-center">
          {qr ? (
            <img
              src={`data:image/png;base64,${qr}`}
              alt="QR-код для авторизации"
              className="w-full h-full object-contain rounded-lg"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw size={28} className="text-gray-400 animate-spin" />
              <span className="text-gray-500 text-xs">Загружаем QR...</span>
            </div>
          )}

          {/* Expired overlay */}
          {qr && timer === 0 && (
            <div className="absolute inset-0 bg-white/90 rounded-2xl flex flex-col items-center justify-center gap-2">
              <AlertTriangle size={24} className="text-yellow-500" />
              <p className="text-gray-700 text-sm font-medium">QR устарел</p>
              <button
                onClick={onRefresh}
                className="text-xs text-blue-600 underline"
              >
                Обновить
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Timer */}
      {qr && timer > 0 && (
        <div className="flex items-center justify-center gap-2">
          <div
            className={`text-sm font-mono font-bold ${
              timer < 15 ? "text-yellow-400" : "text-[#00FF00]"
            }`}
          >
            0:{String(timer).padStart(2, "0")}
          </div>
          <span className="text-[#5E7488] text-xs">до обновления</span>
        </div>
      )}

      <div className="bg-[#0A0D14] border border-[#223444] rounded-xl p-4">
        <p className="text-[#5E7488] text-xs leading-relaxed text-center">
          Держите телефон рядом. После сканирования страница обновится автоматически.
        </p>
      </div>
    </div>
  );
}

// ── Step: Checking ───────────────────────────────────────────────────────────

function StepChecking() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#00FF00]/10 border border-[#00FF00]/20 flex items-center justify-center mx-auto">
        <RefreshCw size={28} className="text-[#00FF00] animate-spin" />
      </div>
      <div>
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-1">
          Проверяем подключение
        </h3>
        <p className="text-[#8299B4] text-sm">Подтверждаем авторизацию...</p>
      </div>
    </div>
  );
}

// ── Step: Success ────────────────────────────────────────────────────────────

function StepSuccess({ channelName }: { channelName: string }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#00FF00]/20 border border-[#00FF00]/30 flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} className="text-[#00FF00]" />
      </div>
      <div>
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-2">
          Аккаунт подключён
        </h3>
        <p className="text-[#8299B4] text-sm leading-relaxed">
          {channelName} готов к работе. Входящие сообщения начнут обрабатываться автоматически.
        </p>
      </div>
      <div className="bg-[#00FF00]/5 border border-[#00FF00]/20 rounded-xl p-4">
        <p className="text-[#00FF00] text-xs font-medium">
          Не забудьте включить канал в настройках, если он был отключён.
        </p>
      </div>
    </div>
  );
}

// ── Step: Error ──────────────────────────────────────────────────────────────

function StepError({ text, onRetry }: { text: string; onRetry: () => void }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <div>
        <h3 className="text-[#EDF2FA] font-semibold font-unbounded mb-2">
          Ошибка подключения
        </h3>
        <p className="text-[#8299B4] text-sm leading-relaxed">
          {text || "Произошла ошибка. Попробуйте ещё раз."}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="text-[#00FF00] text-sm font-medium hover:text-[#ccff33] transition-colors underline"
      >
        Попробовать ещё раз
      </button>
    </div>
  );
}
