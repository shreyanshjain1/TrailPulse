import { NextResponse } from "next/server";
import { prisma } from "@/src/server/prisma";
import { requireUser } from "@/src/server/authz";
import { reviewCreateSchema } from "@/src/server/validators";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = reviewCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid review payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { trailId, rating, comment } = parsed.data;

  await prisma.review.create({
    data: {
      userId: user.id,
      trailId,
      rating,
      comment: comment?.trim() ? comment.trim() : null,
    },
  });

  return NextResponse.json({ ok: true });
}
