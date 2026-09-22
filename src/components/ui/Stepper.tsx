import { cn } from "@/lib/cn";

/** "Step 1 of 3" with a progress track — signup is the only multi-step flow. */
export function Stepper({ step, of }: { step: number; of: number }) {
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate">
        Step {step} of {of}
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: of }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-pill transition-colors duration-300",
              i < step ? "bg-mint" : "bg-surface-hi",
            )}
          />
        ))}
      </div>
    </div>
  );
}
