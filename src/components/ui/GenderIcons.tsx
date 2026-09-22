/**
 * Venus and Mars glyphs, drawn inline.
 *
 * lucide-react does not ship gender symbols at the version this project
 * pins, and these two are simple enough that adding a dependency — or
 * bumping one — to get them would be the wrong trade. They match the
 * lucide stroke weight and 24-unit grid so they sit correctly beside the
 * icons that do come from the library.
 */

type Props = { size?: number; className?: string; strokeWidth?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false" as const,
});

export function VenusIcon({ size = 16, className, strokeWidth = 2.1 }: Props) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M12 14.5V22" />
      <path d="M8.5 19h7" />
    </svg>
  );
}

export function MarsIcon({ size = 16, className, strokeWidth = 2.1 }: Props) {
  return (
    <svg {...base(size)} strokeWidth={strokeWidth} className={className}>
      <circle cx="10" cy="14" r="5.5" />
      <path d="M14 10 20.5 3.5" />
      <path d="M15.5 3.5h5v5" />
    </svg>
  );
}
