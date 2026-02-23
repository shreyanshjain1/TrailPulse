import { NextResponse } from "next/server";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: 200, ...init });
}

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export function getIpUa(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  return { ip, ua };
}
