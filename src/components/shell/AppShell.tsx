"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

/**
 * The responsive frame for the whole product. One codebase, three shapes:
 *
 * - **Phone** (< 768px): a single column, edge to edge, sized with `dvh` so
 *   collapsing browser chrome never cuts off the bottom bar. Navigation is
 *   the tab bar plus the drawer.
 * - **Tablet** (768px+): same single column, but wider gutters, larger type
 *   and multi-column content where a screen has more than one thing to say.
 * - **Laptop and desktop** (1024px+): a persistent sidebar replaces the tab
 *   bar and the drawer entirely, and content spreads into real columns.
 *
 * There is no phone mockup on desktop — each breakpoint gets the layout that
 * suits it.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh bg-ink">
      <Sidebar />

      {/* The page column. `lg:h-dvh` lets each screen own its own scrolling
          next to a fixed sidebar, instead of the whole document scrolling. */}
      <div className="relative flex min-h-dvh w-full min-w-0 flex-1 flex-col lg:h-dvh lg:min-h-0">
        {children}
      </div>
    </div>
  );
}
