import Link from "next/link";
import { auth } from "@/src/auth";
import { prisma } from "@/src/server/prisma";
import { ThemeToggle } from "@/src/components/theme-toggle";
import { UserMenu } from "@/src/components/user-menu";
import { cn } from "@/src/lib/utils";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const unread = userId
    ? await prisma.notification.count({ where: { userId, isRead: false } })
    : 0;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              TrailPulse
            </Link>
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white" href="/trails">
                Trails
              </Link>
              <Link className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white" href="/dashboard">
                Dashboard
              </Link>
              <Link
                className={cn("text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white", unread ? "relative" : "")}
                href="/notifications"
              >
                Notifications
                {unread ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
              <Link className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white" href="/activity">
                Activity
              </Link>
              {session?.user?.role === "ADMIN" ? (
                <Link className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white" href="/jobs-admin">
                  Jobs Admin
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu session={session} />
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
