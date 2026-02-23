import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/server/prisma";
import { requireUserOrThrow } from "@/src/server/http";
import { rateLimit } from "@/src/server/rateLimit";
import { audit } from "@/src/server/audit";

const createReviewSchema = z.object({
  trailId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const { ip, ua } = { ip: req.headers.get("x-forwarded-for") ?? null, ua: req.headers.get("user-agent") ?? null };
  const user = await requireUserOrThrow({ ip, ua });

  const rl = await rateLimit({
    key: `reviewCreate:${user.id}`,
    max: 8,
    windowSec: 60,
    userId: user.id,
    ip,
    ua,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = createReviewSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const trail = await prisma.trail.findUnique({ where: { id: parsed.data.trailId }, select: { id: true } });
  if (!trail) return NextResponse.json({ error: "Trail not found" }, { status: 404 });

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      trailId: parsed.data.trailId,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    action: "JOB_RUN", // keep schema simple; or add REVIEW_CREATE enum if you want
    target: review.id,
    meta: { trailId: parsed.data.trailId, rating: parsed.data.rating },
    ip,
    ua,
  });

  return NextResponse.json({ ok: true, reviewId: review.id });
}