"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  deleteItem,
  deleteItemImage,
  getItem,
  listAvailability,
  uploadItemImages,
  type AvailabilityBlock,
  type ItemDetail,
} from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { CONDITION_LABELS, DELIVERY_LABELS, RISK_LABELS, formatDate, formatPrice } from "@/lib/format";
import { FavoriteButton } from "@/components/items/FavoriteButton";
import { RentalRequestForm } from "@/components/items/RentalRequestForm";
import { ItemReviews } from "@/components/reviews/ItemReviews";
import { startConversation } from "@/lib/api/messaging";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ item }, { blocks }] = await Promise.all([getItem(id), listAvailability(id)]);
      setItem(item);
      setBlocks(blocks);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setActionError("İlan yüklenemedi.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Wait for AuthContext to finish restoring the access token first — otherwise
    // an owner's own draft/paused item can briefly 404 as if requested anonymously,
    // since the backend hides non-active items from anyone but the owner.
    if (authLoading) return;
    async function run() {
      await load();
    }
    run();
  }, [authLoading, load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !item) return;
    setIsUploading(true);
    setActionError(null);
    try {
      await uploadItemImages(item.id, Array.from(files));
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Görsel yüklenemedi.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!item) return;
    try {
      await deleteItemImage(item.id, imageId);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Görsel silinemedi.");
    }
  }

  async function handleDeleteItem() {
    if (!item) return;
    if (!window.confirm("Bu ilanı silmek istediğine emin misin?")) return;
    try {
      await deleteItem(item.id);
      router.push("/dashboard/listings");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "İlan silinemedi.");
    }
  }

  async function handleMessage(recipientId: string, itemId: string) {
    if (!user) {
      router.push("/login");
      return;
    }
    setMessaging(true);
    setActionError(null);
    try {
      const { conversation } = await startConversation({ recipientId, itemId });
      router.push(`/dashboard/messages/${conversation.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Mesajlaşma başlatılamadı.");
      setMessaging(false);
    }
  }

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  if (notFound || !item) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-sm text-stone-600">İlan bulunamadı.</p>
        <Link href="/search" className="mt-2 inline-block text-sm font-medium text-rose-600 hover:text-rose-700">
          Aramaya dön
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === item.ownerId;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      {item.status !== "active" && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Bu ilan şu anda {item.status === "draft" ? "taslak" : item.status === "paused" ? "pasif" : "silinmiş"}{" "}
          durumda, sadece sen görebiliyorsun.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          {item.images.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {item.images.map((image) => (
                <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
                  <Image src={`${API_URL}${image.url}`} alt={item.title} fill unoptimized className="object-cover" />
                  {isOwner && (
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="absolute right-2 top-2 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-surface"
                    >
                      Sil
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-400">
              Henüz fotoğraf eklenmemiş
            </div>
          )}

          {isOwner && (
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => handleUpload(e.target.files)}
                disabled={isUploading}
                className="w-full text-sm text-stone-600"
              />
              {isUploading && <p className="mt-1 text-xs text-stone-500">Yükleniyor...</p>}
            </div>
          )}

          <div className="mt-6 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold text-stone-900">{item.title}</h1>
            <FavoriteButton item={item} className="shrink-0 border border-stone-200" />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
              {CONDITION_LABELS[item.condition]}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
              {RISK_LABELS[item.riskLevel]}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
              {DELIVERY_LABELS[item.deliveryMethod]}
            </span>
            {item.category && (
              <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-700">
                {item.category.name}
              </span>
            )}
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm text-stone-700">{item.description}</p>

          {(item.brand || item.model) && (
            <p className="mt-2 text-sm text-stone-500">
              {[item.brand, item.model].filter(Boolean).join(" ")}
            </p>
          )}

          {item.accessories.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-stone-900">Aksesuarlar</h2>
              <ul className="mt-2 list-inside list-disc text-sm text-stone-600">
                {item.accessories.map((a) => (
                  <li key={a.id}>
                    {a.name} {a.quantity > 1 ? `× ${a.quantity}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {blocks.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-stone-900">Müsait Olmayan Tarihler</h2>
              <ul className="mt-2 space-y-1 text-sm text-stone-600">
                {blocks.map((b) => (
                  <li key={b.id}>
                    {formatDate(b.start_date)} – {formatDate(b.end_date)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <ItemReviews itemId={item.id} />
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-stone-200 bg-surface p-5 shadow-sm shadow-stone-900/5">
            <p className="text-2xl font-semibold text-stone-900">
              {formatPrice(item.dailyPrice, item.currency)}
              <span className="text-sm font-normal text-stone-500"> / gün</span>
            </p>
            {item.weeklyPrice && (
              <p className="text-sm text-stone-500">{formatPrice(item.weeklyPrice, item.currency)} / hafta</p>
            )}
            <p className="mt-1 text-sm text-stone-500">
              Güvence bedeli: {formatPrice(item.depositAmount, item.currency)}
            </p>

            {(item.city || item.district) && (
              <p className="mt-3 text-sm text-stone-600">📍 {[item.district, item.city].filter(Boolean).join(", ")}</p>
            )}

            {item.owner && (
              <div className="mt-4 flex items-center gap-3 border-t border-stone-100 pt-4">
                {item.owner.avatarUrl ? (
                  <Image
                    src={item.owner.avatarUrl}
                    alt={item.owner.fullName}
                    width={40}
                    height={40}
                    unoptimized
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-700">
                    {item.owner.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <Link href={`/profile/${item.owner.id}`} className="text-sm font-medium text-stone-900 hover:underline">
                    {item.owner.fullName}
                  </Link>
                  {item.owner.ratingCount > 0 ? (
                    <Link href={`/profile/${item.owner.id}#degerlendirmeler`} className="block text-xs text-stone-500 hover:underline">
                      ⭐ {item.owner.ratingAvg.toFixed(1)} ({item.owner.ratingCount} değerlendirme)
                    </Link>
                  ) : (
                    <p className="text-xs text-stone-500">Henüz değerlendirme yok</p>
                  )}
                </div>
              </div>
            )}

            {item.owner && !isOwner && (
              <button
                disabled={messaging}
                onClick={() => handleMessage(item.owner!.id, item.id)}
                className="mt-3 w-full rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                {messaging ? "Başlatılıyor..." : "Sahibine Mesaj Gönder"}
              </button>
            )}

            {!isOwner && item.status === "active" && (
              <RentalRequestForm
                itemId={item.id}
                dailyPrice={item.dailyPrice}
                weeklyPrice={item.weeklyPrice}
                depositAmount={item.depositAmount}
                currency={item.currency}
                isLoggedIn={!!user}
                riskLevel={item.riskLevel}
              />
            )}
          </div>

          {isOwner && (
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/items/${item.id}/edit`}
                className="rounded-full border border-stone-300 px-4 py-2.5 text-center text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                İlanı Düzenle
              </Link>
              <button
                onClick={handleDeleteItem}
                className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                İlanı Sil
              </button>
            </div>
          )}

          {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
        </div>
      </div>
    </div>
  );
}
