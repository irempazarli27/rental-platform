"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRental, type Rental } from "@/lib/api/rentals";
import type { HandoverPhase } from "@/lib/api/handover";
import { HandoverWizard } from "./HandoverWizard";

const PHASE_CONFIG: Record<
  HandoverPhase,
  { title: string; requiredStatus: string; role: "owner" | "renter"; roleMessage: string; statusMessage: string }
> = {
  pickup: {
    title: "Teslim Belgeleri",
    requiredStatus: "ACCEPTED",
    role: "owner",
    roleMessage: "Teslim belgelerini sadece eşya sahibi doldurabilir.",
    statusMessage: "Bu kiralama şu anda teslim belgesi doldurmaya uygun durumda değil.",
  },
  return: {
    title: "İade Belgeleri",
    requiredStatus: "ACTIVE",
    role: "renter",
    roleMessage: "İade belgelerini sadece kiracı doldurabilir.",
    statusMessage: "Bu kiralama şu anda iade belgesi doldurmaya uygun durumda değil.",
  },
};

export function HandoverPageShell({ phase }: { phase: HandoverPhase }) {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const config = PHASE_CONFIG[phase];

  const [rental, setRental] = useState<Rental | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { rental } = await getRental(id);
      setRental(rental);
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

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-zinc-500">Yükleniyor...</div>;
  }

  if (loadError || !rental || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-red-600">{loadError ?? "Kiralama bulunamadı."}</p>
      </div>
    );
  }

  const isOwner = rental.owner?.id === user.id;
  const viewerRole = isOwner ? "owner" : "renter";

  if (viewerRole !== config.role) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-red-600">{config.roleMessage}</p>
      </div>
    );
  }

  if (rental.status !== config.requiredStatus) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-red-600">{config.statusMessage}</p>
        <Link href={`/dashboard/rentals/${id}`} className="mt-2 inline-block text-sm font-medium text-zinc-900 underline">
          Kiralama detayına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">{config.title}</h1>
      <p className="mt-1 text-sm text-zinc-600">{rental.item?.title}</p>

      <div className="mt-8">
        <HandoverWizard rentalId={id} phase={phase} />
      </div>
    </div>
  );
}
