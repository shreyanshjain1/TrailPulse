"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { UserMenu } from "@/src/components/user-menu";

const nav = [
  { href: "/trails", label: "Trails" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notifications", label: "Notifications" },
  { href: "/activity", label: "Activity" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              TrailPulse
            </Link>

            <nav className="hidden md:flex items-center gap-4 text-sm">
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="border-t md:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3 overflow-x-auto px-4 py-2 text-sm">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "whitespace-nowrap rounded-full px-3 py-1 border " +
                    (active ? "bg-foreground text-background" : "text-muted-foreground")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}