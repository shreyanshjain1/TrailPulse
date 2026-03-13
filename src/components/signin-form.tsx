"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hint = useMemo(() => {
    if (!err) return null;
    if (err === "EMAIL_NOT_VERIFIED") return "Please verify your email first. Check your inbox.";
    return "Invalid email or password.";
  }, [err]);

  async function signInCredentials() {
    setErr(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password: pw,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (res?.error) {
        setErr(res.error);
        return;
      }
      if (res?.url) window.location.href = res.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <button
        className="w-full rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      >
        Continue with Google
      </button>

      <div className="my-2 text-center text-xs text-muted-foreground">or</div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Email</label>
        <input
          className="rounded-xl border bg-background px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Password</label>
        <input
          className="rounded-xl border bg-background px-3 py-2 text-sm"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          type="password"
        />
      </div>

      {hint ? <div className="rounded-xl border bg-rose-50 p-3 text-sm text-rose-900">{hint}</div> : null}

      <button
        className="w-full rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
        onClick={signInCredentials}
        disabled={loading}
      >
        {loading ? "Signing in…" : "Sign in with email"}
      </button>

      <div className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link className="underline" href="/signup">
          Create one
        </Link>
      </div>
    </div>
  );
}