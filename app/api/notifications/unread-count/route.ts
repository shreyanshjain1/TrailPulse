import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";

export async function GET() {
  try {
    const user = await requireUser();

    // ✅ If not logged in (or session not ready), do NOT throw — return 0
    if (!user) {
      return NextResponse.json({ ok: true, count: 0 }, { status: 200 });
    }

    const count = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({ ok: true, count }, { status: 200 });
  } catch {
    // ✅ Never break the UI polling
    return NextResponse.json({ ok: true, count: 0 }, { status: 200 });
  }
}