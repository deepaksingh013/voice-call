"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PRIMARY_NAV } from "@/lib/nav";
import { cn } from "@/lib/cn";

/**
 * Bottom tab bar — phones and tablets only. From `lg` the sidebar takes over
 * and this disappears, rather than both competing for the same job.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="shrink-0 border-t border-line bg-ink pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-[600px]">
        {PRIMARY_NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "tap relative flex flex-col items-center gap-1 py-2.5",
                  active ? "text-mint" : "text-slate hover:text-ash",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    transition={{ type: "spring", damping: 28, stiffness: 420 }}
                    className="absolute inset-x-5 top-0 h-[2px] rounded-pill bg-mint"
                  />
                )}
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                <span className="text-[10px] font-semibold tracking-tight sm:text-[11px]">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
