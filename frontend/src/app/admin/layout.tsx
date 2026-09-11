"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/admin", label: "Özet" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/items", label: "İlanlar" },
  { href: "/admin/rentals", label: "Kiralamalar" },
  { href: "/admin/disputes", label: "Uyuşmazlıklar" },
  { href: "/admin/messages", label: "İşaretli Mesajlar" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "admin") router.replace("/");
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== "admin") {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-zinc-500">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <p className="pt-4 text-xs font-medium uppercase tracking-wide text-zinc-400">Admin Paneli</p>
          <nav className="mt-3 flex gap-1 overflow-x-auto pb-3">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                    active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
