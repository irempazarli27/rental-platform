"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listConversations, type Conversation } from "@/lib/api/messaging";
import { formatDate } from "@/lib/format";

export default function MessagesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { conversations } = await listConversations();
    setConversations(conversations);
    setIsLoading(false);
  }, []);

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

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">Mesajlar</h1>

      {conversations.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">Henüz bir mesajlaşman yok.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/messages/${c.id}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
                c.unreadCount > 0 ? "border-stone-300 bg-stone-50" : "border-stone-200 bg-surface"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-stone-900">{c.counterparty?.fullName ?? "Kullanıcı"}</p>
                  {c.unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                {c.itemTitle && <p className="text-xs text-stone-400">{c.itemTitle}</p>}
                {c.lastMessage && <p className="mt-1 truncate text-sm text-stone-600">{c.lastMessage.content}</p>}
              </div>
              {c.lastMessage && (
                <span className="shrink-0 text-xs text-stone-400">{formatDate(c.lastMessage.createdAt)}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
