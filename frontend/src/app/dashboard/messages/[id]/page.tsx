"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listMessages, sendMessage, type Message } from "@/lib/api/messaging";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const CONTACT_WARNING =
  "Bu mesajda telefon numarası veya e-posta olabilir. Platform dışı iletişim ve ödemeler güvence kapsamı dışındadır. Yine de göndermek istiyor musun?";

export default function MessageThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { messages } = await listMessages(id);
      setMessages(messages);
    } catch {
      setError("Mesajlar yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;

    async function run() {
      await load();
    }
    run();
  }, [authLoading, user, router, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;

    if ((PHONE_PATTERN.test(content) || EMAIL_PATTERN.test(content)) && !window.confirm(CONTACT_WARNING)) {
      return;
    }

    setSending(true);
    setError(null);
    try {
      const { message } = await sendMessage(id, content);
      setMessages((prev) => [...prev, message]);
      setContent("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mesaj gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col px-4 py-4 sm:px-6 sm:py-8">
      <h1 className="text-xl font-semibold text-stone-900">Mesajlar</h1>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-stone-200 bg-white p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-stone-500">Henüz mesaj yok, ilk mesajı sen gönder.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  m.senderId === user?.id ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-900"
                }`}
              >
                <p>{m.content}</p>
                <p className={`mt-1 text-[10px] ${m.senderId === user?.id ? "text-stone-300" : "text-stone-400"}`}>
                  {formatDate(m.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Bir mesaj yaz..."
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
        />
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
