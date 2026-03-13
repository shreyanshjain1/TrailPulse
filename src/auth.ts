import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/server/prisma";
import { env } from "@/src/env";
import { audit } from "@/src/server/audit";

const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,

  // ✅ stable for Vercel + fixes “logged out but redirected” issues
  session: { strategy: "jwt" },

  pages: { signIn: "/signin" },

  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events"].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),

    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = creds?.email ? String(creds.email).trim().toLowerCase() : "";
        const password = creds?.password ? String(creds.password) : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, role: true, passwordHash: true, emailVerified: true },
        });

        if (!user?.passwordHash) return null;
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined, role: user.role };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, request }) {
      if (user?.email && adminEmails.has(user.email.toLowerCase())) {
        await prisma.user.updateMany({
          where: { email: user.email },
          data: { role: "ADMIN" },
        });
      }

      const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      const ua = request?.headers.get("user-agent") ?? null;

      await audit({
        userId: user.id,
        action: "SIGN_IN",
        ip,
        ua,
        target: null,
        meta: { provider: "auth" },
      });

      return true;
    },

    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      // role gets attached on session() from DB
      return token;
    },

    async session({ session, token }) {
      if (!session.user) return session;

      const userId = token.sub ? String(token.sub) : "";
      if (!userId) return session;

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      (session.user as any).id = userId;
      (session.user as any).role = dbUser?.role ?? "USER";
      return session;
    },
  },
});