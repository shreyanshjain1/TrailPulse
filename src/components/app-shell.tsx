"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { UserMenu } from "@/src/components/user-menu";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trails", label: "Trails" },
  { href: "/plans", label: "Plans" },
  { href: "/notifications", label: "Notifications" },
  { href: "/activity", label: "Activity" },
];

function cn(...arr: (string | false | undefined)[]) {
  return arr.filter(Boolean).join(" ");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">TrailPulse</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Hike • Plan • Sync</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        <div className="md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-3 pb-3">
            {nav.slice(0, 5).map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center rounded-2xl px-2 py-2 text-xs transition",
                    active
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
