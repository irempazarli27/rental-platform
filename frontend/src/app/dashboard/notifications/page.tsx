"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listNotifications, markNotificationRead, type Notification } from "@/lib/api/notifications";
import { formatDate } from "@/lib/format";

function linkFor(notification: Notification): string | null {
  if (notification.relatedEntityType === "rental" && notification.relatedEntityId) {
    return `/dashboard/rentals/${notification.relatedEntityId}`;
  }
  return null;
}

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const { notifications } = await listNotifications();
    setNotifications(notifications);
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

  async function handleClick(notification: Notification) {
    if (!notification.readAt) {
      await markNotificationRead(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    }
  }

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-zinc-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Bildirimler</h1>

      {notifications.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Henüz bir bildirimin yok.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {notifications.map((notification) => {
            const href = linkFor(notification);
            const content = (
              <div
                className={`rounded-lg border p-4 ${
                  notification.readAt ? "border-zinc-200 bg-white" : "border-zinc-300 bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{notification.title}</p>
                  {!notification.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-zinc-900" />}
                </div>
                <p className="mt-1 text-sm text-zinc-600">{notification.body}</p>
                <p className="mt-1 text-xs text-zinc-400">{formatDate(notification.createdAt)}</p>
              </div>
            );

            return href ? (
              <Link key={notification.id} href={href} onClick={() => handleClick(notification)}>
                {content}
              </Link>
            ) : (
              <button key={notification.id} onClick={() => handleClick(notification)} className="text-left">
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
