import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";
import { AppShell } from "@/src/components/app-shell";

export const metadata: Metadata = {
  title: "TrailPulse",
  description: "Trail discovery + hike planning with Google Calendar integration."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
