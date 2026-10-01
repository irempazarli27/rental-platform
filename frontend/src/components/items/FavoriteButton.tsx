"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useFavorites } from "@/context/FavoritesContext";
import type { ItemSummary } from "@/lib/api/items";

export function FavoriteButton({ item, className = "" }: { item: ItemSummary; className?: string }) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const router = useRouter();

  // Your own listing isn't something to save for later.
  if (user?.id === item.ownerId) return null;

  const active = isFavorite(item.id);

  function handleClick() {
    if (!user) {
      router.push("/login");
      return;
    }
    toggle(item);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      title={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 shadow-sm backdrop-blur-sm transition-transform hover:scale-110 ${
        active ? "text-rose-600" : "text-stone-600"
      } ${className}`}
    >
      <Heart className="h-4.5 w-4.5" strokeWidth={2} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
