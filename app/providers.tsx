"use client";

import { SessionProvider } from "next-auth/react";
import { AppToaster } from "@/src/components/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <AppToaster />
    </SessionProvider>
  );
}
