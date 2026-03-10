"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: pw }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "Signup failed");
        return;
      }

      setMsg("Signup successful. Check your email to verify, then sign in.");
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign up with email (verification required) or Google.</p>

        <div className="mt-5 grid gap-3">
          <button
            className="w-full rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            Continue with Google
          </button>

          <div className="my-2 text-center text-xs text-muted-foreground">or</div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <input className="rounded-xl border bg-background px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Email</label>
            <input className="rounded-xl border bg-background px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Password</label>
            <input className="rounded-xl border bg-background px-3 py-2 text-sm" value={pw} onChange={(e) => setPw(e.target.value)} type="password" />
            <div className="text-xs text-muted-foreground">Min 8 characters.</div>
          </div>

          {msg ? <div className="rounded-xl border bg-muted/20 p-3 text-sm text-muted-foreground">{msg}</div> : null}

          <button
            className="w-full rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Creating…" : "Create account"}
          </button>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="underline" href="/signin">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}