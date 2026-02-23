import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/server/prisma";
import { env } from "@/src/env";
import { z } from "zod";
import { audit } from "@/src/server/audit";

const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // Google Calendar access; "offline" needed for refresh_token on first consent
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.events"
          ].join(" "),
          access_type: "offline",
          prompt: "consent"
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile, request }) {
      // Set role based on allowlist
      if (user?.email && adminEmails.has(user.email.toLowerCase())) {
        // updateMany never throws if record doesn't exist yet (first sign-in race)
        await prisma.user.updateMany({
          where: { email: user.email },
          data: { role: "ADMIN" },
        });
      }

      const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const ua = request?.headers.get("user-agent") ?? null;

      await audit({
        userId: user.id,
        userEmail: user.email,
        action: "SIGN_IN",
        ip,
        ua,
      });

      return true;
    },
    async session({ session, user }) {
      // Expose minimal safe fields
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/signin"
  },
  cookies: {
    // NextAuth v5 uses secure defaults. This ensures HttpOnly + sameSite by default.
  },
  trustHost: true
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "USER" | "ADMIN";
    };
  }
}
