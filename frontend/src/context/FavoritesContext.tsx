"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { addFavorite, listFavorites, removeFavorite } from "@/lib/api/favorites";
import type { ItemSummary } from "@/lib/api/items";

interface FavoritesContextValue {
  /** The signed-in user's favourites, newest first. Empty while signed out. */
  items: ItemSummary[];
  isFavorite: (itemId: string) => boolean;
  /** Flips the heart immediately and rolls back if the server refuses. */
  toggle: (item: ItemSummary) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

// One shared list for the whole app, so every card's heart agrees and a page
// of twenty cards costs a single request rather than twenty.
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState<ItemSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = userId ? await listFavorites().then((r) => r.items).catch(() => []) : [];
      if (!cancelled) setItems(next);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items]);
  const isFavorite = useCallback((itemId: string) => ids.has(itemId), [ids]);

  const toggle = useCallback(
    async (item: ItemSummary) => {
      const wasFavorite = ids.has(item.id);
      const previous = items;
      setItems(wasFavorite ? items.filter((i) => i.id !== item.id) : [item, ...items]);
      try {
        await (wasFavorite ? removeFavorite(item.id) : addFavorite(item.id));
      } catch {
        setItems(previous);
      }
    },
    [ids, items],
  );

  const value = useMemo(() => ({ items, isFavorite, toggle }), [items, isFavorite, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
