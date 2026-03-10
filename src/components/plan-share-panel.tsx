"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function PlanSharePanel({
  planId,
  initialShareEnabled,
  initialShareToken,
  initialShareExpiresAt,
}: {
  planId: string;
  initialShareEnabled: boolean;
  initialShareToken: string | null;
  initialShareExpiresAt: string | null;
}) {
  const [shareEnabled, setShareEnabled] = useState(initialShareEnabled);
  const [token, setToken] = useState<string | null>(initialShareToken);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialShareExpiresAt);
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [loading, setLoading] = useState(false);

  const shareUrl = useMemo(() => {
    if (!token) return null;
    return `${window.location.origin}/p/${token}`;
  }, [token]);

  async function createLink() {
    setLoading(true);
    try {
      const res = await fetch("/api/plans/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, expiresInDays: days }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Failed to create share link");
        return;
      }
      setShareEnabled(true);
      setToken(json.token);
      setExpiresAt(json.expiresAt);
      toast.success("Share link created");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function revokeLink() {
    setLoading(true);
    try {
      const res = await fetch("/api/plans/share/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? "Failed to revoke");
        return;
      }
      setShareEnabled(false);
      setToken(null);
      setExpiresAt(null);
      toast.success("Share link revoked");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    const ok = await copyText(shareUrl);
    if (ok) toast.success("Link copied");
    else toast.error("Copy failed");
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Share</div>
          <div className="mt-1 text-lg font-semibold">Public read-only link</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Anyone with the link can view this plan without signing in. Great for demo links.
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{shareEnabled ? "Enabled" : "Disabled"}</div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium">Expiry</label>
          <select
            className="rounded-xl border bg-background px-3 py-2 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 1 | 7 | 30)}
            disabled={loading}
          >
            <option value={1}>1 day</option>
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
          </select>

          {!shareEnabled ? (
            <Button onClick={createLink} disabled={loading}>
              Create share link
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={copyLink} disabled={loading || !shareUrl}>
                Copy link
              </Button>
              <Button variant="outline" onClick={revokeLink} disabled={loading}>
                Revoke
              </Button>
            </>
          )}
        </div>

        {shareEnabled && shareUrl ? (
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Share URL</div>
            <div className="mt-1 break-all text-sm font-medium">{shareUrl}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Expires: {expiresAt ? new Date(expiresAt).toLocaleString() : "Never"}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
            Share link is currently disabled.
          </div>
        )}
      </div>
    </div>
  );
}