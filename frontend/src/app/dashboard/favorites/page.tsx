"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import { ItemCard } from "@/components/items/ItemCard";

export default function FavoritesPage() {
  const { user, isLoading } = useAuth();
  const { items } = useFavorites();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-700">
        ← Profilim
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Favorilerim</h1>

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">
          Henüz favori ilanın yok. Beğendiğin ilanlardaki kalbe dokunarak buraya ekleyebilirsin.{" "}
          <Link href="/search" className="font-medium text-rose-600 hover:text-rose-700">
            İlanlara göz at
          </Link>
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
