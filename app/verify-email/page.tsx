"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const email = sp.get("email") || "";

  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("Verifying…");

  const canRun = useMemo(() => Boolean(token && email), [token, email]);

  useEffect(() => {
    if (!canRun) {
      setStatus("err");
      setMsg("Invalid verification link.");
      return;
    }

    (async () => {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.ok) {
        setStatus("ok");
        setMsg("Email verified. You can sign in now.");
      } else {
        setStatus("err");
        setMsg(json?.error ?? "Verification failed.");
      }
    })();
  }, [canRun, token, email]);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <div className="rounded-2xl border bg-card p-6">
        <h1 className="text-xl font-semibold">Verify Email</h1>
        <p className="mt-2 text-sm text-muted-foreground">{msg}</p>

        <div className="mt-6 flex gap-2">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Go to Sign in
          </Link>
          {status === "err" ? (
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/50"
            >
              Sign up again
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}