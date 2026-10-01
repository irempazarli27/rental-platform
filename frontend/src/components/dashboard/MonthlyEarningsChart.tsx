import { formatPrice } from "@/lib/format";

const PLOT_HEIGHT = 160;

function monthLabel(month: string, style: "short" | "long") {
  const [year, m] = month.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat(
    "tr-TR",
    style === "short" ? { month: "short" } : { month: "long", year: "numeric" },
  ).format(new Date(year, m - 1, 1));
}

/** Smallest 1/2/5 × 10ⁿ at or above the value, so the axis ends on a round number. */
function niceCeiling(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return (
    ([1, 2, 5, 10].find((step) => step * magnitude >= value) ?? 10) * magnitude
  );
}

export function MonthlyEarningsChart({
  months,
  currency,
}: {
  months: { month: string; earned: number }[];
  currency: string;
}) {
  const peak = Math.max(...months.map((m) => m.earned));
  if (peak <= 0) {
    return (
      <p className="py-10 text-center text-sm text-stone-500">
        Son 6 ayda tamamlanan kiralama yok.
      </p>
    );
  }

  const top = niceCeiling(peak);
  const ticks = [top, top / 2, 0];
  const peakIndex = months.findIndex((m) => m.earned === peak);
  const lastIndex = months.length - 1;

  return (
    <figure>
      <div className="flex gap-3">
        <div
          className="flex flex-col justify-between text-right text-[11px] tabular-nums text-stone-500"
          style={{ height: PLOT_HEIGHT }}
        >
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 last:translate-y-1/2">
              {formatPrice(t, currency)}
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: PLOT_HEIGHT }}>
          {/* Gridlines stay behind the columns and far quieter than them. */}
          <div
            className="absolute inset-0 flex flex-col justify-between"
            aria-hidden
          >
            <div className="border-t border-stone-100" />
            <div className="border-t border-stone-100" />
            <div className="border-t border-stone-300" />
          </div>

          <div className="absolute inset-0 flex items-end">
            {months.map((m, i) => {
              const height = Math.round((m.earned / top) * PLOT_HEIGHT);
              // Only the peak and the current month carry a printed value; the
              // rest are a hover/focus away, and all of them are in the table below.
              const labelled =
                m.earned > 0 && (i === peakIndex || i === lastIndex);
              return (
                <div
                  key={m.month}
                  tabIndex={0}
                  aria-label={`${monthLabel(m.month, "long")}: ${formatPrice(m.earned, currency)}`}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end rounded-md outline-none hover:bg-stone-100/70 focus-visible:bg-stone-100/70"
                >
                  {labelled && (
                    <span className="mb-1 text-[11px] font-medium tabular-nums text-stone-700">
                      {formatPrice(m.earned, currency)}
                    </span>
                  )}
                  <div
                    className="w-full max-w-6 rounded-t bg-rose-600"
                    style={{ height }}
                  />
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-stone-200 bg-surface px-2.5 py-1.5 text-xs shadow-md group-hover:block group-focus-visible:block"
                  >
                    <span className="block font-semibold tabular-nums text-stone-900">
                      {formatPrice(m.earned, currency)}
                    </span>
                    <span className="block text-stone-500">
                      {monthLabel(m.month, "long")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-3 text-[11px] text-stone-500" aria-hidden>
        <div className="invisible text-right tabular-nums">
          {formatPrice(top, currency)}
        </div>
        <div className="flex flex-1">
          {months.map((m) => (
            <span key={m.month} className="flex-1 text-center">
              {monthLabel(m.month, "short")}
            </span>
          ))}
        </div>
      </div>

      {/* The wrapper is what's hidden: a table ignores sr-only's 1px width and would widen the page. */}
      <div className="sr-only">
        <table>
          <caption>Aylara göre tamamlanan kiralamalardan kazanç</caption>
          <thead>
            <tr>
              <th>Ay</th>
              <th>Kazanç</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.month}>
                <td>{monthLabel(m.month, "long")}</td>
                <td>{formatPrice(m.earned, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
