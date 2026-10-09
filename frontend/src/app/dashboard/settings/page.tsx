"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DeleteAccountSection } from "@/components/dashboard/DeleteAccountSection";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export default function SettingsPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-700">
        ← Profilim
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Ayarlar</h1>

      <section className="mt-8 rounded-2xl border border-stone-200 bg-surface p-6">
        <h2 className="text-sm font-semibold text-stone-900">Profil</h2>
        <ProfileForm user={user} onSaved={refreshUser} />
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-surface p-6">
        <h2 className="text-sm font-semibold text-stone-900">Hesap</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="shrink-0 text-stone-500">E-posta</dt>
            <dd className="min-w-0 break-all text-right text-stone-900">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Giriş yöntemi</dt>
            <dd className="text-stone-900">{user.hasPassword ? "E-posta ve şifre" : "Google"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Doğrulama</dt>
            <dd>
              <Link href="/dashboard/verification" className="font-medium text-rose-600 hover:text-rose-700">
                Hesap doğrulama
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      <DeleteAccountSection user={user} />
    </div>
  );
}
