import { cn } from "@/lib/cn";

const SIZES = {
  sm: "h-9 w-9 text-[13px]",
  md: "h-11 w-11 text-[15px]",
  lg: "h-14 w-14 text-[19px]",
  xl: "h-[84px] w-[84px] text-[34px]",
};

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full bg-surface-hi font-semibold text-ash",
        SIZES[size],
        className,
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
