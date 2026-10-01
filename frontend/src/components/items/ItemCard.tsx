import Image from "next/image";
import Link from "next/link";
import type { ItemSummary } from "@/lib/api/items";
import { formatPrice, RISK_LABELS } from "@/lib/format";
import { FavoriteButton } from "./FavoriteButton";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const RISK_BADGE_CLASSES: Record<string, string> = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

export function ItemCard({ item }: { item: ItemSummary }) {
  return (
    // The heart is a sibling of the link, not a child: a button inside an
    // anchor is invalid and would navigate when clicked.
    <div className="relative flex">
      <Link
        href={`/items/${item.id}`}
        className="group flex w-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-surface transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/5"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
          {item.coverImageUrl ? (
            <Image
              src={`${API_URL}${item.coverImageUrl}`}
              alt={item.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-400">Fotoğraf yok</div>
          )}
          {item.status !== "active" && (
            <span className="absolute left-2 top-2 rounded-full bg-stone-900/80 px-2.5 py-1 text-xs font-medium text-stone-50">
              {item.status === "draft" ? "Taslak" : item.status === "paused" ? "Pasif" : ""}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-2">
            <h3 className="line-clamp-2 text-sm font-medium text-stone-900">{item.title}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${RISK_BADGE_CLASSES[item.riskLevel]}`}
            >
              {RISK_LABELS[item.riskLevel]}
            </span>
          </div>
          {(item.city || item.district) && (
            <p className="text-xs text-stone-500">{[item.district, item.city].filter(Boolean).join(", ")}</p>
          )}
          <p className="mt-auto pt-2 text-sm font-semibold text-stone-900">
            {formatPrice(item.dailyPrice, item.currency)} <span className="font-normal text-stone-500">/ gün</span>
          </p>
        </div>
      </Link>
      <FavoriteButton item={item} className="absolute right-2 top-2" />
    </div>
  );
}
