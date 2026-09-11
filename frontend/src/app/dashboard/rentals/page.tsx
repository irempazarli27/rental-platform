"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { acceptRental, cancelRental, listMyRentals, rejectRental, type Rental } from "@/lib/api/rentals";
import { ApiError } from "@/lib/api/client";
import { RentalCard } from "@/components/rentals/RentalCard";

export default function MyRentalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [asRenter, setAsRenter] = useState<Rental[]>([]);
  const [asOwner, setAsOwner] = useState<Rental[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [renterRes, ownerRes] = await Promise.all([
        listMyRentals({ role: "renter" }),
        listMyRentals({ role: "owner" }),
      ]);
      setAsRenter(renterRes.rentals);
      setAsOwner(ownerRes.rentals);
    } catch {
      setError("Kiralamalar yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!user) return;

    async function run() {
      await load();
    }
    run();
  }, [authLoading, user, router, load]);

  async function withBusy(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İşlem gerçekleştirilemedi.");
    } finally {
      setBusyId(null);
    }
  }

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-sm text-zinc-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Kiralamalarım</h1>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-900">Gelen Talepler</h2>
        {asOwner.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Henüz gelen bir talep yok.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {asOwner.map((rental) => (
              <RentalCard
                key={rental.id}
                rental={rental}
                viewerRole="owner"
                busy={busyId === rental.id}
                onAccept={(id) => withBusy(id, () => acceptRental(id))}
                onReject={(id) => withBusy(id, () => rejectRental(id))}
                onCancel={(id) => withBusy(id, () => cancelRental(id))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-zinc-900">Kiraladıklarım</h2>
        {asRenter.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Henüz bir kiralama talebin yok.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {asRenter.map((rental) => (
              <RentalCard
                key={rental.id}
                rental={rental}
                viewerRole="renter"
                busy={busyId === rental.id}
                onCancel={(id) => withBusy(id, () => cancelRental(id))}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
