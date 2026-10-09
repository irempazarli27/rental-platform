"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Send, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { askAssistant, getAiStatus, type AssistantMessage } from "@/lib/api/assistant";
import { describeApiError } from "@/lib/api/client";

const STORAGE_KEY = "assistant_conversation";
const MAX_CHARS = 1000;
const SUGGESTIONS = ["Kiralamalarım ne durumda?", "Depozito ne zaman iade edilir?", "Güven puanımı nasıl artırırım?"];

// Readable names for the pages the assistant may point to; ids are never shown.
const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Profilim",
  "/dashboard/rentals": "Kiralamalarım",
  "/dashboard/listings": "İlanlarım",
  "/dashboard/favorites": "Favorilerim",
  "/dashboard/earnings": "Kazançlarım",
  "/dashboard/verification": "Hesap Doğrulama",
  "/dashboard/settings": "Ayarlar",
  "/dashboard/messages": "Mesajlar",
  "/dashboard/notifications": "Bildirimler",
};

function linkLabel(path: string) {
  if (path.startsWith("/dashboard/rentals/")) return "kiralamayı aç";
  return PAGE_LABELS[path] ?? "sayfayı aç";
}

/** Turns site paths the assistant mentions (e.g. /dashboard/rentals/…) into links. */
function withLinks(text: string) {
  return text.split(/(\/dashboard(?:\/[\w-]+)*)/g).map((part, i) =>
    part.startsWith("/dashboard") ? (
      <Link key={i} href={part} className="font-medium text-rose-600 underline-offset-2 hover:underline">
        {linkLabel(part)}
      </Link>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function loadConversation(): AssistantMessage[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AssistantMessage[]) : [];
  } catch {
    return [];
  }
}

export function AssistantWidget() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  // Kept for the browser tab's lifetime, so a page reload doesn't lose the thread.
  const [messages, setMessages] = useState<AssistantMessage[]>(loadConversation);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    getAiStatus()
      .then((s) => !cancelled && setEnabled(s.enabled))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage unavailable: the conversation just won't survive a reload.
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user || !enabled) return null;

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const next = [...messages, { role: "user" as const, text: question }];
    setMessages(next);
    setDraft("");
    setError(null);
    setBusy(true);
    try {
      const { reply } = await askAssistant(next);
      setMessages([...next, { role: "assistant", text: reply }]);
    } catch (err) {
      setError(describeApiError(err, "Asistan şu an yanıt veremiyor."));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Yardım asistanı"
          className="fixed bottom-20 right-4 z-50 flex h-[min(32rem,calc(100dvh-7rem))] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-surface shadow-2xl shadow-stone-900/15"
        >
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-stone-900">Yardım Asistanı</p>
              <p className="text-[11px] text-stone-500">Yapay zeka · hata yapabilir</p>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([]);
                    setError(null);
                  }}
                  className="rounded-full px-2.5 py-1 text-xs text-stone-500 hover:bg-stone-100"
                >
                  Yeni sohbet
                </button>
              )}
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100" aria-label="Kapat">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-stone-600">
                  Merhaba {user.fullName.split(" ")[0]}! Kiralamaların, depozito, teslim süreci ya da güven puanı hakkında sorabilirsin.
                </p>
                <div className="flex flex-col items-start gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-stone-200 px-3 py-1.5 text-left text-xs text-stone-700 hover:bg-stone-100"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user" ? "self-end bg-rose-600 text-white" : "self-start bg-stone-100 text-stone-800"
                }`}
              >
                {m.role === "assistant" ? withLinks(m.text) : m.text}
              </div>
            ))}
            {busy && <div className="self-start rounded-2xl bg-stone-100 px-3 py-2 text-sm text-stone-500">Yazıyor…</div>}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-stone-100 p-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="Bir soru yaz…"
              aria-label="Mesaj"
              className="max-h-28 flex-1 resize-none rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Gönder"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Yardım asistanını kapat" : "Yardım asistanını aç"}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 transition-transform hover:scale-105 hover:bg-rose-700"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </>
  );
}
