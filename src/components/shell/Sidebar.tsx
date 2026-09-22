"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, ChevronRight } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/data";
import {
  ACCOUNT_NAV,
  CALLING_NAV,
  PRIMARY_NAV,
  SAFETY_NAV,
  type NavItem,
} from "@/lib/nav";
import { useApp } from "@/lib/store";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

/**
 * Persistent navigation for laptops and desktops.
 *
 * On a phone this role is split between the bottom tab bar and the drawer,
 * because a phone has no room for a permanent rail. From `lg` up there is
 * room, so the drawer disappears entirely and everything it held lives here
 * in the open — no hamburger, no overlay.
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { tier, name, isGuest, isPro, onlineCount } = useApp();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="hidden h-full w-[252px] shrink-0 flex-col border-r border-line bg-ink lg:flex xl:w-[268px]">
      <div className="flex items-center gap-2 px-5 py-5">
        <span aria-hidden className="flex h-5 items-end gap-[2.5px]">
          {[7, 14, 19, 12, 6].map((h, i) => (
            <span
              key={i}
              style={{ height: h, animationDelay: `${i * 110}ms` }}
              className="w-[2.5px] animate-pulse rounded-pill bg-mint"
            />
          ))}
        </span>
        <span className="text-[15px] font-bold tracking-tight text-chalk">
          {APP_NAME}
        </span>
      </div>

      <nav className="scroll-area flex-1 px-3 pb-4">
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              primary
            />
          ))}
        </ul>

        <SidebarGroup title="Calling">
          {CALLING_NAV.filter(
            (i) => !PRIMARY_NAV.some((p) => p.href === i.href),
          ).map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </SidebarGroup>

        <SidebarGroup title="Account">
          {ACCOUNT_NAV.filter((i) => !(i.pro && isPro)).map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </SidebarGroup>

        <SidebarGroup title="Safety & support">
          {SAFETY_NAV.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </SidebarGroup>
      </nav>

      <div className="border-t border-line px-3 py-3">
        {isGuest ? (
          <div className="rounded-2xl border border-line bg-surface p-3.5">
            <p className="text-[14px] font-bold text-chalk">Guest</p>
            <p className="mt-0.5 text-[11.5px] text-slate">Not signed in</p>
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="tap mt-2.5 w-full rounded-xl bg-mint py-2 text-[12.5px] font-semibold text-ink"
            >
              Create free account
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-slate">
              Keeps your friends, history and filters when you switch phones.
            </p>
          </div>
        ) : (
          <Link
            href="/profile"
            className="tap flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface"
          >
            <Avatar name={name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold text-chalk">
                {name}
              </span>
              <span className="block text-[11px] text-slate">
                {isPro ? "Pro · renews [DATE]" : "Free account"}
              </span>
            </span>
            {isPro && <Badge tone="gold">Pro</Badge>}
          </Link>
        )}

        <div className="mt-3 flex items-center justify-between px-2 text-[10.5px] text-dim">
          <span className="flex items-center gap-1.5 text-mint">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
            </span>
            <span className="tabular-nums">{onlineCount} online</span>
          </span>
          <span>
            {APP_VERSION} ·{" "}
            <Link href="/legal/terms" className="hover:text-slate">
              Terms
            </Link>
          </span>
        </div>
        <span className="sr-only">Signed in as {tier}</span>
      </div>
    </aside>
  );
}

function SidebarGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5">
      <h3 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
        {title}
      </h3>
      <ul className="space-y-0.5">{children}</ul>
    </section>
  );
}

function SidebarLink({
  item,
  active,
  primary,
}: {
  item: NavItem;
  active: boolean;
  primary?: boolean;
}) {
  const { isGuest } = useApp();
  const locked = item.needsAccount && isGuest;
  const href = locked && item.href !== "/filters" ? "/signup" : item.href;

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "tap relative flex items-center gap-2.5 rounded-xl px-3 py-2",
          primary ? "text-[14px] font-semibold" : "text-[13px] font-medium",
          active
            ? "bg-mint-tint text-mint"
            : item.tone === "danger"
              ? "text-coral hover:bg-surface"
              : item.tone === "gold"
                ? "text-gold hover:bg-surface"
                : "text-ash hover:bg-surface hover:text-chalk",
        )}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active"
            transition={{ type: "spring", damping: 30, stiffness: 420 }}
            className="absolute inset-y-1.5 left-0 w-[3px] rounded-pill bg-mint"
          />
        )}
        <item.Icon size={primary ? 18 : 16} strokeWidth={active ? 2.4 : 2} />
        <span className="flex-1 truncate">{item.label}</span>
        {locked ? (
          <Lock size={12} className="text-dim" strokeWidth={2.4} />
        ) : item.pro ? (
          <Badge tone="gold">Pro</Badge>
        ) : (
          !primary && <ChevronRight size={14} className="text-dim" />
        )}
      </Link>
    </li>
  );
}
