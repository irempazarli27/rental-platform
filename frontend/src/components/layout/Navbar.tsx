"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, MessageCircle, Package, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listNotifications } from "@/lib/api/notifications";
import { listConversations } from "@/lib/api/messaging";
import { Avatar, PROFILE_LINKS, ProfileMenu } from "./ProfileMenu";
import { ThemeToggle } from "./ThemeToggle";

const POLL_INTERVAL_MS = 30_000;

export function Navbar() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  const desktopLink =
    "whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 sm:px-4";
  const mobileLink = "block rounded-xl px-3 py-3 text-base font-medium text-stone-800 active:bg-stone-100";

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-surface/90 backdrop-blur-md">
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
            className={`${desktopLink} ${user ? "hidden sm:inline-block" : ""}`}
          >
            Ara
          </Link>
          {isLoading ? null : user ? (
            <>
              <Link href="/items/new" className={`${desktopLink} hidden sm:inline-block`}>
                İlan Ver
              </Link>
              <Link
                href="/dashboard/messages"
                className="relative rounded-full p-2.5 text-stone-600 hover:bg-stone-100"
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
                className="relative rounded-full p-2.5 text-stone-600 hover:bg-stone-100"
                aria-label="Bildirimler"
              >
                <Bell className="h-5 w-5" strokeWidth={1.75} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <div className="hidden sm:block">
                <ProfileMenu user={user} onLogout={handleLogout} />
              </div>
              <ThemeToggle />
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-full p-2.5 text-stone-700 hover:bg-stone-100 sm:hidden"
                aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={desktopLink}>
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="ml-0.5 whitespace-nowrap rounded-full bg-rose-600 px-2.5 py-2 text-sm font-medium text-white hover:bg-rose-700 sm:ml-1 sm:px-4"
              >
                Kayıt Ol
              </Link>
              <ThemeToggle />
            </>
          )}
        </nav>
      </div>

      {menuOpen && user && (
        <div className="border-t border-stone-200 bg-surface px-3 pb-4 pt-2 sm:hidden">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar user={user} size="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900">{user.fullName}</p>
              <p className="truncate text-xs text-stone-500">{user.email}</p>
            </div>
          </div>
          <Link href="/search" className={mobileLink}>
            Ara
          </Link>
          <Link href="/items/new" className={mobileLink}>
            İlan Ver
          </Link>
          <div className="my-1 border-t border-stone-100" />
          {PROFILE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={mobileLink}>
              {link.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" className="block rounded-xl px-3 py-3 text-base font-medium text-red-600 active:bg-red-50">
              Admin Paneli
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="mt-2 w-full rounded-full bg-stone-900 px-4 py-3 text-base font-medium text-stone-50 active:bg-stone-800"
          >
            Çıkış Yap
          </button>
        </div>
      )}
    </header>
  );
}
