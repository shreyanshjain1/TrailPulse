"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Button } from "@/src/components/ui/button";
import { Bell, Bookmark, CalendarDays, LayoutDashboard, LogOut, UserCircle2 } from "lucide-react";

export function UserMenu({
  session,
  unreadCount = 0,
}: {
  session: Session | null;
  unreadCount?: number;
}) {
  if (!session?.user) {
    return (
      <Button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
        Sign in with Google
      </Button>
    );
  }

  const label = session.user.name ?? session.user.email ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
          {unreadCount > 0 ? (
            <span className="ml-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserCircle2 className="mr-2 h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/saved">
            <Bookmark className="mr-2 h-4 w-4" />
            Saved trails
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/plans">
            <CalendarDays className="mr-2 h-4 w-4" />
            Plans
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
            {unreadCount > 0 ? (
              <span className="ml-auto inline-flex min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
