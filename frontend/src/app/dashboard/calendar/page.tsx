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
const MAX_LANES = 3;

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

// Bars on the grid. Phones shrink them to a thin line, which needs a solid
// colour to stay visible; from sm up they are the same tinted chips as the legend.
const BAR_CLASSES: Record<CalendarEntry["kind"], string> = {
  rental: "bg-rose-600 sm:bg-rose-100 sm:text-rose-700",
  pending: "bg-amber-500 sm:border sm:border-dashed sm:border-amber-200 sm:bg-amber-50 sm:text-amber-800",
  manual: "bg-stone-400 sm:bg-stone-200 sm:text-stone-700",
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

interface Segment {
  entry: CalendarEntry;
  /** 0-based weekday column the bar starts in, and how many days it covers this week. */
  col: number;
  span: number;
  lane: number;
  /** The booking carries on into the previous / next week. */
  fromPrev: boolean;
  toNext: boolean;
}

/**
 * Lays one week's entries out as bars: each entry becomes a single run across
 * the days it covers, stacked into the first lane that is free for those days.
 */
function layoutWeek(days: string[], entries: CalendarEntry[]): Segment[] {
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const segments = entries
    .filter((e) => e.startDate <= last && e.endDate >= first)
    .map((entry) => {
      const col = entry.startDate < first ? 0 : days.indexOf(entry.startDate);
      const endCol = entry.endDate > last ? days.length - 1 : days.indexOf(entry.endDate);
      return { entry, col, span: endCol - col + 1, lane: 0, fromPrev: entry.startDate < first, toNext: entry.endDate > last };
    })
    .sort((a, b) => a.col - b.col || b.span - a.span);

  const laneEnds: number[] = [];
  for (const seg of segments) {
    let lane = laneEnds.findIndex((end) => end < seg.col);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = seg.col + seg.span - 1;
    seg.lane = lane;
  }
  return segments;
}

function todayIso() {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";

function EntryRow({ entry: e, busy, onRemove }: { entry: CalendarEntry; busy: boolean; onRemove: (entry: CalendarEntry) => void }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
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
          <button onClick={() => onRemove(e)} disabled={busy} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
            Yeniden aç
          </button>
        )}
      </div>
    </li>
  );
}

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
  // The selected range doubles as the "close dates" form: clicking days on the
  // grid fills it, and the date inputs edit the same values.
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  // True after the first click of a range, while the second click is awaited.
  const [pickingEnd, setPickingEnd] = useState(false);
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

  const weeks = useMemo(() => {
    const out: { days: string[]; segments: Segment[] }[] = [];
    for (let i = 0; i < grid.length; i += 7) {
      const days = grid.slice(i, i + 7);
      out.push({ days, segments: layoutWeek(days, visible) });
    }
    return out;
  }, [grid, visible]);

  function pickDay(day: string) {
    if (pickingEnd && blockStart) {
      const [a, b] = day < blockStart ? [day, blockStart] : [blockStart, day];
      setBlockStart(a);
      setBlockEnd(b);
      setPickingEnd(false);
    } else {
      setBlockStart(day);
      setBlockEnd(day);
      setPickingEnd(true);
    }
    setFormError(null);
  }

  function clearSelection() {
    setBlockStart("");
    setBlockEnd("");
    setPickingEnd(false);
    setFormError(null);
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const d = new Date(Date.UTC(year, month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    const itemId = selectedItemId;
    if (!itemId || !blockStart || !blockEnd) return;
    setBusy(true);
    setFormError(null);
    try {
      await createAvailabilityBlock(itemId, { startDate: blockStart, endDate: blockEnd });
      clearSelection();
      await load();
    } catch (err) {
      setFormError(describeApiError(err, "Tarihler kapatılamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(entry: CalendarEntry) {
    if (!window.confirm(`${entry.itemTitle} için kapatılan günler yeniden açılsın mı?`)) return;
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
  const barText = (e: CalendarEntry) => (singleItem ? (e.renterName ?? KIND_LABELS[e.kind]) : e.itemTitle);
  // The item a new block applies to: an explicit choice, else the filtered listing, else the first one.
  const selectedItemId = blockItemId || (singleItem ? itemFilter : items[0]?.id) || "";
  const hasSelection = blockStart !== "" && blockEnd !== "";
  const selectedEntries = hasSelection ? visible.filter((e) => e.startDate <= blockEnd && e.endDate >= blockStart) : [];
  // Closing days that are already booked on that listing does nothing useful, so say so first.
  const bookedInSelection = selectedEntries.some((e) => e.kind === "rental" && e.itemId === selectedItemId);

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
              <button
                onClick={goToday}
                className="ml-1 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
              >
                Bugün
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
                <span className={`h-3 w-5 rounded ${BAR_CLASSES[kind]}`} />
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
            {weeks.map(({ days, segments }) => (
              <div key={days[0]} className="relative border-b border-stone-100 last:border-b-0">
                <div className="grid grid-cols-7">
                  {days.map((day) => {
                    const inMonth = Number(day.slice(5, 7)) === cursor.month + 1;
                    const selected = hasSelection && day >= blockStart && day <= blockEnd;
                    const hidden = segments.filter((seg) => seg.lane >= MAX_LANES && days.indexOf(day) >= seg.col && days.indexOf(day) < seg.col + seg.span).length;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => pickDay(day)}
                        aria-pressed={selected}
                        aria-label={formatDate(day)}
                        className={`flex min-h-16 flex-col items-start justify-between border-r border-stone-100 p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500 sm:min-h-28 sm:p-1.5 [&:nth-child(7n)]:border-r-0 ${
                          selected ? "bg-rose-50" : inMonth ? "hover:bg-stone-50" : "bg-stone-50"
                        }`}
                      >
                        <span
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs tabular-nums ${
                            day === today ? "bg-stone-900 font-semibold text-stone-50" : inMonth ? "text-stone-700" : "text-stone-400"
                          }`}
                        >
                          {Number(day.slice(8))}
                        </span>
                        {hidden > 0 && <span className="hidden text-[11px] text-stone-500 sm:block">+{hidden} daha</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Bars float over the day buttons. The layer ignores clicks so the days
                    stay clickable; on phones the bars do too, since they're too thin to tap. */}
                <div className="pointer-events-none absolute inset-x-0 top-8 grid grid-cols-7 gap-y-0.5 sm:top-9 sm:gap-y-1">
                  {segments
                    .filter((seg) => seg.lane < MAX_LANES)
                    .map(({ entry: e, col, span, lane, fromPrev, toNext }) => {
                      const className = `mx-0.5 h-1.5 truncate px-1.5 text-[11px] font-medium leading-5 sm:pointer-events-auto sm:h-5 ${
                        fromPrev ? "ml-0 rounded-l-none" : "rounded-l"
                      } ${toNext ? "mr-0 rounded-r-none" : "rounded-r"} ${BAR_CLASSES[e.kind]}`;
                      const style = { gridColumn: `${col + 1} / span ${span}`, gridRow: lane + 1 };
                      const title = `${e.itemTitle} · ${KIND_LABELS[e.kind]}${e.renterName ? ` · ${e.renterName}` : ""} · ${formatDate(e.startDate)} – ${formatDate(e.endDate)}`;
                      const label = <span className="hidden sm:inline">{barText(e)}</span>;
                      return e.rentalId ? (
                        <Link key={e.id} href={`/dashboard/rentals/${e.rentalId}`} className={className} style={style} title={title}>
                          {label}
                        </Link>
                      ) : (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => removeBlock(e)}
                          disabled={busy}
                          className={`${className} text-left`}
                          style={style}
                          title={`${title} · Yeniden açmak için tıkla`}
                        >
                          {label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>

          <section className="mt-4 rounded-2xl border border-stone-200 bg-surface p-5">
            {!hasSelection ? (
              <p className="text-sm text-stone-600">
                Bir güne tıkla: o günün kayıtlarını görürsün. İkinci bir güne tıklarsan aradaki günler seçilir ve kapatabilirsin.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-stone-900">
                    {blockStart === blockEnd ? formatDate(blockStart) : `${formatDate(blockStart)} – ${formatDate(blockEnd)}`}
                  </h2>
                  <button onClick={clearSelection} className="text-xs font-medium text-stone-500 hover:text-stone-700">
                    Seçimi temizle
                  </button>
                </div>
                {pickingEnd && <p className="mt-1 text-xs text-stone-500">Aralık seçmek için bitiş gününe tıkla.</p>}

                {selectedEntries.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">Bu günlerde kayıt yok.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-stone-100">
                    {selectedEntries.map((e) => (
                      <EntryRow key={e.id} entry={e} busy={busy} onRemove={removeBlock} />
                    ))}
                  </ul>
                )}

                <form onSubmit={addBlock} className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                  <div>
                    <label htmlFor="block-item" className="block text-xs font-medium text-stone-700">
                      Kapatılacak ilan
                    </label>
                    <select id="block-item" value={selectedItemId} onChange={(e) => setBlockItemId(e.target.value)} className={`mt-1 ${inputClass}`}>
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
                    <input
                      id="block-start"
                      type="date"
                      required
                      value={blockStart}
                      onChange={(e) => {
                        setBlockStart(e.target.value);
                        if (blockEnd < e.target.value) setBlockEnd(e.target.value);
                        setPickingEnd(false);
                      }}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label htmlFor="block-end" className="block text-xs font-medium text-stone-700">
                      Bitiş
                    </label>
                    <input
                      id="block-end"
                      type="date"
                      required
                      min={blockStart}
                      value={blockEnd}
                      onChange={(e) => {
                        setBlockEnd(e.target.value);
                        setPickingEnd(false);
                      }}
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    Bu günleri kapat
                  </button>
                </form>
                <p className="mt-2 text-xs text-stone-500">Kapattığın günler için kiralama talebi alınmaz.</p>
                {bookedInSelection && (
                  <p className="mt-2 text-xs text-amber-700">Bu aralıkta seçili ilanın zaten bir kiralaması var; o günler zaten dolu.</p>
                )}
                {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
              </>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-stone-200 bg-surface p-6">
            <h2 className="text-sm font-semibold text-stone-900">Bu görünümdeki kayıtlar</h2>
            {visible.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">Bu ay için kayıt yok.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {visible.map((e) => (
                  <EntryRow key={e.id} entry={e} busy={busy} onRemove={removeBlock} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
