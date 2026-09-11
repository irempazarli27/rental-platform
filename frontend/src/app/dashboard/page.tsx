"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProfileForm } from "@/components/dashboard/ProfileForm";

export default function DashboardPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">Panelim</h1>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-stone-900">Hesap Bilgileri</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Ad Soyad</dt>
              <dd className="text-stone-900">{user.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">E-posta</dt>
              <dd className="text-stone-900">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">E-posta doğrulama</dt>
              <dd className={user.emailVerified ? "text-emerald-600" : "text-amber-600"}>
                {user.emailVerified ? "Doğrulandı" : "Doğrulanmadı"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Puan</dt>
              <dd className="text-stone-900">
                {user.ratingCount > 0
                  ? `${user.ratingAvg.toFixed(1)} / 5 (${user.ratingCount} değerlendirme)`
                  : "Henüz değerlendirme yok"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-stone-900">Profili Düzenle</h2>
          <ProfileForm user={user} onSaved={refreshUser} />
        </section>
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">İlanlarım</h2>
            <Link href="/dashboard/listings" className="text-sm font-medium text-stone-700 underline">
              Tümünü gör
            </Link>
          </div>
          <p className="mt-2 text-sm text-stone-500">İlanlarını buradan yönetebilirsin.</p>
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">Kiralamalarım</h2>
            <Link href="/dashboard/rentals" className="text-sm font-medium text-stone-700 underline">
              Tümünü gör
            </Link>
          </div>
          <p className="mt-2 text-sm text-stone-500">
            Gelen kiralama taleplerini ve kiraladığın eşyaları buradan yönetebilirsin.
          </p>
        </section>
      </div>
    </div>
  );
}
