"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { AuthUser } from "@/lib/api/auth";

/** The signed-in user's own pages, shared by the desktop dropdown and the phone menu. */
export const PROFILE_LINKS = [
  { href: "/dashboard", label: "Profilim" },
  { href: "/dashboard/listings", label: "İlanlarım" },
  { href: "/dashboard/rentals", label: "Kiralamalarım" },
  { href: "/dashboard/favorites", label: "Favorilerim" },
  { href: "/dashboard/earnings", label: "Kazançlarım" },
  { href: "/dashboard/settings", label: "Ayarlar" },
];

export function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (first + last).toLocaleUpperCase("tr-TR");
}

export function Avatar({ user, size = "h-8 w-8" }: { user: AuthUser; size?: string }) {
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-semibold text-rose-700`}>
      {initials(user.fullName)}
    </span>
  );
}

export function ProfileMenu({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const pathname = usePathname();
  // Remembers which page the menu was opened on, so following one of its links
  // closes it without an effect having to reset state after navigation.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpenOn(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenOn(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const item = "block rounded-lg px-3 py-2 text-sm text-stone-700 hover:bg-stone-100";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profil menüsü"
        className="ml-1 flex items-center gap-1 rounded-full p-1 pr-2 hover:bg-stone-100"
      >
        <Avatar user={user} />
        <ChevronDown className={`h-4 w-4 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-stone-200 bg-surface p-2 shadow-lg shadow-stone-900/10"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar user={user} size="h-9 w-9" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900">{user.fullName}</p>
              <p className="truncate text-xs text-stone-500">{user.email}</p>
            </div>
          </div>
          <div className="my-1 border-t border-stone-100" />
          {PROFILE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} role="menuitem" className={item}>
              {link.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" role="menuitem" className="block rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              Admin Paneli
            </Link>
          )}
          <div className="my-1 border-t border-stone-100" />
          <button type="button" role="menuitem" onClick={onLogout} className={`${item} w-full text-left`}>
            Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}
