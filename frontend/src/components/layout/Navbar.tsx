"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, MessageCircle, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listNotifications } from "@/lib/api/notifications";
import { listConversations } from "@/lib/api/messaging";

const POLL_INTERVAL_MS = 30_000;

export function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setUnreadMessages(0);
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const { unreadCount } = await listNotifications();
        if (!cancelled) setUnreadCount(unreadCount);
      } catch {
        // Non-critical — the badge just stays at its previous value.
      }
      try {
        const { unreadCount: unreadMsgs } = await listConversations();
        if (!cancelled) setUnreadMessages(unreadMsgs);
      } catch {
        // Non-critical — the badge just stays at its previous value.
      }
    }

    // Re-check whenever the user navigates (e.g. away from a conversation or
    // the notifications page, both of which mark things read as a side
    // effect) and periodically in case they stay on one page for a while.
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, pathname]);

  async function handleLogout() {
    // A protected page (e.g. /dashboard) redirects to /login on its own once the
    // session clears below. Targeting the same destination here means that race
    // is harmless — whichever navigation wins, the user ends up in the same place.
    router.push("/login");
    await logout();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-base font-semibold tracking-tight text-stone-900 sm:gap-2 sm:text-lg"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-600 text-white sm:h-8 sm:w-8 sm:rounded-xl">
            <Package className="h-4 w-4 sm:h-4.5 sm:w-4.5" strokeWidth={2} />
          </span>
          Paylaşımlık
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1.5">
          <Link
            href="/search"
            className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 sm:px-4"
          >
            Ara
          </Link>
          {isLoading ? null : user ? (
            <>
              <Link
                href="/items/new"
                className="hidden whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 sm:inline sm:px-4"
              >
                İlan Ver
              </Link>
              <Link
                href="/dashboard"
                className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 sm:px-4"
              >
                Panelim
              </Link>
              <Link
                href="/dashboard/messages"
                className="relative rounded-full p-2 text-stone-600 hover:bg-stone-100 sm:p-2.5"
                aria-label="Mesajlar"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
                {unreadMessages > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/notifications"
                className="relative rounded-full p-2 text-stone-600 hover:bg-stone-100 sm:p-2.5"
                aria-label="Bildirimler"
              >
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="hidden whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 sm:inline sm:px-4"
                >
                  Admin Paneli
                </Link>
              )}
              <span className="hidden pl-2 text-sm text-stone-500 lg:inline">{user.fullName}</span>
              <button
                onClick={handleLogout}
                className="ml-0.5 whitespace-nowrap rounded-full bg-stone-900 px-2.5 py-2 text-sm font-medium text-white hover:bg-stone-800 sm:ml-1 sm:px-4"
              >
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 sm:px-4"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="ml-0.5 whitespace-nowrap rounded-full bg-rose-600 px-2.5 py-2 text-sm font-medium text-white hover:bg-rose-700 sm:ml-1 sm:px-4"
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
