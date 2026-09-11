"use client";

import { useEffect, useState } from "react";
import { listFlaggedMessages, type FlaggedMessage } from "@/lib/api/admin";
import { formatDate } from "@/lib/format";

export default function AdminFlaggedMessagesPage() {
  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function run() {
      try {
        const { messages } = await listFlaggedMessages();
        setMessages(messages);
      } finally {
        setIsLoading(false);
      }
    }
    run();
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">İşaretli Mesajlar</h1>
      <p className="mt-1 text-sm text-stone-500">
        Telefon numarası veya e-posta içerebilecek mesajlar burada listelenir. Mesajlar engellenmez, sadece incelemeye
        açılır.
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-stone-500">Yükleniyor...</p>
      ) : messages.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">İşaretli mesaj yok.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-900">{m.senderName ?? "Kullanıcı"}</p>
                <p className="text-xs text-stone-500">{formatDate(m.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm text-stone-700">{m.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
