import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/src/server/prisma";
import { sendMail, mailerReady } from "@/src/server/mailer";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#039;";
      default:
        return c;
    }
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = body?.email ? String(body.email).trim().toLowerCase() : "";
    const password = body?.password ? String(body.password) : "";
    const name = body?.name ? String(body.name).trim() : "";

    if (!name || name.length < 2) return json(400, { ok: false, error: "Name is required" });
    if (!email || !validEmail(email)) return json(400, { ok: false, error: "Invalid email" });
    if (!password || password.length < 8) return json(400, { ok: false, error: "Password must be at least 8 characters" });

    if (!mailerReady()) return json(500, { ok: false, error: "Email service not configured. Please set SMTP_* env vars." });

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return json(400, { ok: false, error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: { email, name, passwordHash, emailVerified: null },
    });

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    const token = crypto.randomBytes(24).toString("base64url");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

    await sendMail({
      to: email,
      subject: "Verify your TrailPulse account",
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45">
          <h2 style="margin:0 0 12px">Verify your email</h2>
          <p style="margin:0 0 10px">Hi ${escapeHtml(name)},</p>
          <p style="margin:0 0 14px">Click the button below to verify your TrailPulse account:</p>
          <p style="margin:0 0 18px">
            <a href="${verifyUrl}" style="display:inline-block;padding:10px 14px;background:#111;color:#fff;border-radius:10px;text-decoration:none">
              Verify Email
            </a>
          </p>
          <p style="color:#666;font-size:12px;margin:0">This link expires in 24 hours.</p>
        </div>
      `,
    });

    return json(200, { ok: true });
  } catch {
    return json(500, { ok: false, error: "Registration failed" });
  }
}