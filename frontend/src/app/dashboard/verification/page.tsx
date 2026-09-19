"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { describeApiError } from "@/lib/api/client";
import {
  confirmEmailCode,
  confirmPhoneCode,
  getVerification,
  sendEmailCode,
  sendPhoneCode,
  verifyId,
  type SentCode,
  type VerificationStatus,
} from "@/lib/api/verification";

const inputClass =
  "w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";
const primaryBtn =
  "rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50";

function StepCard({
  index,
  title,
  points,
  state,
  lockedReason,
  children,
}: {
  index: number;
  title: string;
  points: string;
  state: "done" | "active" | "locked";
  lockedReason?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border bg-white p-5 ${state === "active" ? "border-rose-200 shadow-sm" : "border-stone-200"} ${
        state === "locked" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
            state === "done" ? "bg-emerald-100 text-emerald-700" : state === "active" ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-500"
          }`}
        >
          {state === "done" ? <BadgeCheck className="h-5 w-5" /> : state === "locked" ? <Lock className="h-4 w-4" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          <p className="text-xs text-stone-500">{state === "locked" ? lockedReason : points}</p>
        </div>
        {state === "done" && <span className="text-xs font-medium text-emerald-700">Tamamlandı</span>}
      </div>
      {state === "active" && <div className="mt-4">{children}</div>}
    </section>
  );
}

function CodeStep({
  needsPhone,
  onSend,
  onConfirm,
}: {
  needsPhone?: boolean;
  onSend: (phone: string) => Promise<SentCode>;
  onConfirm: (code: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<SentCode | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      setSent(await onSend(phone));
      setCode("");
    } catch (err) {
      setError(describeApiError(err, "Kod gönderilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onConfirm(code);
    } catch (err) {
      setError(describeApiError(err, "Doğrulanamadı."));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {needsPhone && !sent && (
        <div>
          <label htmlFor="verify-phone" className="block text-xs font-medium text-stone-700">
            Cep telefonu
          </label>
          <input
            id="verify-phone"
            type="tel"
            inputMode="tel"
            placeholder="05XX XXX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      )}

      {!sent ? (
        <button onClick={send} disabled={busy || (needsPhone && !phone.trim())} className={`${primaryBtn} w-fit`}>
          {busy ? "Gönderiliyor..." : "Kod gönder"}
        </button>
      ) : (
        <form onSubmit={confirm} className="flex flex-col gap-3">
          {sent.demoCode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span className="text-xs font-medium uppercase tracking-wide">Demo</span>
              <p>
                Gerçek mesaj gönderilmedi. Doğrulama kodun: <strong className="font-mono text-base tracking-widest">{sent.demoCode}</strong>
              </p>
            </div>
          )}
          <div>
            <label htmlFor="verify-code" className="block text-xs font-medium text-stone-700">
              6 haneli kod ({sent.expiresInMinutes} dk geçerli)
            </label>
            <input
              id="verify-code"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`mt-1 font-mono tracking-widest ${inputClass}`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
              {busy ? "Doğrulanıyor..." : "Doğrula"}
            </button>
            <button type="button" onClick={send} disabled={busy} className="text-xs font-medium text-stone-600 underline">
              Yeni kod iste
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function IdStep({ onDone }: { onDone: () => Promise<void> }) {
  const [tckn, setTckn] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyId(tckn, consent);
      await onDone();
    } catch (err) {
      setError(describeApiError(err, "Kimlik doğrulanamadı."));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <strong>Demo:</strong> Gerçek kimlik numaranı girme. Bu adım sadece numaranın biçimini ve tekilliğini kontrol eder, bir resmi
        kayıtla eşleştirmez. Denemek için geçerli sahte bir numara: <span className="font-mono">10000000146</span>
      </div>
      <div>
        <label htmlFor="verify-tckn" className="block text-xs font-medium text-stone-700">
          T.C. kimlik numarası
        </label>
        <input
          id="verify-tckn"
          inputMode="numeric"
          maxLength={11}
          value={tckn}
          onChange={(e) => setTckn(e.target.value.replace(/\D/g, ""))}
          className={`mt-1 font-mono tracking-widest ${inputClass}`}
        />
      </div>
      <label className="flex items-start gap-2 text-xs text-stone-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
        <span>
          Kimlik numaramın yalnızca doğrulama amacıyla işlenmesine açık rıza veriyorum. Numaram saklanmaz; aynı kimliğin birden fazla hesapta
          kullanılmasını engellemek için yalnızca geri döndürülemez bir özeti tutulur.
        </span>
      </label>
      <button type="submit" disabled={busy || tckn.length !== 11 || !consent} className={`${primaryBtn} w-fit`}>
        {busy ? "Kontrol ediliyor..." : "Kimliğimi doğrula"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export default function VerificationPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  const load = useCallback(async () => {
    const { verification } = await getVerification();
    setStatus(verification);
  }, []);

  const hasUser = !!user;
  useEffect(() => {
    if (hasUser) load().catch(() => {});
  }, [hasUser, load]);

  // A finished step changes the user's trust score, so refresh both views.
  async function afterStep() {
    await load();
    await refreshUser().catch(() => {});
  }

  if (isLoading || !user || !status) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  const stateFor = (done: boolean, prerequisiteDone: boolean): "done" | "active" | "locked" =>
    done ? "done" : prerequisiteDone ? "active" : "locked";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-xs font-medium text-stone-500 hover:text-stone-700">
        ← Panelim
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Hesap Doğrulama</h1>
      <p className="mt-1 text-sm text-stone-600">
        Her adım güven puanını artırır. Yüksek riskli ilanları kiralamak için daha yüksek bir puan gerekir.
      </p>

      {status.demoMode && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Demo modu</p>
          <p className="mt-1 text-xs">
            Henüz gerçek bir e-posta/SMS veya kimlik doğrulama sağlayıcısı bağlı değil. Kodlar mesaj olarak gönderilmez, ekranda gösterilir. Gerçek
            yayında bu adımlar lisanslı bir sağlayıcı üzerinden çalışır.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        <StepCard index={1} title="E-posta doğrulama" points={`+${status.points.email} puan · ${status.email.address}`} state={stateFor(status.email.verified, true)}>
          <CodeStep
            onSend={() => sendEmailCode()}
            onConfirm={async (code) => {
              await confirmEmailCode(code);
              await afterStep();
            }}
          />
        </StepCard>

        <StepCard
          index={2}
          title="Telefon doğrulama"
          points={
            status.phone.verified && status.phone.number
              ? `+${status.points.phone} puan · 0${status.phone.number}`
              : `+${status.points.phone} puan`
          }
          state={stateFor(status.phone.verified, status.email.verified)}
          lockedReason="Önce e-postanı doğrula"
        >
          <CodeStep
            needsPhone
            onSend={(phone) => sendPhoneCode(phone)}
            onConfirm={async (code) => {
              await confirmPhoneCode(code);
              await afterStep();
            }}
          />
        </StepCard>

        <StepCard
          index={3}
          title="Kimlik doğrulama"
          points={`+${status.points.id} puan · en büyük etki`}
          state={stateFor(status.id.verified, status.phone.verified)}
          lockedReason="Önce telefonunu doğrula"
        >
          <IdStep onDone={afterStep} />
        </StepCard>
      </div>
    </div>
  );
}
