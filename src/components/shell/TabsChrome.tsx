import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { TabBar } from "./TabBar";

/**
 * The chrome shared by the four tab destinations plus call history: the
 * header with tier and online count, and the bottom tab bar.
 *
 * This is a component rather than a route-group layout on purpose. A
 * `(tabs)` group works in a production build but its routes drop out of the
 * dev route manifest after a hot recompile on Windows, which makes every
 * edit 404 until the server restarts.
 *
 * Call screens deliberately do not use this — nothing competes with a live
 * call.
 */
export function TabsChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      {children}
      <TabBar />
    </>
  );
}
