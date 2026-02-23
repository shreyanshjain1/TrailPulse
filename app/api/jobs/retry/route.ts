import { jsonError, jsonOk, getIpUa } from "@/src/server/http";
import { requireAdminOrThrow } from "@/src/server/authz";
import { jobsRetrySchema } from "@/src/server/validators";
import { rateLimit } from "@/src/server/rateLimit";
import { weatherSyncQueue, digestQueue } from "@/src/server/queues";
import { audit } from "@/src/server/audit";

export async function POST(req: Request) {
  const { ip, ua } = getIpUa(req);
  try {
    const user = await requireAdminOrThrow({ ip, ua });
    const rl = await rateLimit({ key: `jobsRetry:${user.id}`, max: 10, windowSec: 60, userId: user.id, ip, ua });
    if (!rl.ok) return jsonError("Too many requests", 429, { retryAfterSec: rl.retryAfterSec });

    const body = await req.json();
    const parsed = jobsRetrySchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid input", 400, parsed.error.flatten());

    const queue = parsed.data.queue === "weatherSync" ? weatherSyncQueue : digestQueue;
    const job = await queue.getJob(parsed.data.jobId);
    if (!job) return jsonError("Job not found", 404);

    await job.retry();
    await audit({ userId: user.id, action: "JOB_RUN", target: parsed.data.jobId, meta: { op: "retry", queue: parsed.data.queue }, ip, ua });

    return jsonOk({ retried: true });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return jsonError("Request failed", status);
  }
}
