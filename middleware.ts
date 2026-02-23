import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProd = process.env.NODE_ENV === "production";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Basic security headers
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(self), microphone=(), camera=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  // CSP starter: loosen in dev for Next.js eval
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' https: data:",
    "font-src 'self' https: data:",
    "style-src 'self' 'unsafe-inline' https:",
    isProd ? "script-src 'self' https:" : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:",
    "connect-src 'self' https:",
    "object-src 'none'"
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);

  // HSTS only in prod (requires HTTPS)
  if (isProd) {
    res.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
