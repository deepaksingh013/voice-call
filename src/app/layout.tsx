import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { DrawerProvider } from "@/components/shell/Drawer";
import { AppShell } from "@/components/shell/AppShell";
import { CallProvider } from "@/lib/call";

export const metadata: Metadata = {
  title: "Voice-Only — Random Calling App",
  description:
    "Talk to a stranger. No account needed. Voice only, no video, no photos.",
};

export const viewport: Viewport = {
  themeColor: "#0f1113",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <CallProvider>
            <DrawerProvider>
              <AppShell>{children}</AppShell>
            </DrawerProvider>
          </CallProvider>
        </AppProvider>
      </body>
    </html>
  );
}
