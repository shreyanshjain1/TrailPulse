"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { UserMenu } from "@/src/components/user-menu";
import { useSession } from "next-auth/react";
import { Bell, Bookmark, CalendarDays, Compass, LayoutDashboard, Activity } from "lucide-react";
import { PageTransition } from "@/src/components/page-transition";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
};

function cn(...arr: (string | undefined | false)[]) {
  return arr.filter(Boolean).join(" ");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [unread, setUnread] = useState<number>(0);

  const nav: NavItem[] = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: "/trails", label: "Trails", icon: <Compass className="h-4 w-4" /> },
      { href: "/saved", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
      { href: "/plans", label: "Plans", icon: <CalendarDays className="h-4 w-4" /> },
      { href: "/notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, badge: true },
      { href: "/activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
    ],
    []
  );

  async function refreshUnread() {
    try {
      const res = await fetch("/api/notifications/unread-count", { method: "GET" });
      const json = await res.json();
      if (res.ok && json?.ok) setUnread(Number(json.count ?? 0));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    // only fetch when logged in
    if (!session?.user) return;
    refreshUnread();
    const t = setInterval(refreshUnread, 20_000);
    return () => clearInterval(t);
  }, [session?.user]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">TrailPulse</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Hike • Plan • Sync</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  )}
                >
                  {item.icon}
                  {item.label}

                  {item.badge && unread > 0 ? (
                    <span className="ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu session={session ?? null} unreadCount={unread} />
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-5 gap-1 px-3 pb-3">
            {nav.slice(0, 5).map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs transition",
                    active
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  )}
                >
                  {item.icon}
                  <span className="text-[11px]">{item.label}</span>

                  {item.badge && unread > 0 ? (
                    <span className="absolute right-2 top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 py-0.5 text-[10px] font-semibold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}