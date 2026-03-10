import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/server/prisma";

const isProd = process.env.NODE_ENV === "production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // keep calendar scope if you use calendar events
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
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
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        if (!user?.passwordHash) return null;
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Ensure session.user.id exists everywhere
      if (session.user) {
        // @ts-expect-error - add id to session user
        session.user.id = user.id;
      }
      return session;
    },
  },
  cookies: {
    // Keep defaults; here just making sure secure cookies only in prod
  },
  debug: !isProd,
});