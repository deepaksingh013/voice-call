"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { OfflineBanner } from "./OfflineBanner";

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
    // The shell is exactly one viewport tall at every breakpoint, and clips.
    // That is what makes each screen's own scroll container work: a flex
    // child can only scroll when its parent has a definite height. With a
    // `min-h` parent the column just grows to fit its content, the scroll
    // container ends up exactly as tall as what is inside it, and nothing
    // scrolls at all — which is how the header and tab bar used to push
    // content off the bottom of a phone with no way to reach it.
    <div className="relative flex h-dvh overflow-hidden bg-ink">
      <Sidebar />

      {/* The page column: fixed header, scrolling middle, fixed tab bar. */}
      <div className="relative flex h-full w-full min-w-0 flex-1 flex-col">
        <OfflineBanner />
        {children}
      </div>
    </div>
  );
}
