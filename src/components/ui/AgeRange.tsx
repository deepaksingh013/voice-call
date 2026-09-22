"use client";

import { cn } from "@/lib/cn";

const MIN = 18; // hard floor — never lower
const MAX = 60;

/**
 * Two stacked native range inputs. Native inputs keep keyboard and screen
 * reader behaviour for free, which a div-and-pointer-events slider loses.
 */
export function AgeRange({
  value,
  onChange,
  disabled,
}: {
  value: [number, number];
  onChange: (v: [number, number]) => void;
  disabled?: boolean;
}) {
  const [lo, hi] = value;
  const pct = (n: number) => ((n - MIN) / (MAX - MIN)) * 100;

  return (
    <div className={cn("pt-1", disabled && "pointer-events-none opacity-50")}>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[17px] font-semibold tabular-nums text-chalk">
          {lo} – {hi}
        </span>
        <span className="text-[11.5px] text-slate">under 18 not allowed</span>
      </div>

      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-pill bg-surface-hi" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-pill bg-mint"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />

        <input
          type="range"
          min={MIN}
          max={MAX}
          value={lo}
          disabled={disabled}
          aria-label="Minimum age"
          onChange={(e) => onChange([Math.min(+e.target.value, hi - 1), hi])}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={MIN}
          max={MAX}
          value={hi}
          disabled={disabled}
          aria-label="Maximum age"
          onChange={(e) => onChange([lo, Math.max(+e.target.value, lo + 1)])}
          className="range-thumb absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
        />
      </div>

      <style jsx>{`
        .range-thumb {
          pointer-events: none;
        }
        .range-thumb::-webkit-slider-thumb {
          pointer-events: auto;
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 999px;
          background: #f1f2f5;
          border: 3px solid #3cdb97;
          cursor: pointer;
        }
        .range-thumb::-moz-range-thumb {
          pointer-events: auto;
          height: 20px;
          width: 20px;
          border-radius: 999px;
          background: #f1f2f5;
          border: 3px solid #3cdb97;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
