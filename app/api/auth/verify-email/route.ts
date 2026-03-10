import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const token = body?.token ? String(body.token) : "";
    const email = body?.email ? String(body.email).trim().toLowerCase() : "";

    if (!token || !email) return json(400, { ok: false, error: "Missing token/email" });

    const vt = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!vt || vt.identifier !== email) return json(400, { ok: false, error: "Invalid verification link" });
    if (vt.expires.getTime() < Date.now()) return json(400, { ok: false, error: "Verification link expired" });

    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return json(200, { ok: true });
  } catch {
    return json(500, { ok: false, error: "Verification failed" });
  }
}