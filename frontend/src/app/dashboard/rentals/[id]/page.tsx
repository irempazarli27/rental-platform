"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { acceptRental, cancelRental, getRental, rejectRental, type Rental } from "@/lib/api/rentals";
import { confirmHandover, getHandoverSummary, type HandoverSummary } from "@/lib/api/handover";
import { ApiError } from "@/lib/api/client";
import {
  RENTAL_STATUS_BADGE_CLASSES,
  RENTAL_STATUS_LABELS,
  formatDate,
  formatPrice,
} from "@/lib/format";
import { HandoverGallery } from "@/components/handover/HandoverGallery";
import { DamageReports } from "@/components/handover/DamageReports";
import { ReviewSection } from "@/components/rentals/ReviewSection";
import { DisputeSection } from "@/components/rentals/DisputeSection";
import { startConversation } from "@/lib/api/messaging";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function RentalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [rental, setRental] = useState<Rental | null>(null);
  const [summary, setSummary] = useState<HandoverSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ rental }, handoverSummary] = await Promise.all([getRental(id), getHandoverSummary(id)]);
      setRental(rental);
      setSummary(handoverSummary);
    } catch {
      setLoadError("Kiralama bulunamadı.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    async function run() {
      await load();
    }
    run();
  }, [authLoading, load]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  async function runAction(action: () => Promise<{ rental: Rental }>) {
    setBusy(true);
    setActionError(null);
    try {
      const { rental } = await action();
      setRental(rental);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "İşlem gerçekleştirilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMessage(recipientId: string, itemId?: string) {
    setMessaging(true);
    setActionError(null);
    try {
      const { conversation } = await startConversation({ recipientId, itemId, rentalId: id });
      router.push(`/dashboard/messages/${conversation.id}`);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Mesajlaşma başlatılamadı.");
      setMessaging(false);
    }
  }

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  if (loadError || !rental || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-red-600">{loadError ?? "Kiralama bulunamadı."}</p>
        <Link href="/dashboard/rentals" className="mt-2 inline-block text-sm font-medium text-stone-900 underline">
          Kiralamalarıma dön
        </Link>
      </div>
    );
  }

  const isOwner = rental.owner?.id === user.id;
  const isRenter = rental.renter?.id === user.id;
  const isParticipant = isOwner || isRenter;
  const viewerRole = isOwner ? "owner" : "renter";
  const counterparty = isOwner ? rental.renter : rental.owner;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-900">Kiralama Detayı</h1>
        <span className={`rounded px-2 py-1 text-xs font-medium ${RENTAL_STATUS_BADGE_CLASSES[rental.status]}`}>
          {RENTAL_STATUS_LABELS[rental.status]}
        </span>
      </div>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-stone-200 bg-surface p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
          {rental.item?.coverImageUrl && (
            <Image src={`${API_URL}${rental.item.coverImageUrl}`} alt={rental.item.title} fill unoptimized className="object-cover" />
          )}
        </div>
        <div>
          {rental.item && (
            <Link href={`/items/${rental.item.id}`} className="text-sm font-medium text-stone-900 hover:underline">
              {rental.item.title}
            </Link>
          )}
          <p className="text-xs text-stone-500">
            {formatDate(rental.startDate)} – {formatDate(rental.endDate)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-stone-200 bg-surface p-4">
          <h2 className="text-sm font-semibold text-stone-900">
            {isOwner ? "Kiracı" : "Eşya Sahibi"}
          </h2>
          {counterparty ? (
            <Link href={`/profile/${counterparty.id}`} className="mt-2 block text-sm text-stone-700 hover:underline">
              {counterparty.fullName}
            </Link>
          ) : (
            <p className="mt-2 text-sm text-stone-700">—</p>
          )}
          {counterparty && isParticipant && (
            <button
              disabled={messaging}
              onClick={() => handleMessage(counterparty.id, rental.item?.id)}
              className="mt-2 text-xs font-medium text-stone-700 underline disabled:opacity-50"
            >
              Mesajlaş
            </button>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-surface p-4">
          <h2 className="text-sm font-semibold text-stone-900">Ücret Dökümü</h2>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500">Kira bedeli</dt>
              <dd className="text-stone-900">{formatPrice(rental.rentalPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Platform bedeli</dt>
              <dd className="text-stone-900">{formatPrice(rental.platformFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Güvence bedeli</dt>
              <dd className="text-stone-900">{formatPrice(rental.depositAmount)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Toplam</dt>
              <dd>{formatPrice(rental.totalAmount)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-surface p-4">
        <h2 className="text-sm font-semibold text-stone-900">Durum Geçmişi</h2>
        <ul className="mt-2 space-y-1 text-sm text-stone-600">
          <li>Talep oluşturuldu — {formatDate(rental.createdAt)}</li>
          {rental.acceptedAt && <li>Kabul edildi — {formatDate(rental.acceptedAt)}</li>}
          {rental.rejectedAt && <li>Reddedildi — {formatDate(rental.rejectedAt)}</li>}
          {rental.cancelledAt && <li>İptal edildi — {formatDate(rental.cancelledAt)}</li>}
          {rental.completedAt && <li>Tamamlandı — {formatDate(rental.completedAt)}</li>}
        </ul>
      </section>

      {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

      {!isParticipant && (
        <p className="mt-4 rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-500">
          Bunu bir admin olarak salt-okunur görüntülüyorsun.
        </p>
      )}

      {isParticipant && (
      <div className="mt-6 flex gap-3">
        {viewerRole === "owner" && rental.status === "PENDING" && (
          <>
            <button
              disabled={busy}
              onClick={() => runAction(() => acceptRental(rental.id))}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Kabul Et
            </button>
            <button
              disabled={busy}
              onClick={() => runAction(() => rejectRental(rental.id))}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
            >
              Reddet
            </button>
          </>
        )}
        {((viewerRole === "renter" && (rental.status === "PENDING" || rental.status === "ACCEPTED")) ||
          (viewerRole === "owner" && rental.status === "ACCEPTED")) && (
          <button
            disabled={busy}
            onClick={() => runAction(() => cancelRental(rental.id))}
            className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            İptal Et
          </button>
        )}

        {viewerRole === "owner" && rental.status === "ACCEPTED" && (
          <Link
            href={`/dashboard/rentals/${rental.id}/handover/pickup`}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Teslim Belgelerini Doldur
          </Link>
        )}
        {viewerRole === "renter" && rental.status === "READY_FOR_HANDOVER" && (
          <button
            disabled={busy}
            onClick={() => runAction(() => confirmHandover(rental.id, "pickup"))}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Teslim Aldım, Onaylıyorum
          </button>
        )}
        {viewerRole === "renter" && rental.status === "ACTIVE" && (
          <Link
            href={`/dashboard/rentals/${rental.id}/handover/return`}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            İade Belgelerini Doldur
          </Link>
        )}
        {viewerRole === "owner" && rental.status === "RETURN_PENDING" && (
          <button
            disabled={busy}
            onClick={() => runAction(() => confirmHandover(rental.id, "return"))}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            İadeyi Onaylıyorum
          </button>
        )}
      </div>
      )}

      {(summary?.pickup || summary?.return) && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <HandoverGallery title="Teslim Belgeleri" record={summary?.pickup ?? null} />
          <HandoverGallery title="İade Belgeleri" record={summary?.return ?? null} />
        </div>
      )}

      {rental.status !== "PENDING" && rental.status !== "REJECTED" && rental.status !== "CANCELLED" && (
        <div className="mt-4">
          <DamageReports rentalId={rental.id} />
        </div>
      )}

      {rental.status !== "PENDING" && rental.status !== "REJECTED" && rental.status !== "CANCELLED" && (
        <div className="mt-4">
          <DisputeSection
            rentalId={rental.id}
            canOpen={isParticipant && (rental.status === "ACTIVE" || rental.status === "RETURN_PENDING")}
            onOpened={load}
          />
        </div>
      )}

      {rental.status === "COMPLETED" && isParticipant && (
        <div className="mt-4">
          <ReviewSection rentalId={rental.id} isCompleted={rental.status === "COMPLETED"} viewerId={user.id} />
        </div>
      )}
    </div>
  );
}
