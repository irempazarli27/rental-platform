"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { describeApiError } from "@/lib/api/client";
import { createAvailabilityBlock, deleteAvailabilityBlock } from "@/lib/api/items";
import { getCalendar, type CalendarEntry } from "@/lib/api/owner";
import { formatDate } from "@/lib/format";

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MAX_CHIPS = 3;

const KIND_LABELS: Record<CalendarEntry["kind"], string> = {
  rental: "Kiralandı",
  pending: "Onay bekliyor",
  manual: "Kapalı",
};
// Pending is outlined rather than filled so the three states differ by more than colour.
const KIND_CLASSES: Record<CalendarEntry["kind"], string> = {
  rental: "bg-rose-100 text-rose-700",
  pending: "border border-dashed border-amber-200 bg-amber-50 text-amber-800",
  manual: "bg-stone-200 text-stone-700",
};

// The phone view shrinks each entry to a thin bar, which needs a solid colour
// to stay visible; the tinted chip fills disappear at that size.
const MARKER_CLASSES: Record<CalendarEntry["kind"], string> = {
  rental: "bg-rose-600",
  pending: "bg-amber-500",
  manual: "bg-stone-400",
};

// Dates stay as plain YYYY-MM-DD strings throughout: going through Date/ISO
// would shift them by the viewer's UTC offset.
function iso(year: number, month: number, day: number) {
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString().slice(0, 10);
}

/** The Monday-to-Sunday weeks that cover a month, as ISO dates. */
function monthGrid(year: number, month: number): string[] {
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => iso(year, month, i - firstWeekday + 1));
}

function todayIso() {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";

export default function CalendarPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [itemFilter, setItemFilter] = useState("all");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [blockItemId, setBlockItemId] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const grid = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor]);
  const from = grid[0]!;
  const to = grid[grid.length - 1]!;

  const load = useCallback(async () => {
    try {
      const res = await getCalendar(from, to);
      setItems(res.items);
      setEntries(res.entries);
      setError(null);
    } catch {
      setError("Takvim yüklenemedi.");
    } finally {
      setLoaded(true);
    }
  }, [from, to]);

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

  const visible = useMemo(
    () => (itemFilter === "all" ? entries : entries.filter((e) => e.itemId === itemFilter)),
    [entries, itemFilter],
  );

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(Date.UTC(year, month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    const itemId = blockItemId || items[0]?.id;
    if (!itemId) return;
    setBusy(true);
    setFormError(null);
    try {
      await createAvailabilityBlock(itemId, { startDate: blockStart, endDate: blockEnd });
      setBlockStart("");
      setBlockEnd("");
      await load();
    } catch (err) {
      setFormError(describeApiError(err, "Tarihler kapatılamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(entry: CalendarEntry) {
    setBusy(true);
    try {
      await deleteAvailabilityBlock(entry.itemId, entry.id);
      await load();
    } catch (err) {
      setError(describeApiError(err, "Kayıt silinemedi."));
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !user || !loaded) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  const today = todayIso();
  const monthTitle = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(
    new Date(cursor.year, cursor.month, 1),
  );
  const singleItem = itemFilter !== "all";
  const chipText = (e: CalendarEntry) => (singleItem ? (e.renterName ?? KIND_LABELS[e.kind]) : e.itemTitle);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-700">
        ← Panelim
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Takvim</h1>
      <p className="mt-1 text-sm text-stone-600">İlanlarının kiralandığı, talep beklediği ve kapattığın günler.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">
          Takvim, ilanların olduğunda dolmaya başlar.{" "}
          <Link href="/items/new" className="font-medium text-rose-600 hover:text-rose-700">
            İlk ilanını ver
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => shiftMonth(-1)} className="rounded-full p-2 text-stone-600 hover:bg-stone-100" aria-label="Önceki ay">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-36 text-center text-base font-semibold capitalize text-stone-900">{monthTitle}</h2>
              <button onClick={() => shiftMonth(1)} className="rounded-full p-2 text-stone-600 hover:bg-stone-100" aria-label="Sonraki ay">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <select
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className={`${inputClass} sm:w-64`}
              aria-label="İlan filtresi"
            >
              <option value="all">Tüm ilanlar</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
            {(["rental", "pending", "manual"] as const).map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={`h-3 w-5 rounded ${KIND_CLASSES[kind]}`} />
                {KIND_LABELS[kind]}
              </span>
            ))}
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-surface">
            <div className="grid grid-cols-7 border-b border-stone-200 text-center text-xs font-medium text-stone-500">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((day) => {
                const dayEntries = visible.filter((e) => e.startDate <= day && e.endDate >= day);
                const inMonth = Number(day.slice(5, 7)) === cursor.month + 1;
                return (
                  <div
                    key={day}
                    className={`min-h-16 border-b border-r border-stone-100 p-1 sm:min-h-24 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${
                      inMonth ? "" : "bg-stone-50"
                    }`}
                  >
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums ${
                        day === today ? "bg-stone-900 font-semibold text-stone-50" : inMonth ? "text-stone-700" : "text-stone-400"
                      }`}
                    >
                      {Number(day.slice(8))}
                    </span>
                    {/* Phones only have room for a marker per booking; the list below names them. */}
                    <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                      {dayEntries.map((e) => (
                        <span key={e.id} className={`h-1.5 w-full rounded-full ${MARKER_CLASSES[e.kind]}`} />
                      ))}
                    </div>
                    <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
                      {dayEntries.slice(0, MAX_CHIPS).map((e) => {
                        const className = `block truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${KIND_CLASSES[e.kind]}`;
                        const title = `${e.itemTitle} · ${KIND_LABELS[e.kind]}${e.renterName ? ` · ${e.renterName}` : ""}`;
                        return e.rentalId ? (
                          <Link key={e.id} href={`/dashboard/rentals/${e.rentalId}`} className={className} title={title}>
                            {chipText(e)}
                          </Link>
                        ) : (
                          <span key={e.id} className={className} title={title}>
                            {chipText(e)}
                          </span>
                        );
                      })}
                      {dayEntries.length > MAX_CHIPS && (
                        <span className="px-1.5 text-[11px] text-stone-500">+{dayEntries.length - MAX_CHIPS} daha</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-surface p-6">
            <h2 className="text-sm font-semibold text-stone-900">Bu görünümdeki kayıtlar</h2>
            {visible.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">Bu ay için kayıt yok.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {visible.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{e.itemTitle}</p>
                      <p className="text-xs text-stone-500">
                        {formatDate(e.startDate)} – {formatDate(e.endDate)}
                        {e.renterName ? ` · ${e.renterName}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND_CLASSES[e.kind]}`}>{KIND_LABELS[e.kind]}</span>
                      {e.rentalId ? (
                        <Link href={`/dashboard/rentals/${e.rentalId}`} className="text-xs font-medium text-rose-600 hover:text-rose-700">
                          Kiralamaya git
                        </Link>
                      ) : (
                        <button onClick={() => removeBlock(e)} disabled={busy} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
                          Kaldır
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-surface p-6">
            <h2 className="text-sm font-semibold text-stone-900">Tarih kapat</h2>
            <p className="mt-1 text-xs text-stone-500">Eşyanın müsait olmadığı günleri kapatırsan o tarihler için talep alınmaz.</p>
            <form onSubmit={addBlock} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
              <div>
                <label htmlFor="block-item" className="block text-xs font-medium text-stone-700">
                  İlan
                </label>
                <select id="block-item" value={blockItemId || items[0]?.id} onChange={(e) => setBlockItemId(e.target.value)} className={`mt-1 ${inputClass}`}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="block-start" className="block text-xs font-medium text-stone-700">
                  Başlangıç
                </label>
                <input id="block-start" type="date" required value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <div>
                <label htmlFor="block-end" className="block text-xs font-medium text-stone-700">
                  Bitiş
                </label>
                <input id="block-end" type="date" required min={blockStart || undefined} value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className={`mt-1 ${inputClass}`} />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Kapat
              </button>
            </form>
            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
          </section>
        </>
      )}
    </div>
  );
}
